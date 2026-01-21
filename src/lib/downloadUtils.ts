import JSZip from 'jszip'

export interface FileToDownload {
  url: string
  name: string
  folder?: string // Optional folder path within the ZIP
}

export async function downloadFilesAsZip(
  files: FileToDownload[],
  folderName: string = 'downloads'
): Promise<void> {
  if (!files || files.length === 0) {
    console.warn('No files to download')
    return
  }

  try {
    const zip = new JSZip()

    console.log(`Starting ZIP creation with ${files.length} file(s)...`)

    // Fetch all files and add them to the ZIP
    const fetchPromises = files.map(async (file, index) => {
      try {
        console.log(`Fetching file ${index + 1}/${files.length}: ${file.name}`)
        const response = await fetch(file.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0'
          }
        })

        if (!response.ok) {
          console.warn(`Failed to fetch ${file.name}: ${response.status}`)
          return null
        }

        const blob = await response.blob()
        console.log(`Downloaded ${file.name} (${(blob.size / 1024).toFixed(2)} KB)`)
        return { blob, name: file.name, folder: file.folder }
      } catch (error) {
        console.error(`Error fetching ${file.name}:`, error)
        return null
      }
    })

    const results = await Promise.all(fetchPromises)

    // Add successful downloads to ZIP with folder structure
    results.forEach((result) => {
      if (result) {
        const filePath = result.folder 
          ? `${result.folder}/${result.name}`
          : result.name
        zip.file(filePath, result.blob)
      }
    })

    console.log('Generating ZIP file...')
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    console.log(`ZIP created successfully (${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`)

    // Trigger download
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${folderName}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    console.log(`ZIP download triggered: ${folderName}.zip`)
  } catch (error) {
    console.error('Error creating ZIP file:', error)
    throw new Error('Failed to create ZIP file. Please try again.')
  }
}


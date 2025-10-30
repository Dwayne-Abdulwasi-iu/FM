import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string;
    transformation?: unknown;
  } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
    folder: options.folder || 'fashion-marketplace',
    resource_type: 'auto',
    // transformation may be unknown at this boundary; cast to any for the
    // cloudinary client which accepts various shapes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformation: options.transformation as any,
      },
      (error: unknown, result: unknown) => {
        if (error) {
          reject(error)
          return
        }

        // Coerce the result to the expected shape when available.
        if (result && typeof result === 'object') {
          resolve(result as UploadResult)
        } else {
          // Fail safe: resolve with a minimal empty object matching UploadResult
          resolve({
            public_id: '',
            secure_url: '',
            width: 0,
            height: 0,
            format: '',
            bytes: 0,
          })
        }
      }
    ).end(file);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function generateThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: 'fit',
    quality: 'auto',
    format: 'auto',
  });
}

export default cloudinary;
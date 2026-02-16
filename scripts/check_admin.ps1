$ports = @(3000,3001)
$max = 30
foreach ($port in $ports) {
  for ($i = 0; $i -lt $max; $i++) {
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:$port/admin" -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) {
        Write-Output "HTTP_${port}_OK"
        exit 0
      }
    } catch {
      # ignore
    }
    Start-Sleep -Seconds 1
  }
}
Write-Output 'HTTP_NOT_OK'
exit 1

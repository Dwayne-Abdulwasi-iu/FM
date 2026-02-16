$html=(Invoke-WebRequest -Uri 'http://localhost:3000/admin' -UseBasicParsing -TimeoutSec 10).Content
foreach ($line in ($html -split "`n")){
  if ($line -match '/admin/') { Write-Output $line.Trim() }
}

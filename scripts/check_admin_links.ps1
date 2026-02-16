$html=(Invoke-WebRequest -Uri 'http://localhost:3000/admin' -UseBasicParsing -TimeoutSec 10).Content
$paths=@('/admin/audit-logs','/admin/featured-items','/admin/warehouse-inventory','/admin/shipping','/admin/payments','/admin/security','/admin/seller-badges','/admin/subscriptions')
foreach($p in $paths){
  if($html -match [regex]::Escape($p)){
    Write-Output "$p:FOUND"
  } else {
    Write-Output "$p:NOT_FOUND"
  }
}

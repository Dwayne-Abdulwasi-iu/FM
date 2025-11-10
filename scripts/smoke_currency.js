(async ()=>{
  try{
  const mod = await import('../src/lib/currency.js')
  const res = await mod.getConversionRate('USD','NGN')
  console.log('USD->NGN rate:', res.rate, 'provider:', res.provider)
  console.log('applyRate(10, rate):', mod.applyRate(10, res.rate))
  }catch(err){
    console.error('smoke conversion failed:', err)
    process.exit(1)
  }
})();

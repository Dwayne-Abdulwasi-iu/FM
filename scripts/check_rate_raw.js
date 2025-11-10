(async ()=>{
  try{
    const url = 'https://api.exchangerate.host/convert?from=USD&to=NGN&amount=1'
    const res = await fetch(url)
    console.log('status', res.status)
    const text = await res.text()
    console.log('body:', text.slice(0, 2000))
  }catch(err){
    console.error('fetch failed', err)
    process.exit(1)
  }
})();

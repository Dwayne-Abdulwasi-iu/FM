async function test() {
  const response = await fetch('http://localhost:3000/api/boutique/products?limit=1')
  const data = await response.json()
  console.log('Status:', response.ok)
  console.log('Data keys:', Object.keys(data))
  console.log('First product:', JSON.stringify(data.products?.[0], null, 2))
}
test()

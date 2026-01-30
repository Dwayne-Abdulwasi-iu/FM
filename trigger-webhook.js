import http from 'http';

const data = JSON.stringify({
  reference: 'fashion_1769016549910_cmhg4iddx0000hej8nvdfzx4g',
  status: 'success'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/paystack',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();

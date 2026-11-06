const https = require('https');

https.get('https://resultiq.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('ResultIQ Status code:', res.statusCode);
    console.log('Contains ResultIQ:', data.includes('ResultIQ'));
    console.log('Contains Verified Portal:', data.includes('Verified Portal'));
    console.log('Contains Key Generator:', data.includes('Key Generator'));
    console.log('Title/Header snippet:', data.substring(0, 300).replace(/\s+/g, ' '));
  });
}).on('error', (e) => {
  console.error(e);
});

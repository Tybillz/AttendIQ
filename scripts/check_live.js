const https = require('https');

https.get('https://attendiq.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Contains Enter Classroom Workspace:', data.includes('Enter Classroom Workspace'));
    console.log('Contains Confidential Access:', data.includes('Confidential Access'));
    console.log('Contains Auto-Fill PIN:', data.includes('Auto-Fill PIN'));
    const chunks = data.match(/\/_next\/static\/[^"]+/g);
    console.log('Script chunks found:', chunks ? chunks.length : 0);
    if (chunks && chunks.length > 0) {
      console.log('First 3 chunks:', chunks.slice(0, 3));
    }
  });
}).on('error', (e) => {
  console.error(e);
});

const https = require('https');

const DEPLOY_HOOK = 'https://api.vercel.com/v1/integrations/deploy/prj_3DuKVYbL9suzyR0dQF109oLRVL7o/gRhhdSSxoX';

function triggerDeploy() {
  console.log('🚀 Triggering live Vercel production deployment at https://attendiq.vercel.app ...');
  const req = https.request(DEPLOY_HOOK, { method: 'POST' }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('✅ Deployment queued successfully on Vercel!');
        console.log('   Job ID:', json.job ? json.job.id : json);
        console.log('   Live URL: https://attendiq.vercel.app');
      } catch (e) {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Deploy hook error:', err.message);
  });

  req.end();
}

triggerDeploy();

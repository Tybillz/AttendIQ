const { execSync } = require('child_process');

try {
  console.log('Staging files...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing changes...');
  const msg = 'feat: move console navigation to left sidebar excluding key generator';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to attend-iq main...');
  execSync('git push attend-iq main', { stdio: 'inherit' });

  console.log('Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Triggering Vercel deployment hook...');
  require('./deploy.js');

  console.log('All deployed successfully!');
} catch (error) {
  console.error('Error in commit/push:', error.message);
  process.exit(1);
}


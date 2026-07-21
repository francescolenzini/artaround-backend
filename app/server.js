const { buildApp } = require('./src/app');
const env = require('./src/config/env');

async function start() {
  const app = await buildApp();

  app.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

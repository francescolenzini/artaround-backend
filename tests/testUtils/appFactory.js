const { startInMemoryMongo } = require('./mongoServer');

function purgeCache(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
}

async function buildTestApp() {
  await startInMemoryMongo();

  purgeCache('../../app/src/config/env');
  purgeCache('../../app/src/config/db');
  purgeCache('../../app/src/app');

  const { buildApp } = require('../../app/src/app');
  return buildApp();
}

module.exports = {
  buildTestApp,
};

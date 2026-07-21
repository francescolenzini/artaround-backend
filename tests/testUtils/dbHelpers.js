const mongoose = require('mongoose');

async function clearDatabase() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  clearDatabase,
  disconnectDatabase,
};

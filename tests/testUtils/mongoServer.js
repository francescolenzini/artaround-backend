const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function startInMemoryMongo() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }

  process.env.MONGO_URI = mongoServer.getUri('artaround_test');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.SWAGGER_USER = process.env.SWAGGER_USER || 'swagger';
  process.env.SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD || 'swagger';
}

async function stopInMemoryMongo() {
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

module.exports = {
  startInMemoryMongo,
  stopInMemoryMongo,
};

const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  mongoUri:
    process.env.MONGO_URI ||
    'mongodb://artaround:artaround@localhost:27017/artaround?authSource=admin',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  swaggerUser: process.env.SWAGGER_USER || 'swagger',
  swaggerPassword: process.env.SWAGGER_PASSWORD || 'swagger',
};

const cors = require('cors');
const express = require('express');
const swaggerUi = require('swagger-ui-express');

const { connectDb } = require('./config/db');
const { protectSwagger } = require('./middleware/basicAuthDocs');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { openapi } = require('./docs/openapi');

const authRoutes = require('./routes/authRoutes');
const museumsRoutes = require('./routes/museumsRoutes');
const artworksRoutes = require('./routes/artworksRoutes');
const artworkItemsRoutes = require('./routes/artworkItemsRoutes');
const visitsRoutes = require('./routes/visitsRoutes');
const activitiesRoutes = require('./routes/activitiesRoutes');
const usersRoutes = require('./routes/usersRoutes');
const apiKeysRoutes = require('./routes/apiKeysRoutes');
const requestLogsRoutes = require('./routes/requestLogsRoutes');
const uploadsRoutes = require('./routes/uploadsRoutes');

async function buildApp() {
  await connectDb();

  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use(cors());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/docs/openapi.json', protectSwagger, (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="artaround-openapi.json"');
    res.status(200).send(JSON.stringify(openapi, null, 2));
  });

  app.use('/docs', protectSwagger, swaggerUi.serve, swaggerUi.setup(openapi));
  app.get('/docs-json', protectSwagger, (_req, res) => {
    res.status(200).json(openapi);
  });

  app.use('/auth', authRoutes);
  app.use('/museums', museumsRoutes);
  app.use('/artworks', artworksRoutes);
  app.use('/artwork-items', artworkItemsRoutes);
  app.use('/visits', visitsRoutes);
  app.use('/activities', activitiesRoutes);
  app.use('/users', usersRoutes);
  app.use('/api-keys', apiKeysRoutes);
  app.use('/request-logs', requestLogsRoutes);
  app.use('/uploads', uploadsRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { buildApp };

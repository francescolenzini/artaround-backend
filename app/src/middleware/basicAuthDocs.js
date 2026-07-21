const basicAuth = require('basic-auth');
const env = require('../config/env');

function protectSwagger(req, res, next) {
  const credentials = basicAuth(req);

  if (!credentials || credentials.name !== env.swaggerUser || credentials.pass !== env.swaggerPassword) {
    res.set('WWW-Authenticate', 'Basic realm="Swagger Docs"');
    return res.status(401).send('Authentication required');
  }

  return next();
}

module.exports = { protectSwagger };

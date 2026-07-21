const jwt = require('jsonwebtoken');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const env = require('../config/env');

async function resolveApiKey(value) {
  if (!value) {
    return null;
  }

  const hash = ApiKey.hashValue(value);
  const apiKey = await ApiKey.findOne({ keyHash: hash, status: 'active' }).lean();
  return apiKey || null;
}

async function resolveUserFromBearerHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, invalidToken: false };
  }

  const token = authHeader.slice('Bearer '.length);
  let payload;

  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    return { user: null, invalidToken: true };
  }

  const user = await User.findOne({ id: payload.sub, status: 'active' }).lean();
  return { user: user || null, invalidToken: false };
}

async function requireApiKey(req, res, next) {
  const value = req.header('x-api-key');
  if (!value) {
    return res.status(401).json({ error: { message: 'Missing API key', status: 401 } });
  }

  const apiKey = await resolveApiKey(value);

  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Invalid API key', status: 401 } });
  }

  req.apiKey = {
    id: String(apiKey._id),
    prefix: apiKey.prefix,
    name: apiKey.name,
  };

  await ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } });
  return next();
}

async function requireJwt(req, res, next) {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing Bearer token', status: 401 } });
  }

  const { user, invalidToken } = await resolveUserFromBearerHeader(authHeader);
  if (invalidToken) {
    return res.status(401).json({ error: { message: 'Invalid token', status: 401 } });
  }

  if (!user) {
    return res.status(401).json({ error: { message: 'User not found or not active', status: 401 } });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    assignedMuseumIds: user.assignedMuseumIds || [],
  };

  return next();
}

async function requireApiKeyAndJwt(req, res, next) {
  const apiKeyValue = req.header('x-api-key');
  if (!apiKeyValue) {
    return res.status(401).json({ error: { message: 'Missing API key', status: 401 } });
  }

  const apiKey = await resolveApiKey(apiKeyValue);
  if (!apiKey) {
    return res.status(401).json({ error: { message: 'Invalid API key', status: 401 } });
  }

  req.apiKey = {
    id: String(apiKey._id),
    prefix: apiKey.prefix,
    name: apiKey.name,
  };

  await ApiKey.updateOne({ _id: apiKey._id }, { $set: { lastUsedAt: new Date() } });

  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'Missing Bearer token', status: 401 } });
  }

  const { user, invalidToken } = await resolveUserFromBearerHeader(authHeader);
  if (invalidToken) {
    return res.status(401).json({ error: { message: 'Invalid token', status: 401 } });
  }

  if (!user) {
    return res.status(401).json({ error: { message: 'User not found or not active', status: 401 } });
  }

  req.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    assignedMuseumIds: user.assignedMuseumIds || [],
  };

  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }
    return next();
  };
}

// Ruoli abilitati a creare/modificare contenuti. Unico punto di verità: il
// `visitor` è di sola lettura (fruisce col Navigator), quindi è escluso dalle
// scritture su musei/opere/item/visite.
const requireContentEditor = requireRole('super_admin', 'author');

module.exports = {
  requireApiKey,
  requireJwt,
  requireApiKeyAndJwt,
  requireRole,
  requireContentEditor,
};

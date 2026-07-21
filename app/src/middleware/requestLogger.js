const crypto = require('crypto');
const RequestLog = require('../models/RequestLog');
const { sanitizeOutput } = require('../services/maskSensitive');

// Il logging non deve MAI far fallire la richiesta: se la sanitizzazione del
// payload va in errore (es. documenti Mongoose idratati con riferimenti
// circolari), si registra un segnaposto invece di propagare l'eccezione.
function safeSanitize(value) {
  try {
    return sanitizeOutput(value);
  } catch (error) {
    return { type: 'unloggable', info: `sanitize failed: ${error.message}` };
  }
}

function requestLogger(req, res, next) {
  const startDate = new Date();
  const start = process.hrtime.bigint();
  const correlationId = req.header('x-correlation-id') || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const requestPayload = safeSanitize(req.body);

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body) => {
    res.locals.responsePayload = safeSanitize(body);
    return originalJson(body);
  };

  res.send = (body) => {
    if (Buffer.isBuffer(body)) {
      res.locals.responsePayload = {
        type: 'buffer',
        length: body.length,
      };
    } else {
      res.locals.responsePayload = safeSanitize(body);
    }
    return originalSend(body);
  };

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - start;
    const elapsedMs = Number(elapsedNs / BigInt(1000000));

    const responsePayload =
      res.locals.responsePayload || {
        type: 'stream-or-empty',
        info: 'response body not captured (possibly stream or empty payload)',
      };

    RequestLog.create({
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      userId: req.user ? req.user.id : undefined,
      username: req.user ? req.user.username : undefined,
      apiKeyPrefix: req.apiKey ? req.apiKey.prefix : undefined,
      tenantScope: req.user ? req.user.assignedMuseumIds : [],
      requestCreatedAt: startDate,
      requestCompletedAt: new Date(),
      totalTimeMs: elapsedMs,
      requestPayload,
      responsePayload,
      ip: req.ip,
      userAgent: req.header('user-agent'),
      correlationId,
    }).catch((error) => {
      console.error('Failed to persist request log:', error.message);
    });
  });

  next();
}

module.exports = { requestLogger };

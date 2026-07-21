const SENSITIVE_KEYS = ['password', 'passwordhash', 'token', 'authorization', 'apikey', 'x-api-key'];

function isStreamLike(value) {
  return value && typeof value === 'object' && typeof value.pipe === 'function';
}

function sanitizeOutput(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return {
      type: 'buffer',
      length: value.length,
    };
  }

  if (isStreamLike(value)) {
    return {
      type: 'stream',
      info: 'streamed-response',
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeOutput(item));
  }

  if (typeof value === 'object') {
    const result = {};
    for (const [key, current] of Object.entries(value)) {
      if (SENSITIVE_KEYS.includes(String(key).toLowerCase())) {
        result[key] = 'masked-data';
      } else {
        result[key] = sanitizeOutput(current);
      }
    }
    return result;
  }

  return value;
}

module.exports = {
  sanitizeOutput,
};

function generateEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

module.exports = { generateEntityId };

const bcrypt = require('bcryptjs');

const ApiKey = require('../../app/src/models/ApiKey');
const User = require('../../app/src/models/User');

async function createApiKey({ name = 'Test Key' } = {}) {
  const rawKey = `ak_test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const prefix = rawKey.slice(0, 12);

  await ApiKey.create({
    name,
    prefix,
    keyHash: ApiKey.hashValue(rawKey),
    status: 'active',
  });

  return rawKey;
}

async function createUser({
  id = 'usr-test-1',
  fullName = 'Test User',
  email = 'test.user@example.com',
  username = 'testuser',
  password = 'Password123!',
  role = 'super_admin',
  status = 'active',
  assignedMuseumIds = [],
  notes,
} = {}) {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    id,
    fullName,
    email,
    username,
    passwordHash,
    role,
    status,
    assignedMuseumIds,
    notes,
  });

  return { user, password };
}

module.exports = {
  createApiKey,
  createUser,
};

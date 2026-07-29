const express = require('express');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { requireApiKeyAndJwt, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();
const USER_STATUSES = new Set(['active', 'suspended', 'archived']);
const ADMIN_PATCHABLE_FIELDS = new Set(['fullName', 'email', 'username', 'password', 'role', 'status', 'assignedMuseumIds', 'notes']);
const SELF_PATCHABLE_FIELDS = new Set(['fullName', 'email', 'username', 'password', 'notes']);

function hasInvalidStatus(payload) {
  return Object.prototype.hasOwnProperty.call(payload, 'status') && !USER_STATUSES.has(payload.status);
}

function normalizeUsername(payload, { required = false } = {}) {
  if (!Object.prototype.hasOwnProperty.call(payload, 'username')) {
    return required ? 'username is required' : null;
  }

  if (typeof payload.username !== 'string' || !payload.username.trim()) {
    return 'username cannot be empty';
  }

  payload.username = payload.username.trim();
  return null;
}

function unsupportedPatchFields(payload, allowedFields) {
  return Object.keys(payload).filter((field) => !allowedFields.has(field));
}

async function usernameIsTaken(username, userId) {
  const filter = { username };
  if (userId) filter.id = { $ne: userId };
  return Boolean(await User.exists(filter));
}

async function emailIsTaken(email, userId) {
  const filter = { email };
  if (userId) filter.id = { $ne: userId };
  return Boolean(await User.exists(filter));
}

router.use(requireApiKeyAndJwt);

router.get(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const result = await paginateQuery({
      model: User,
      req,
      baseFilter: {},
      allowedSortFields: ['id', 'fullName', 'email', 'username', 'role', 'status', 'lastLogin', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'fullName', 'email', 'username', 'role', 'status', 'notes'],
      allowedFilterFields: ['id', 'email', 'username', 'role', 'status'],
      select: '-passwordHash -avatar',
    });

    return res.status(200).json(result);
  })
);

router.post(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const payload = { ...(req.body || {}) };
    // Campo rimosso dal modello: ignoralo anche se arriva da un vecchio client.
    delete payload.avatar;

    const usernameError = normalizeUsername(payload, { required: true });
    if (usernameError) {
      return res.status(400).json({ error: { message: usernameError, status: 400 } });
    }

    if (hasInvalidStatus(payload)) {
      return res.status(400).json({ error: { message: 'status must be active, suspended, or archived', status: 400 } });
    }

    if (!payload.password) {
      return res.status(400).json({ error: { message: 'password is required', status: 400 } });
    }

    if (await usernameIsTaken(payload.username)) {
      return res.status(409).json({ error: { message: 'username already exists', status: 409 } });
    }
    if (payload.email && (await emailIsTaken(payload.email))) {
      return res.status(409).json({ error: { message: 'email already exists', status: 409 } });
    }

    const user = await User.create({
      ...payload,
      id: payload.id || generateEntityId('usr'),
      passwordHash: await bcrypt.hash(payload.password, 10),
    });

    const sanitized = user.toObject();
    delete sanitized.passwordHash;
    delete sanitized.avatar;
    return res.status(201).json(sanitized);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const target = await User.findOne({ id: req.params.id });

    if (!target) {
      return res.status(404).json({ error: { message: 'User not found', status: 404 } });
    }

    if (req.user.role !== 'super_admin' && req.user.id !== target.id) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    const payload = { ...(req.body || {}) };
    // Campo rimosso dal modello: ignoralo anche se arriva da un vecchio client.
    delete payload.avatar;

    const allowedFields = req.user.role === 'super_admin' ? ADMIN_PATCHABLE_FIELDS : SELF_PATCHABLE_FIELDS;
    const unsupportedFields = unsupportedPatchFields(payload, allowedFields);
    if (unsupportedFields.length) {
      return res.status(400).json({ error: { message: `unsupported patch fields: ${unsupportedFields.join(', ')}`, status: 400 } });
    }

    const usernameError = normalizeUsername(payload);
    if (usernameError) {
      return res.status(400).json({ error: { message: usernameError, status: 400 } });
    }

    if (hasInvalidStatus(payload)) {
      return res.status(400).json({ error: { message: 'status must be active, suspended, or archived', status: 400 } });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'username') && (await usernameIsTaken(payload.username, target.id))) {
      return res.status(409).json({ error: { message: 'username already exists', status: 409 } });
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'email') && (await emailIsTaken(payload.email, target.id))) {
      return res.status(409).json({ error: { message: 'email already exists', status: 409 } });
    }

    if (payload.password) {
      target.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const patch = { ...payload };
    delete patch.password;
    Object.assign(target, patch);
    try {
      await target.save();
    } catch (error) {
      if (error?.code === 11000 && error.keyPattern?.username) {
        return res.status(409).json({ error: { message: 'username already exists', status: 409 } });
      }
      if (error?.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ error: { message: 'email already exists', status: 409 } });
      }
      throw error;
    }

    const sanitized = target.toObject();
    delete sanitized.passwordHash;
    delete sanitized.avatar;
    return res.status(200).json(sanitized);
  })
);

module.exports = router;

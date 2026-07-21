const express = require('express');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { requireApiKeyAndJwt, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();

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
      select: '-passwordHash',
    });

    return res.status(200).json(result);
  })
);

router.post(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req, res) => {
    const payload = req.body || {};

    if (!payload.password) {
      return res.status(400).json({ error: { message: 'password is required', status: 400 } });
    }

    const user = await User.create({
      ...payload,
      id: payload.id || generateEntityId('usr'),
      passwordHash: await bcrypt.hash(payload.password, 10),
    });

    const sanitized = user.toObject();
    delete sanitized.passwordHash;
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

    if (req.body.password) {
      target.passwordHash = await bcrypt.hash(req.body.password, 10);
    }

    const patch = { ...req.body };
    delete patch.password;
    Object.assign(target, patch);
    await target.save();

    const sanitized = target.toObject();
    delete sanitized.passwordHash;
    return res.status(200).json(sanitized);
  })
);

module.exports = router;

const crypto = require('crypto');
const express = require('express');

const ApiKey = require('../models/ApiKey');
const { requireApiKeyAndJwt, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();

router.use(requireApiKeyAndJwt);
router.use(requireRole('super_admin'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await paginateQuery({
      model: ApiKey,
      req,
      baseFilter: {},
      allowedSortFields: ['name', 'prefix', 'status', 'createdByUserId', 'disabledByUserId', 'lastUsedAt', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['name', 'prefix', 'status', 'createdByUserId', 'disabledByUserId'],
      allowedFilterFields: ['name', 'prefix', 'status', 'createdByUserId', 'disabledByUserId'],
      select: '-keyHash',
    });

    return res.status(200).json(result);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = req.body && req.body.name ? req.body.name : 'generated-key';
    const raw = crypto.randomBytes(32).toString('hex');
    const prefix = raw.slice(0, 8);

    const apiKey = await ApiKey.create({
      name,
      prefix,
      keyHash: ApiKey.hashValue(raw),
      createdByUserId: req.user.id,
    });

    return res.status(201).json({
      id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      status: apiKey.status,
      apiKey: raw,
      warning: 'Store this API key now. It will never be returned again.',
    });
  })
);

router.post(
  '/:prefix/disable',
  asyncHandler(async (req, res) => {
    const key = await ApiKey.findOne({ prefix: req.params.prefix });
    if (!key) {
      return res.status(404).json({ error: { message: 'API key not found', status: 404 } });
    }

    key.status = 'disabled';
    key.disabledAt = new Date();
    key.disabledByUserId = req.user.id;
    await key.save();

    return res.status(200).json({ message: 'API key disabled', prefix: key.prefix });
  })
);

module.exports = router;

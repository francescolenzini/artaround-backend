const express = require('express');

const Activity = require('../models/Activity');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();

router.use(requireApiKeyAndJwt);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role !== 'super_admin') {
      filter.$or = [{ museumId: { $in: req.user.assignedMuseumIds || [] } }, { museumId: { $exists: false } }];
    }

    const result = await paginateQuery({
      model: Activity,
      req,
      baseFilter: filter,
      allowedSortFields: ['id', 'userId', 'action', 'entityType', 'entityId', 'museumId', 'timestamp', 'createdAt'],
      defaultSortBy: 'timestamp',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'userId', 'action', 'entityType', 'entityId', 'entityName', 'museumId', 'details'],
    });

    return res.status(200).json(result);
  })
);

router.post(
  '/',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};

    if (payload.museumId && !canAccessMuseum(req.user, payload.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    const activity = await Activity.create({
      ...payload,
      id: payload.id || generateEntityId('act'),
      userId: payload.userId || req.user.id,
      timestamp: payload.timestamp || new Date(),
    });

    return res.status(201).json(activity);
  })
);

module.exports = router;

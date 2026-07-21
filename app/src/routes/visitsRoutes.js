const express = require('express');

const Visit = require('../models/Visit');
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
      filter.museumId = { $in: req.user.assignedMuseumIds || [] };
    }

    const result = await paginateQuery({
      model: Visit,
      req,
      baseFilter: filter,
      allowedSortFields: ['id', 'museumId', 'title', 'status', 'estimatedDurationMinutes', 'authorId', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'museumId', 'title', 'subtitle', 'description', 'targetAudience', 'authorId'],
    });

    return res.status(200).json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const visit = await Visit.findOne({ id: req.params.id });

    if (!visit) {
      return res.status(404).json({ error: { message: 'Visit not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, visit.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    return res.status(200).json(visit);
  })
);

router.post(
  '/',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};

    if (!payload.museumId || !canAccessMuseum(req.user, payload.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden museum scope', status: 403 } });
    }

    const visit = await Visit.create({
      ...payload,
      id: payload.id || generateEntityId('vis'),
      authorId: payload.authorId || req.user.id,
    });

    return res.status(201).json(visit);
  })
);

router.put(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const visit = await Visit.findOne({ id: req.params.id });

    if (!visit) {
      return res.status(404).json({ error: { message: 'Visit not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, visit.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    Object.assign(visit, req.body || {});
    await visit.save();

    return res.status(200).json(visit);
  })
);

router.delete(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const visit = await Visit.findOne({ id: req.params.id });

    if (!visit) {
      return res.status(404).json({ error: { message: 'Visit not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, visit.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    await visit.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

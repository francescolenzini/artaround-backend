const express = require('express');

const Museum = require('../models/Museum');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum, scopedMuseumFilter } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');
const { attachCounts } = require('../services/museumStats');

const router = express.Router();

router.use(requireApiKeyAndJwt);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await paginateQuery({
      model: Museum,
      req,
      baseFilter: scopedMuseumFilter(req.user),
      allowedSortFields: ['id', 'name', 'shortName', 'status', 'city', 'country', 'createdAt', 'updatedAt'],
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
      searchableFields: ['name', 'shortName', 'slug', 'city', 'country'],
      ignoreFilterFields: ['museumId'],
    });

    await attachCounts(result.data);

    return res.status(200).json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const museum = await Museum.findOne({ id: req.params.id }).lean();

    if (!museum) {
      return res.status(404).json({ error: { message: 'Museum not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, museum.id)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    await attachCounts(museum);

    return res.status(200).json(museum);
  })
);

router.post(
  '/',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const museumId = payload.id || generateEntityId('mus');

    if (req.user.role !== 'super_admin' && !canAccessMuseum(req.user, museumId)) {
      return res.status(403).json({ error: { message: 'Author cannot create outside allowed museums', status: 403 } });
    }

    const museum = await Museum.create({
      ...payload,
      id: museumId,
      assignedCuratorIds: payload.assignedCuratorIds || [],
    });

    return res.status(201).json(museum);
  })
);

router.put(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const museum = await Museum.findOne({ id: req.params.id });

    if (!museum) {
      return res.status(404).json({ error: { message: 'Museum not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, museum.id)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    Object.assign(museum, req.body || {});
    await museum.save();

    return res.status(200).json(museum);
  })
);

router.delete(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const museum = await Museum.findOne({ id: req.params.id });

    if (!museum) {
      return res.status(404).json({ error: { message: 'Museum not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, museum.id)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    await museum.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

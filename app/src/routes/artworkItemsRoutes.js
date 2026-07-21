const express = require('express');

const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
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
    const baseFilter = {};

    if (req.user.role !== 'super_admin') {
      const scopedMuseumIds = req.user.assignedMuseumIds || [];
      const museumConstraint = req.query.museumId
        ? { $in: scopedMuseumIds.filter((museumId) => museumId === req.query.museumId) }
        : { $in: scopedMuseumIds };

      const artworks = await Artwork.find({ museumId: museumConstraint }).select('id').lean();
      baseFilter.artworkId = { $in: artworks.map((artwork) => artwork.id) };
    } else if (req.query.museumId) {
      const artworks = await Artwork.find({ museumId: req.query.museumId }).select('id').lean();
      baseFilter.artworkId = { $in: artworks.map((artwork) => artwork.id) };
    }

    const result = await paginateQuery({
      model: ArtworkItem,
      req,
      baseFilter,
      allowedSortFields: ['id', 'artworkId', 'status', 'isFree', 'creatorId', 'lastUpdaterId', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'artworkId', 'license', 'creatorId', 'lastUpdaterId', 'content.title', 'content.screenText', 'content.ttsText'],
      ignoreFilterFields: ['museumId'],
    });

    return res.status(200).json(result);
  })
);

router.post(
  '/',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const artwork = await Artwork.findOne({ id: payload.artworkId }).lean();

    if (!artwork || !canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    const item = await ArtworkItem.create({
      ...payload,
      id: payload.id || generateEntityId('i'),
      creatorId: payload.creatorId || req.user.id,
      lastUpdaterId: req.user.id,
    });

    return res.status(201).json(item);
  })
);

router.put(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const item = await ArtworkItem.findOne({ id: req.params.id });

    if (!item) {
      return res.status(404).json({ error: { message: 'Artwork item not found', status: 404 } });
    }

    const artwork = await Artwork.findOne({ id: item.artworkId }).lean();
    if (!artwork || !canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    Object.assign(item, req.body || {}, { lastUpdaterId: req.user.id });
    await item.save();

    return res.status(200).json(item);
  })
);

router.delete(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const item = await ArtworkItem.findOne({ id: req.params.id });

    if (!item) {
      return res.status(404).json({ error: { message: 'Artwork item not found', status: 404 } });
    }

    const artwork = await Artwork.findOne({ id: item.artworkId }).lean();
    if (!artwork || !canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    await item.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

const express = require('express');

const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery, escapeRegex } = require('../services/pagination');

const router = express.Router();

router.use(requireApiKeyAndJwt);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role !== 'super_admin') {
      filter.museumId = { $in: req.user.assignedMuseumIds || [] };
    }

    // La ricerca copre anche i campi testuali degli item: risolviamo prima gli
    // artworkId degli item corrispondenti (solo id, via distinct), così la
    // query paginata resta una sola anche con migliaia di contenuti.
    const qRaw = req.query.q || req.query.queryString || req.query.search;
    const q = typeof qRaw === 'string' ? qRaw.trim() : '';
    const extraSearchConditions = [];
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: 'i' };
      const matchedArtworkIds = await ArtworkItem.distinct('artworkId', {
        $or: [{ 'content.title': rx }, { 'content.screenText': rx }, { 'content.ttsText': rx }, { license: rx }],
      });
      if (matchedArtworkIds.length) {
        extraSearchConditions.push({ id: { $in: matchedArtworkIds } });
      }
    }

    const result = await paginateQuery({
      model: Artwork,
      req,
      baseFilter: filter,
      allowedSortFields: ['id', 'museumId', 'title', 'artist', 'category', 'style', 'status', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'museumId', 'title', 'artist', 'category', 'style', 'description', 'universalObjectId'],
      extraSearchConditions,
    });

    return res.status(200).json(result);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const artwork = await Artwork.findOne({ id: req.params.id });
    if (!artwork) {
      return res.status(404).json({ error: { message: 'Artwork not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    return res.status(200).json(artwork);
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

    const artwork = await Artwork.create({
      ...payload,
      id: payload.id || generateEntityId('art'),
    });

    return res.status(201).json(artwork);
  })
);

router.put(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const artwork = await Artwork.findOne({ id: req.params.id });

    if (!artwork) {
      return res.status(404).json({ error: { message: 'Artwork not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    Object.assign(artwork, req.body || {});
    await artwork.save();

    return res.status(200).json(artwork);
  })
);

router.delete(
  '/:id',
  requireContentEditor,
  asyncHandler(async (req, res) => {
    const artwork = await Artwork.findOne({ id: req.params.id });

    if (!artwork) {
      return res.status(404).json({ error: { message: 'Artwork not found', status: 404 } });
    }

    if (!canAccessMuseum(req.user, artwork.museumId)) {
      return res.status(403).json({ error: { message: 'Forbidden', status: 403 } });
    }

    await artwork.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

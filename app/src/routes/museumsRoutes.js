const express = require('express');

const Museum = require('../models/Museum');
const Artwork = require('../models/Artwork');
const Visit = require('../models/Visit');
const User = require('../models/User');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum, scopedMuseumFilter } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');
const { attachCounts } = require('../services/museumStats');

const router = express.Router();

router.use(requireApiKeyAndJwt);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function normalizeLanguage(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    badRequest(`${fieldName} must be a non-empty string`);
  }
  return value.trim().toLowerCase();
}

function normalizeMuseumPayload(input, currentMuseum = null) {
  const payload = { ...input };

  if (!currentMuseum && payload.defaultLanguage === undefined) {
    badRequest('defaultLanguage is required');
  }

  const defaultLanguage =
    payload.defaultLanguage === undefined
      ? normalizeLanguage(currentMuseum?.defaultLanguage, 'defaultLanguage')
      : normalizeLanguage(payload.defaultLanguage, 'defaultLanguage');

  if (payload.defaultLanguage !== undefined) {
    payload.defaultLanguage = defaultLanguage;
  }

  if (payload.supportedLanguages === undefined) {
    if (!currentMuseum) {
      payload.supportedLanguages = [defaultLanguage];
    } else if (payload.defaultLanguage !== undefined) {
      payload.supportedLanguages = [
        ...new Set([
          ...(currentMuseum.supportedLanguages || []).map((code) =>
            normalizeLanguage(code, 'supportedLanguages')
          ),
          defaultLanguage,
        ]),
      ];
    }
  } else {
    if (!Array.isArray(payload.supportedLanguages)) {
      badRequest('supportedLanguages must be an array of non-empty strings');
    }
    payload.supportedLanguages = [
      ...new Set(payload.supportedLanguages.map((code) => normalizeLanguage(code, 'supportedLanguages'))),
    ];
    if (!payload.supportedLanguages.includes(defaultLanguage)) {
      badRequest('defaultLanguage must be included in supportedLanguages');
    }
  }

  if (!currentMuseum && payload.logistics === undefined) {
    badRequest('logistics.exit is required');
  }
  if (payload.logistics !== undefined) {
    if (!payload.logistics || typeof payload.logistics !== 'object' || Array.isArray(payload.logistics)) {
      badRequest('logistics must be an object');
    }
    const exit = payload.logistics.exit;
    if (typeof exit !== 'string' || !exit.trim()) {
      badRequest('logistics.exit is required and must be non-empty');
    }
    payload.logistics = { exit: exit.trim() };
    for (const key of ['toilet', 'bar', 'shop', 'obstacles']) {
      const value = input.logistics[key];
      if (value !== undefined) {
        if (typeof value !== 'string') badRequest(`logistics.${key} must be a string`);
        const normalized = value.trim();
        if (normalized) payload.logistics[key] = normalized;
      }
    }
  }

  return payload;
}

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
      allowedFilterFields: ['id', 'name', 'shortName', 'slug', 'status', 'city', 'country'],
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
    const payload = normalizeMuseumPayload(req.body || {});
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

    Object.assign(museum, normalizeMuseumPayload(req.body || {}, museum));
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

    const [artworkCount, visitCount, assignedUserCount] = await Promise.all([
      Artwork.countDocuments({ museumId: museum.id }),
      Visit.countDocuments({ museumId: museum.id }),
      User.countDocuments({ assignedMuseumIds: museum.id }),
    ]);
    if (artworkCount || visitCount || assignedUserCount) {
      return res.status(409).json({
        error: { message: 'Cannot delete museum while artworks, visits, or user assignments reference it', status: 409 },
      });
    }
    await museum.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

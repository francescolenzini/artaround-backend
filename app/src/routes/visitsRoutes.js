const express = require('express');

const Visit = require('../models/Visit');
const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();

router.use(requireApiKeyAndJwt);

const ITEM_STEP_TYPES = new Set(['main_item', 'optional_item']);

function isItemStep(step) {
  return ITEM_STEP_TYPES.has(step.type);
}

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function validateSteps(steps, museumId) {
  if (!Array.isArray(steps)) throw badRequest('steps must be an array');
  if (steps.some((step) => Object.prototype.hasOwnProperty.call(step, 'mapCoords'))) {
    throw badRequest('mapCoords is deprecated: set the artwork location instead');
  }

  for (const step of steps) {
    if (!isItemStep(step)) {
      if (step.artworkId || (step.itemIds && step.itemIds.length)) {
        throw badRequest('Only artwork steps can contain artworkId or itemIds');
      }
      continue;
    }

    const itemIds = step.itemIds || [];
    if (!step.artworkId || !itemIds.length) {
      throw badRequest('Artwork steps require artworkId and at least one itemId');
    }
    if (new Set(itemIds).size !== itemIds.length) {
      throw badRequest('Artwork steps cannot contain duplicate itemIds');
    }

    const artwork = await Artwork.findOne({ id: step.artworkId, museumId }).select('id location').lean();
    if (!artwork) throw badRequest('Artwork step references an artwork outside this museum');
    if (!artwork.location) throw badRequest('Artwork steps require an artwork with a complete location');

    const items = await ArtworkItem.find({ id: { $in: itemIds }, artworkId: artwork.id })
      .select('id classification.languageRegister classification.fruitionLength')
      .lean();
    if (items.length !== itemIds.length) {
      throw badRequest('Every itemId in an artwork step must belong to its artwork');
    }

    const occupiedVariants = new Set();
    for (const item of items) {
      const register = item.classification?.languageRegister;
      const duration = item.classification?.fruitionLength;
      if (!register || !duration) continue;
      const key = `${register}\u0000${duration}`;
      if (occupiedVariants.has(key)) {
        throw badRequest('Artwork steps cannot contain multiple items with the same language register and duration');
      }
      occupiedVariants.add(key);
    }
  }
}

async function withMapLocations(visit) {
  const plain = visit.toObject ? visit.toObject() : visit;
  const artworkIds = [...new Set(plain.steps.filter(isItemStep).map((step) => step.artworkId).filter(Boolean))];
  if (!artworkIds.length) return plain;

  const artworks = await Artwork.find({ id: { $in: artworkIds } }).select('id location').lean();
  const locations = new Map(artworks.map((artwork) => [artwork.id, artwork.location]));
  return {
    ...plain,
    steps: plain.steps.map((step) =>
      isItemStep(step) && locations.has(step.artworkId) ? { ...step, mapLocation: locations.get(step.artworkId) } : step
    ),
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};

    if (req.user.role !== 'super_admin') {
      filter.museumId = { $in: req.user.assignedMuseumIds || [] };
    }

    // Il visitor fruisce col Navigator: vede solo le visite pubblicate, mai
    // bozze o archiviate (che restano di competenza dei content editor).
    if (req.user.role === 'visitor') {
      filter.status = 'published';
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

    // Accesso diretto per id (URL del player): per un visitor una visita non
    // pubblicata è come inesistente, così non se ne rivela l'esistenza.
    if (req.user.role === 'visitor' && visit.status !== 'published') {
      return res.status(404).json({ error: { message: 'Visit not found', status: 404 } });
    }

    return res.status(200).json(await withMapLocations(visit));
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

    await validateSteps(payload.steps || [], payload.museumId);

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

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'steps')) {
      await validateSteps(req.body.steps, visit.museumId);
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

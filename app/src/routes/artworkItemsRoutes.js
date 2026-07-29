const express = require('express');

const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const User = require('../models/User');
const { requireApiKeyAndJwt, requireContentEditor } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { canAccessMuseum } = require('../services/tenant');
const { generateEntityId } = require('../services/ids');
const { paginateQuery } = require('../services/pagination');

const router = express.Router();
const ITEM_MUTABLE_FIELDS = new Set(['classification', 'content', 'images', 'license', 'isFree', 'price', 'status']);

function pickMutableFields(payload) {
  return Object.fromEntries(Object.entries(payload || {}).filter(([key]) => ITEM_MUTABLE_FIELDS.has(key)));
}

router.use(requireApiKeyAndJwt);

async function attachAuthors(items) {
  const authorIds = [...new Set(items.map((item) => item.creatorId).filter(Boolean))];
  if (!authorIds.length) return items;

  const users = await User.find({ id: { $in: authorIds } }).select('id fullName username -_id').lean();
  const byId = new Map(users.map((user) => [user.id, user]));
  return items.map((item) => ({
    ...item,
    author: byId.get(item.creatorId) || { id: item.creatorId, fullName: item.creatorId, username: item.creatorId },
  }));
}

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

    // Stessa regola di /visits: il visitor fruisce col Navigator e vede solo
    // contenuti pubblicati, mai le bozze dei content editor. Conta da quando il
    // player carica in blocco tutte le varianti di una tappa (`?id=a,b,c`)
    // invece di un singolo id già scelto dall'autore della visita.
    // `status` va anche fra i campi ignorati: paginateQuery applica i query
    // param DOPO il baseFilter, quindi senza questo un `?status=draft` esplicito
    // sovrascriverebbe il vincolo invece di essere scartato.
    const isVisitor = req.user.role === 'visitor';
    if (isVisitor) {
      baseFilter.status = 'published';
    }

    const result = await paginateQuery({
      model: ArtworkItem,
      req,
      baseFilter,
      allowedSortFields: ['id', 'artworkId', 'status', 'isFree', 'creatorId', 'lastUpdaterId', 'createdAt', 'updatedAt'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
      searchableFields: ['id', 'artworkId', 'license', 'creatorId', 'lastUpdaterId', 'content.title', 'content.screenText', 'content.ttsText'],
      ignoreFilterFields: isVisitor ? ['museumId', 'status'] : ['museumId'],
      allowedFilterFields: ['id', 'artworkId', 'status', 'isFree', 'creatorId', 'lastUpdaterId'],
      // L'autore dell'item e' un metadato esclusivamente editoriale: il
      // Navigator non deve ne' mostrarlo ne' riceverlo nel payload.
      select: isVisitor ? '-creatorId -lastUpdaterId' : undefined,
    });

    if (!isVisitor) {
      result.data = await attachAuthors(result.data);
    }

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

    const { creatorId: _ignoredCreatorId, lastUpdaterId: _ignoredLastUpdaterId, ...itemPayload } = payload;
    const item = await ArtworkItem.create({
      ...itemPayload,
      id: payload.id || generateEntityId('i'),
      creatorId: req.user.id,
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

    Object.assign(item, pickMutableFields(req.body), { lastUpdaterId: req.user.id });
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

    const Visit = require('../models/Visit');
    const visitCount = await Visit.countDocuments({
      steps: { $elemMatch: { itemIds: item.id } },
    });
    if (visitCount) {
      return res.status(409).json({ error: { message: 'Cannot delete artwork item referenced by visits', status: 409 } });
    }
    await item.deleteOne();
    return res.status(204).send();
  })
);

module.exports = router;

const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const Visit = require('../models/Visit');

// ArtworkItem non ha museumId diretto, solo artworkId: si passa da Artwork per risalire al museo.
async function attachCounts(museums) {
  const list = Array.isArray(museums) ? museums : [museums];
  const ids = list.map((m) => m.id);
  if (ids.length === 0) return museums;

  const [artworkGroups, visitGroups, artworks] = await Promise.all([
    Artwork.aggregate([{ $match: { museumId: { $in: ids } } }, { $group: { _id: '$museumId', count: { $sum: 1 } } }]),
    Visit.aggregate([{ $match: { museumId: { $in: ids } } }, { $group: { _id: '$museumId', count: { $sum: 1 } } }]),
    Artwork.find({ museumId: { $in: ids } }).select('id museumId').lean(),
  ]);

  const artworkIdToMuseum = new Map(artworks.map((a) => [a.id, a.museumId]));
  const itemGroups = await ArtworkItem.aggregate([
    { $match: { artworkId: { $in: [...artworkIdToMuseum.keys()] } } },
    { $group: { _id: '$artworkId', count: { $sum: 1 } } },
  ]);

  const artworksByMuseum = new Map(artworkGroups.map((g) => [g._id, g.count]));
  const visitsByMuseum = new Map(visitGroups.map((g) => [g._id, g.count]));
  const itemsByMuseum = new Map();
  for (const g of itemGroups) {
    const museumId = artworkIdToMuseum.get(g._id);
    itemsByMuseum.set(museumId, (itemsByMuseum.get(museumId) || 0) + g.count);
  }

  for (const m of list) {
    m.artworksCount = artworksByMuseum.get(m.id) || 0;
    m.visitsCount = visitsByMuseum.get(m.id) || 0;
    m.itemsCount = itemsByMuseum.get(m.id) || 0;
  }

  return museums;
}

module.exports = { attachCounts };

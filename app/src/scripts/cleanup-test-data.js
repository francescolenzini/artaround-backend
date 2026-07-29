/**
 * Bonifica one-shot dei contenuti residui creati dall'account Test.
 *
 * Il comando è dry-run per default. La cancellazione richiede --apply e si
 * interrompe prima di modificare il database se il grafo non coincide
 * esattamente con quello verificato in produzione.
 */

const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const Museum = require('../models/Museum');
const Visit = require('../models/Visit');
const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const Upload = require('../models/Upload');

const TARGET_MUSEUM_SLUG = 'museo-di-prova';
const TARGET_VISIT_ID = 'vis-1785351093475-45';

function uploadIdFromSource(source) {
  if (typeof source !== 'string') return null;
  const match = source.match(/^\/uploads\/([^/?#]+)$/);
  return match ? match[1] : null;
}

function assertExactGraph({ museum, visit, artworks, items }) {
  if (!museum) throw new Error(`Museo "${TARGET_MUSEUM_SLUG}" non trovato.`);
  if (!visit) throw new Error(`Visita "${TARGET_VISIT_ID}" non trovata.`);
  if (visit.museumId !== museum.id) throw new Error('La visita non appartiene al Museo di Prova.');
  if (visit.title !== 'Visita' || visit.subtitle !== 'Test' || visit.status !== 'draft') {
    throw new Error('Metadati della visita inattesi: bonifica annullata.');
  }
  if (artworks.length !== 1 || items.length !== 1) {
    throw new Error(`Grafo inatteso: trovate ${artworks.length} opere e ${items.length} item.`);
  }
  if (artworks[0].museumId !== museum.id || items[0].artworkId !== artworks[0].id) {
    throw new Error('Relazioni opera/item inattese: bonifica annullata.');
  }
}

async function isUploadReferencedElsewhere(uploadId, excluded) {
  const source = `/uploads/${uploadId}`;
  const [museumRefs, visitRefs, artworkRefs, itemRefs] = await Promise.all([
    Museum.countDocuments({ coverImage: source }),
    Visit.countDocuments({ id: { $nin: excluded.visitIds }, coverImage: source }),
    Artwork.countDocuments({ id: { $nin: excluded.artworkIds }, 'assets.source': source }),
    ArtworkItem.countDocuments({ id: { $nin: excluded.itemIds }, 'images.source': source }),
  ]);
  return museumRefs + visitRefs + artworkRefs + itemRefs > 0;
}

async function cleanupTestData({ apply = false, connect = true } = {}) {
  if (connect && mongoose.connection.readyState === 0) await connectDb();

  const museum = await Museum.findOne({ slug: TARGET_MUSEUM_SLUG }).lean();
  const visit = await Visit.findOne({ id: TARGET_VISIT_ID }).lean();
  const artworkIds = [
    ...new Set((visit?.steps || []).map((step) => step.artworkId).filter(Boolean)),
  ];
  const itemIds = [
    ...new Set((visit?.steps || []).flatMap((step) => step.itemIds || []).filter(Boolean)),
  ];
  const [artworks, items] = await Promise.all([
    Artwork.find({ id: { $in: artworkIds } }).lean(),
    ArtworkItem.find({ id: { $in: itemIds } }).lean(),
  ]);

  assertExactGraph({ museum, visit, artworks, items });

  const uploadIds = [
    visit.coverImage,
    ...artworks.flatMap((artwork) => (artwork.assets || []).map((asset) => asset.source)),
    ...items.flatMap((item) => (item.images || []).map((image) => image.source)),
  ].map(uploadIdFromSource).filter(Boolean);
  const uniqueUploadIds = [...new Set(uploadIds)];
  const existingUploads = uniqueUploadIds.length
    ? await Upload.find({ id: { $in: uniqueUploadIds } }).select('id -_id').lean()
    : [];
  if (existingUploads.length !== uniqueUploadIds.length) {
    const existingIds = new Set(existingUploads.map((upload) => upload.id));
    const missingIds = uniqueUploadIds.filter((uploadId) => !existingIds.has(uploadId));
    throw new Error(`Upload referenziati ma non trovati: ${missingIds.join(', ')}.`);
  }
  const excluded = {
    visitIds: [visit.id],
    artworkIds: artworks.map((artwork) => artwork.id),
    itemIds: items.map((item) => item.id),
  };
  const orphanUploadIds = [];
  for (const uploadId of uniqueUploadIds) {
    if (!(await isUploadReferencedElsewhere(uploadId, excluded))) orphanUploadIds.push(uploadId);
  }

  const summary = {
    museum: { id: museum.id, slug: museum.slug },
    visitIds: excluded.visitIds,
    artworkIds: excluded.artworkIds,
    itemIds: excluded.itemIds,
    orphanUploadIds,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!apply) {
    console.log('Dry run completato: usa --apply per eseguire la bonifica.');
    return summary;
  }

  const visitResult = await Visit.deleteOne({ id: visit.id });
  const itemResult = await ArtworkItem.deleteMany({ id: { $in: excluded.itemIds } });
  const artworkResult = await Artwork.deleteMany({ id: { $in: excluded.artworkIds } });
  const uploadResult = orphanUploadIds.length
    ? await Upload.deleteMany({ id: { $in: orphanUploadIds } })
    : { deletedCount: 0 };

  if (
    visitResult.deletedCount !== 1 ||
    itemResult.deletedCount !== excluded.itemIds.length ||
    artworkResult.deletedCount !== excluded.artworkIds.length ||
    uploadResult.deletedCount !== orphanUploadIds.length
  ) {
    throw new Error('Bonifica incompleta: controllare immediatamente il database.');
  }

  console.log('Bonifica completata.');
  return summary;
}

module.exports = { cleanupTestData, uploadIdFromSource };

if (require.main === module) {
  cleanupTestData({ apply: process.argv.includes('--apply') })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

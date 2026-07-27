const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { connectDb } = require('../config/db');

// Nel seed generiamo molti ID nello stesso millisecondo, quindi usiamo un
// contatore sequenziale per garantire l'unicità mantenendo il formato
// {prefix}-{timestamp}-{n} uguale a generateEntityId.
let _seq = 0;
const generateEntityId = (prefix) => `${prefix}-${Date.now()}-${_seq++}`;
const Museum = require('../models/Museum');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const ArtworkItem = require('../models/ArtworkItem');
const Visit = require('../models/Visit');
const Activity = require('../models/Activity');
const ApiKey = require('../models/ApiKey');
const Upload = require('../models/Upload');

const UFFIZI_SLUG = 'galleria-degli-uffizi';
const BOOTSTRAP_API_KEY = '8e4548cac10363c2c6b3eee94ded29428a4778dbc2005ed6843b998ebf878ec0';

async function upsertMany(model, docs, filterForDoc) {
  return Promise.all(
    docs.map((doc) => {
      const { id, ...rest } = doc;
      return model.updateOne(filterForDoc(doc), { $set: rest, $setOnInsert: { id } }, { upsert: true });
    })
  );
}

async function seed() {
  await connectDb();

  // Genera tutti gli ID prima di qualsiasi operazione async,
  // così le cross-reference tra entità sono consistenti.
  let musUffizi = generateEntityId('mus');
  let musProva = generateEntityId('mus');

  let usrAdmin = generateEntityId('usr');
  let usrAutore1 = generateEntityId('usr');
  let usrAutore2 = generateEntityId('usr');
  let usrVisitatore1 = generateEntityId('usr');
  let usrVisitatore2 = generateEntityId('usr');

  let artVenere = generateEntityId('art');
  let artPrimavera = generateEntityId('art');
  let artAnnunciazione = generateEntityId('art');
  let artAdorazione = generateEntityId('art');
  let artTondoDoni = generateEntityId('art');
  let artMadonna = generateEntityId('art');
  let artLeoneX = generateEntityId('art');
  let artVenereUrbino = generateEntityId('art');
  let artFlora = generateEntityId('art');
  let artMedusa = generateEntityId('art');
  let artSacrificio = generateEntityId('art');
  let artGiuditta = generateEntityId('art');

  let iVenereEl = generateEntityId('itm');
  let iVenereAv = generateEntityId('itm');
  let iPrimaveraEl = generateEntityId('itm');
  let iPrimaveraAv = generateEntityId('itm');
  let iAnnunciazioneEl = generateEntityId('itm');
  let iAnnunciazioneAv = generateEntityId('itm');
  let iAdorazioneEl = generateEntityId('itm');
  let iAdorazioneAv = generateEntityId('itm');
  let iTondoDoniEl = generateEntityId('itm');
  let iTondoDoniAv = generateEntityId('itm');
  let iMadonnaEl = generateEntityId('itm');
  let iMadonnaAv = generateEntityId('itm');
  let iLeoneXEl = generateEntityId('itm');
  let iLeoneXAv = generateEntityId('itm');
  let iVenereUrbinoEl = generateEntityId('itm');
  let iVenereUrbinoAv = generateEntityId('itm');
  let iFloraEl = generateEntityId('itm');
  let iFloraAv = generateEntityId('itm');
  let iMedusaEl = generateEntityId('itm');
  let iMedusaAv = generateEntityId('itm');
  let iSacrifEl = generateEntityId('itm');
  let iSacrifAv = generateEntityId('itm');
  let iGiudittaEl = generateEntityId('itm');
  let iGiudittaAv = generateEntityId('itm');

  // Opere "vetrina" con la scala completa dei 5 registri (infantile/medio/
  // specialistico in aggiunta alla coppia elementare/avanzato di base).
  let iVenereIn = generateEntityId('itm');
  let iVenereMd = generateEntityId('itm');
  // Variante "medio" lunga, di un secondo autore: è la cella (medio, 4min)
  // della griglia della Venere.
  let iVenereMd2 = generateEntityId('itm');
  let iVenereSp = generateEntityId('itm');
  let iPrimaveraIn = generateEntityId('itm');
  let iPrimaveraMd = generateEntityId('itm');
  let iPrimaveraSp = generateEntityId('itm');
  let iMedusaIn = generateEntityId('itm');
  let iMedusaMd = generateEntityId('itm');
  let iMedusaSp = generateEntityId('itm');
  let iGiudittaIn = generateEntityId('itm');
  let iGiudittaMd = generateEntityId('itm');
  let iGiudittaSp = generateEntityId('itm');

  // Seconda dimensione degli item, quella che le specifiche chiamano
  // "lunghezza": sulle stesse opere vetrina, più durate per lo stesso registro.
  // È ciò che rende "dimmi di più" un comando diverso da "troppo semplice" —
  // il primo si muove sulla durata a registro fermo, il secondo sul registro.
  //
  // Regola editoriale della griglia (ragionata, non meccanica): elementare e
  // medio coprono 1/2/4 min, avanzato 2/4 min, infantile resta solo a 1min e
  // specialistico solo a 4min — nessun autore scrive una scheda specialistica
  // lampo né un racconto per bambini di quattro minuti. La griglia è quindi
  // irregolare per scelta, ed è il caso che il Navigator deve saper gestire.
  //
  // Scala in minuti interi e non nei secondi delle slide (3s/15s/40s): il form
  // dell'Editor raccoglie i minuti, e un valore in secondi non sarebbe più
  // modificabile da lì.
  let iVenereEl2m = generateEntityId('itm');
  let iVenereEl4m = generateEntityId('itm');
  let iVenereMd2m = generateEntityId('itm');
  let iVenereAv2m = generateEntityId('itm');
  let iPrimaveraEl2m = generateEntityId('itm');
  let iPrimaveraEl4m = generateEntityId('itm');
  let iPrimaveraMd2m = generateEntityId('itm');
  let iPrimaveraMd4m = generateEntityId('itm');
  let iPrimaveraAv2m = generateEntityId('itm');
  let iMedusaEl2m = generateEntityId('itm');
  let iMedusaEl4m = generateEntityId('itm');
  let iMedusaMd2m = generateEntityId('itm');
  let iMedusaMd4m = generateEntityId('itm');
  let iMedusaAv2m = generateEntityId('itm');
  let iGiudittaEl2m = generateEntityId('itm');
  let iGiudittaEl4m = generateEntityId('itm');
  let iGiudittaMd2m = generateEntityId('itm');
  let iGiudittaMd4m = generateEntityId('itm');
  let iGiudittaAv2m = generateEntityId('itm');

  let visHighlights = generateEntityId('vis');
  let visRinascimento = generateEntityId('vis');
  let visFamiglie = generateEntityId('vis');

  // ── MUSEO ─────────────────────────────────────────────────────────────────

  await upsertMany(Museum, [
    {
      id: musUffizi,
      name: 'Galleria degli Uffizi',
      shortName: 'Uffizi',
      slug: 'galleria-degli-uffizi',
      status: 'active',
      shortDescription: 'Uno dei musei d\'arte più importanti al mondo, con capolavori del Rinascimento italiano.',
      longDescription: 'La Galleria degli Uffizi di Firenze ospita una delle collezioni d\'arte più significative al mondo. Fondata dai Medici nel XVI secolo, raccoglie opere di Botticelli, Leonardo da Vinci, Michelangelo, Raffaello, Tiziano, Caravaggio e molti altri maestri. Il museo si sviluppa in 45 sale espositive e lungo il celebre Corridoio Vasariano.',
      city: 'Firenze',
      address: 'Piazzale degli Uffizi 6',
      postalCode: '50122',
      country: 'Italy',
      phone: '+39 055 294883',
      email: 'info@uffizi.it',
      website: 'https://www.uffizi.it',
      defaultLanguage: 'it',
      supportedLanguages: ['it', 'en'],
      openingHours: [
        { day: 'Lunedì', openingHour: '-', closingHour: '-' },
        { day: 'Martedì', openingHour: '08:15', closingHour: '18:50' },
        { day: 'Mercoledì', openingHour: '08:15', closingHour: '18:50' },
        { day: 'Giovedì', openingHour: '08:15', closingHour: '18:50' },
        { day: 'Venerdì', openingHour: '08:15', closingHour: '18:50' },
        { day: 'Sabato', openingHour: '08:15', closingHour: '18:50' },
        { day: 'Domenica', openingHour: '08:15', closingHour: '18:50' },
      ],
      ticketInfo: 'Intero €20, ridotto €10. Prenotazione consigliata online su uffizi.it.',
      accessibilityNotes: 'Il museo è accessibile alle persone con disabilità motoria. Disponibili ascensori e percorsi facilitati per tutte le sale principali.',
      services: ['audioguida', 'bookshop', 'caffetteria', 'guardaroba', 'visite guidate', 'wi-fi'],
      internalNotes: 'Museo campione per il progetto ArtAround — dati di demo.',
      assignedCuratorIds: [usrAutore1, usrAutore2],
    },
    {
      id: musProva,
      name: 'Museo di Prova',
      shortName: 'Prova',
      slug: 'museo-di-prova',
      status: 'draft',
      shortDescription: 'Museo vuoto usato per testare la selezione tra più musei.',
      city: 'Bologna',
      address: 'Via di Prova 1',
      postalCode: '40100',
      country: 'Italy',
      defaultLanguage: 'it',
      assignedCuratorIds: [],
    },
  ], (doc) => ({ slug: doc.slug }));

  const storedMuseum = await Museum.findOne({ slug: UFFIZI_SLUG }).lean();
  if (storedMuseum?.id) {
    musUffizi = storedMuseum.id;
  }

  // ── UTENTI ────────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('12345678', 10);

  await upsertMany(User, [
    {
      id: usrAdmin,
      fullName: 'Admin ArtAround',
      email: 'admin@artaround.it',
      username: 'admin',
      passwordHash,
      role: 'super_admin',
      status: 'active',
      assignedMuseumIds: [],
    },
    {
      id: usrAutore1,
      fullName: 'Autore Uno',
      email: 'autore1@artaround.it',
      username: 'autore1',
      passwordHash,
      role: 'author',
      status: 'active',
      assignedMuseumIds: [musUffizi],
    },
    {
      id: usrAutore2,
      fullName: 'Autore Due',
      email: 'autore2@artaround.it',
      username: 'autore2',
      passwordHash,
      role: 'author',
      status: 'active',
      assignedMuseumIds: [musUffizi],
    },
    {
      id: usrVisitatore1,
      fullName: 'Visitatore Uno',
      email: 'visitatore1@artaround.it',
      username: 'visitatore1',
      passwordHash,
      role: 'visitor',
      status: 'active',
      assignedMuseumIds: [musUffizi],
    },
    {
      id: usrVisitatore2,
      fullName: 'Visitatore Due',
      email: 'visitatore2@artaround.it',
      username: 'visitatore2',
      passwordHash,
      role: 'visitor',
      status: 'active',
      assignedMuseumIds: [musUffizi],
    },
  ], (doc) => ({ username: doc.username }));

  const storedUsers = await Promise.all([
    User.findOne({ username: 'admin' }).lean(),
    User.findOne({ username: 'autore1' }).lean(),
    User.findOne({ username: 'autore2' }).lean(),
    User.findOne({ username: 'visitatore1' }).lean(),
    User.findOne({ username: 'visitatore2' }).lean(),
  ]);

  [usrAdmin, usrAutore1, usrAutore2, usrVisitatore1, usrVisitatore2] = storedUsers.map((user) => user.id);

  // ── OPERE ─────────────────────────────────────────────────────────────────

  await upsertMany(Artwork, [
    {
      id: artVenere,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-001',
      title: 'La nascita di Venere',
      artist: 'Sandro Botticelli',
      year: '1484-1486',
      category: 'Pittura',
      style: 'Primo Rinascimento',
      materials: ['tempera su tela'],
      description: 'Capolavoro di Botticelli che raffigura la dea Venere emergente dal mare su una conchiglia. È uno dei dipinti più iconici del Rinascimento fiorentino e simbolo degli Uffizi.',
      tags: ['Botticelli', 'mitologia', 'Venere', 'Rinascimento', 'Medici'],
      status: 'published',
    },
    {
      id: artPrimavera,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-002',
      title: 'La Primavera',
      artist: 'Sandro Botticelli',
      year: '1477-1482',
      category: 'Pittura',
      style: 'Primo Rinascimento',
      materials: ['tempera su tavola'],
      description: 'Allegoria della primavera con nove figure mitologiche in un giardino fiorito. Una delle opere più dibattute e studiate del Rinascimento italiano.',
      tags: ['Botticelli', 'allegoria', 'mitologia', 'Rinascimento', 'Medici'],
      status: 'published',
    },
    {
      id: artAnnunciazione,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-003',
      title: 'Annunciazione',
      artist: 'Leonardo da Vinci',
      year: '1472-1475',
      category: 'Pittura',
      style: 'Primo Rinascimento',
      materials: ['olio e tempera su tavola'],
      description: 'Opera giovanile di Leonardo in cui l\'arcangelo Gabriele annuncia a Maria la nascita di Gesù. Straordinaria per la cura del paesaggio e la resa della luce.',
      tags: ['Leonardo', 'religioso', 'Annunciazione', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artAdorazione,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-004',
      title: 'Adorazione dei Magi',
      artist: 'Leonardo da Vinci',
      year: '1481-1482',
      category: 'Pittura',
      style: 'Primo Rinascimento',
      materials: ['tempera e olio su tavola'],
      description: 'Opera incompiuta di Leonardo che rivela il suo metodo progettuale attraverso il disegno preparatorio ancora visibile sotto la superficie pittorica.',
      tags: ['Leonardo', 'incompiuto', 'Magi', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artTondoDoni,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-005',
      title: 'Tondo Doni',
      artist: 'Michelangelo Buonarroti',
      year: '1504-1506',
      category: 'Pittura',
      style: 'Alto Rinascimento',
      materials: ['tempera su tavola'],
      description: 'Unico dipinto su tavola di Michelangelo giunto integro fino a noi. Raffigura la Sacra Famiglia con una tecnica scultorea caratteristica del maestro.',
      tags: ['Michelangelo', 'Sacra Famiglia', 'tondo', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artMadonna,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-006',
      title: 'Madonna del Cardellino',
      artist: 'Raffaello Sanzio',
      year: '1505-1506',
      category: 'Pittura',
      style: 'Alto Rinascimento',
      materials: ['olio su tavola'],
      description: 'Raffigura la Vergine col Bambino Gesù e San Giovannino in un paesaggio aperto. Considerato uno dei capolavori di Raffaello per grazia e dolcezza delle figure.',
      tags: ['Raffaello', 'Madonna', 'Rinascimento', 'Firenze'],
      status: 'published',
    },
    {
      id: artLeoneX,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-007',
      title: 'Ritratto di Leone X con i cardinali',
      artist: 'Raffaello Sanzio',
      year: '1517-1518',
      category: 'Pittura',
      style: 'Alto Rinascimento',
      materials: ['olio su tavola'],
      description: 'Ritratto papale di straordinaria intensità psicologica: Leone X de\' Medici è seduto con i cardinali Giulio de\' Medici e Luigi de\' Rossi.',
      tags: ['Raffaello', 'ritratto', 'Papa', 'Medici', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artVenereUrbino,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-008',
      title: 'Venere di Urbino',
      artist: 'Tiziano Vecellio',
      year: '1538',
      category: 'Pittura',
      style: 'Alto Rinascimento',
      materials: ['olio su tela'],
      description: 'Il nudo femminile per eccellenza della pittura veneziana. La figura distesa guarda direttamente lo spettatore con sicurezza e consapevolezza.',
      tags: ['Tiziano', 'Venere', 'nudo', 'Venezia', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artFlora,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-009',
      title: 'Flora',
      artist: 'Tiziano Vecellio',
      year: '1515-1520',
      category: 'Pittura',
      style: 'Alto Rinascimento',
      materials: ['olio su tela'],
      description: 'Ritratto di donna identificata con Flora, dea della primavera. Incarnazione della bellezza ideale femminile nel pieno Rinascimento veneziano.',
      tags: ['Tiziano', 'Flora', 'ritratto', 'Venezia', 'Rinascimento'],
      status: 'published',
    },
    {
      id: artMedusa,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-010',
      title: 'Medusa',
      artist: 'Caravaggio',
      year: '1597',
      category: 'Pittura',
      style: 'Barocco',
      materials: ['olio su tela montata su scudo convesso'],
      description: 'Dipinta su uno scudo convesso di pelle di cavallo, la Medusa di Caravaggio esprime terrore con un realismo senza precedenti. Dono diplomatico dei Medici.',
      tags: ['Caravaggio', 'Medusa', 'mitologia', 'Barocco', 'scudo'],
      status: 'published',
    },
    {
      id: artSacrificio,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-011',
      title: 'Sacrificio di Isacco',
      artist: 'Caravaggio',
      year: '1601-1602',
      category: 'Pittura',
      style: 'Barocco',
      materials: ['olio su tela'],
      description: 'Caravaggio rappresenta il momento culminante del racconto biblico con teatralità barocca, usando contrasti di luce e ombra potentissimi.',
      tags: ['Caravaggio', 'Bibbia', 'Isacco', 'Barocco', 'chiaroscuro'],
      status: 'published',
    },
    {
      id: artGiuditta,
      museumId: musUffizi,
      universalObjectId: 'UO-UFZ-012',
      title: 'Giuditta e Oloferne',
      artist: 'Artemisia Gentileschi',
      year: '1620-1621',
      category: 'Pittura',
      style: 'Barocco',
      materials: ['olio su tela'],
      description: 'Capolavoro di Artemisia Gentileschi, una delle prime donne artiste di rilievo della storia dell\'arte. Raffigura Giuditta che decapita il generale assiro Oloferne.',
      tags: ['Artemisia', 'Gentileschi', 'Giuditta', 'Barocco', 'donne nell\'arte'],
      status: 'published',
    },
  ], (doc) => ({ universalObjectId: doc.universalObjectId }));

  const storedArtworks = await Promise.all([
    Artwork.findOne({ universalObjectId: 'UO-UFZ-001' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-002' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-003' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-004' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-005' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-006' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-007' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-008' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-009' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-010' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-011' }).lean(),
    Artwork.findOne({ universalObjectId: 'UO-UFZ-012' }).lean(),
  ]);

  [
    artVenere,
    artPrimavera,
    artAnnunciazione,
    artAdorazione,
    artTondoDoni,
    artMadonna,
    artLeoneX,
    artVenereUrbino,
    artFlora,
    artMedusa,
    artSacrificio,
    artGiuditta,
  ] = storedArtworks.map((artwork) => artwork.id);

  // ── IMMAGINI OPERE ────────────────────────────────────────────────────────
  // Riproduzioni in pubblico dominio scaricate da Wikimedia Commons in
  // seed-assets/ (vedi fetch-seed-images.js). Il binario è upsertato nella
  // collezione Upload per filename stabile (l'id upl-, e quindi l'URL, resta
  // costante tra i run); il riferimento viene aggiunto ad assets[] solo se
  // l'opera non ha già un asset immagine, così le sostituzioni fatte dal
  // Marketplace dopo il seed iniziale non vengono mai sovrascritte.

  const SEED_ASSETS_DIR = path.join(__dirname, 'seed-assets');
  const MIME_BY_EXT = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const artworkImages = [
    [artVenere, 'uo-ufz-001-nascita-di-venere'],
    [artPrimavera, 'uo-ufz-002-primavera'],
    [artAnnunciazione, 'uo-ufz-003-annunciazione'],
    [artAdorazione, 'uo-ufz-004-adorazione-dei-magi'],
    [artTondoDoni, 'uo-ufz-005-tondo-doni'],
    [artMadonna, 'uo-ufz-006-madonna-del-cardellino'],
    [artLeoneX, 'uo-ufz-007-ritratto-di-leone-x'],
    [artVenereUrbino, 'uo-ufz-008-venere-di-urbino'],
    [artFlora, 'uo-ufz-009-flora'],
    [artMedusa, 'uo-ufz-010-medusa'],
    [artSacrificio, 'uo-ufz-011-sacrificio-di-isacco'],
    [artGiuditta, 'uo-ufz-012-giuditta-e-oloferne'],
  ];

  const seedAssetFiles = fs.existsSync(SEED_ASSETS_DIR) ? fs.readdirSync(SEED_ASSETS_DIR) : [];
  let seededImages = 0;
  for (const [artworkId, basename] of artworkImages) {
    const filename = seedAssetFiles.find((f) => f.startsWith(`${basename}.`));
    if (!filename) {
      console.warn(`  [seed] immagine mancante in seed-assets/, salto: ${basename}`);
      continue;
    }
    const data = fs.readFileSync(path.join(SEED_ASSETS_DIR, filename));
    await Upload.updateOne(
      { filename },
      {
        $set: {
          mimeType: MIME_BY_EXT[path.extname(filename).toLowerCase()],
          size: data.length,
          data,
          uploaderId: usrAdmin,
        },
        $setOnInsert: { id: generateEntityId('upl') },
      },
      { upsert: true }
    );
    const upload = await Upload.findOne({ filename }).select('id').lean();
    await Artwork.updateOne(
      { id: artworkId, 'assets.type': { $ne: 'image' } },
      {
        $push: {
          assets: {
            type: 'image',
            source: `/uploads/${upload.id}`,
            description: 'Riproduzione in pubblico dominio (Wikimedia Commons)',
          },
        },
      }
    );
    seededImages += 1;
  }

  // ── ARTWORK ITEMS ─────────────────────────────────────────────────────────

  await upsertMany(ArtworkItem, [
    // La nascita di Venere
    {
      id: iVenereEl,
      artworkId: artVenere,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La nascita di Venere',
        screenText: 'Questo dipinto mostra Venere, la dea della bellezza, che nasce dal mare su una grande conchiglia.\nBotticelli l\'ha dipinta con i capelli lunghi e dorati che fluttuano nel vento.\nA sinistra due figure soffiano per spingerla a riva; a destra una donna la accoglie con un manto fiorito.\nÈ uno dei quadri più famosi del mondo ed è qui agli Uffizi da secoli.',
        ttsText: 'Questo dipinto mostra Venere, la dea della bellezza, che nasce dal mare su una grande conchiglia. Botticelli la ha dipinta con i capelli lunghi e dorati che fluttuano nel vento. A sinistra due figure soffiano per spingerla a riva; a destra una donna la accoglie con un manto fiorito. È uno dei quadri più famosi del mondo ed è qui agli Uffizi da secoli.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereAv,
      artworkId: artVenere,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'La nascita di Venere — lettura critica',
        screenText: 'La Nascita di Venere (1484-1486) è tra le prime rappresentazioni di figura femminile a grandezza naturale nella pittura moderna.\nCommissionata dai Medici, attinge al neoplatonismo fiorentino: Venere incarna la Venere Celeste, simbolo di amore spirituale e bellezza divina.\nIl soggetto, tratto dalle Stanze per la Giostra di Angelo Poliziano, si intreccia con la tradizione classica richiamata dalla scultura ellenistica.\nLa tecnica a tempera su tela conferisce alla superficie una qualità quasi eterica; le linee di contorno marcate rivelano la formazione orafa di Botticelli e l\'influenza di Pollaiuolo.',
        ttsText: 'La Nascita di Venere, dipinta tra il 1484 e il 1486, è tra le prime rappresentazioni di figura femminile a grandezza naturale nella pittura moderna. Commissionata dai Medici, attinge al neoplatonismo fiorentino: Venere incarna la Venere Celeste, simbolo di amore spirituale e bellezza divina. Il soggetto mitologico si intreccia con la tradizione classica richiamata dalla scultura ellenistica. La tecnica a tempera su tela conferisce alla superficie una qualità quasi eterica; le linee di contorno marcate rivelano la formazione orafa di Botticelli.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereIn,
      artworkId: artVenere,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'infantile' },
      content: {
        title: 'La nascita di Venere — per i più piccoli',
        screenText: 'Guarda che grande conchiglia!\nSopra c\'è Venere, una principessa del mare appena nata.\nIl vento la spinge piano piano verso la spiaggia, dove un\'amica la aspetta con un mantello pieno di fiori.',
        ttsText: 'Guarda che grande conchiglia! Sopra c\'è Venere, una principessa del mare appena nata. Il vento la spinge piano piano verso la spiaggia, dove un\'amica la aspetta con un mantello pieno di fiori.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereMd,
      artworkId: artVenere,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La nascita di Venere — racconto',
        screenText: 'Botticelli dipinse questa tela tra il 1484 e il 1486 per la famiglia Medici.\nVenere, dea dell\'amore e della bellezza, approda a riva su una conchiglia sospinta dal soffio di Zefiro e della ninfa Aura.\nSulla destra una delle Ore, divinità delle stagioni, le porge un manto ricamato di fiori primaverili.\nLa posa di Venere riprende le statue antiche della "Venere pudica", che Botticelli reinterpreta con una grazia tutta nuova.',
        ttsText: 'Botticelli dipinse questa tela tra il 1484 e il 1486 per la famiglia Medici. Venere, dea dell\'amore e della bellezza, approda a riva su una conchiglia sospinta dal soffio di Zefiro e della ninfa Aura. Sulla destra una delle Ore, divinità delle stagioni, le porge un manto ricamato di fiori primaverili. La posa di Venere riprende le statue antiche della Venere pudica, che Botticelli reinterpreta con una grazia tutta nuova.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereMd2,
      artworkId: artVenere,
      // Cella (medio, 4min) della Venere: stesso registro di iVenereMd, durata
      // maggiore e autore diverso. È la variante che si raggiunge dicendo
      // "dimmi di più" senza cambiare linguaggio.
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La nascita di Venere — tra mito e tecnica',
        screenText: 'Questa versione del racconto parte dai materiali: Botticelli scelse la tempera su tela, rara all\'epoca, che rende la superficie leggera e luminosa come un affresco.\nL\'oro vero, steso a pennello sui capelli di Venere e sulle ali di Zefiro, doveva brillare alla luce delle candele.\nIl mare è costruito con semplici segni a "V" ripetuti: una soluzione quasi astratta, che non cerca il realismo ma il ritmo decorativo.\nAnche i fiori che cadono nel vento sono botanicamente riconoscibili: sono rose, il fiore sacro alla dea.',
        ttsText: 'Questa versione del racconto parte dai materiali: Botticelli scelse la tempera su tela, rara all\'epoca, che rende la superficie leggera e luminosa come un affresco. L\'oro vero, steso a pennello sui capelli di Venere e sulle ali di Zefiro, doveva brillare alla luce delle candele. Il mare è costruito con semplici segni a V ripetuti: una soluzione quasi astratta, che non cerca il realismo ma il ritmo decorativo. Anche i fiori che cadono nel vento sono rose, il fiore sacro alla dea.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iVenereSp,
      artworkId: artVenere,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'specialistico' },
      content: {
        title: 'La nascita di Venere — scheda specialistica',
        screenText: 'La tela (172,5 × 278,5 cm) è il primo esempio toscano di grande formato mitologico su tela, supporto associato alla decorazione delle ville suburbane.\nL\'iconografia deriva dall\'Anadiomene apellea nota tramite Plinio (Nat. Hist. XXXV) e dagli Omerici Inni; la mediazione poliziana resta discussa dalla critica post-Warburg.\nLa Venere pudica cita il tipo statuario della Venus de\' Medici, che Botticelli poteva conoscere tramite la collezione medicea; la torsione anatomicamente impossibile del collo è scelta antinaturalistica deliberata.\nLe indagini riflettografiche (Opificio delle Pietre Dure, 1987) hanno rivelato un disegno sottostante essenziale, con varianti minime: prassi atipica rispetto alla Primavera, indice di un cartone preparatorio già definito.\nLa stesura a tempera magra con velature di verde terra nelle carni e l\'uso di oro in conchiglia collocano l\'opera nella piena maturità tecnica del maestro.',
        ttsText: 'La tela, di centosettantadue centimetri per duecentosettantotto, è il primo esempio toscano di grande formato mitologico su tela, supporto associato alla decorazione delle ville suburbane. L\'iconografia deriva dall\'Anadiomene apellea nota tramite Plinio e dagli Inni omerici; la mediazione di Poliziano resta discussa dalla critica. La Venere pudica cita il tipo statuario della Venus de\' Medici; la torsione anatomicamente impossibile del collo è una scelta antinaturalistica deliberata. Le indagini riflettografiche hanno rivelato un disegno sottostante essenziale, con varianti minime, indice di un cartone preparatorio già definito. La stesura a tempera magra con velature di verde terra nelle carni e l\'uso di oro in conchiglia collocano l\'opera nella piena maturità tecnica del maestro.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // La Primavera
    {
      id: iPrimaveraEl,
      artworkId: artPrimavera,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La Primavera',
        screenText: 'In questo grande dipinto vediamo un giardino pieno di fiori con nove personaggi mitologici.\nAl centro c\'è Venere, la dea dell\'amore; sopra di lei vola Cupido con gli occhi bendati.\nA sinistra Mercurio sposta le nuvole; a destra le Tre Grazie danzano insieme.\nIl quadro è pieno di simboli sulla bellezza e il rinnovamento della natura in primavera.',
        ttsText: 'In questo grande dipinto vediamo un giardino pieno di fiori con nove personaggi mitologici. Al centro c\'è Venere, la dea dell\'amore; sopra di lei vola Cupido con gli occhi bendati. A sinistra Mercurio sposta le nuvole; a destra le Tre Grazie danzano insieme. Il quadro è pieno di simboli sulla bellezza e il rinnovamento della natura in primavera.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraAv,
      artworkId: artPrimavera,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'La Primavera — lettura critica',
        screenText: 'La Primavera (1477-1482) è l\'opera più enigmatica di Botticelli e tra le più studiate della storia dell\'arte.\nLe interpretazioni si moltiplicano: da allegoria neoplatonica del pensiero di Marsilio Ficino, a calendario stagionale mitologico, a rappresentazione delle virtù medicee.\nLe nove figure — Mercurio, Tre Grazie, Venere, Cupido, Flora, Cloris e Zefiro — formano una processione narrativa da destra a sinistra, rara nell\'iconografia rinascimentale.\nLa superficie traboccante di oltre 500 specie botaniche identificabili rivela una conoscenza naturalistica di straordinaria precisione.',
        ttsText: 'La Primavera, dipinta tra il 1477 e il 1482, è l\'opera più enigmatica di Botticelli e tra le più studiate della storia dell\'arte. Le interpretazioni si moltiplicano: da allegoria neoplatonica del pensiero di Marsilio Ficino, a calendario stagionale mitologico, a rappresentazione delle virtù medicee. Le nove figure formano una processione narrativa da destra a sinistra, rara nell\'iconografia rinascimentale. La superficie traboccante di oltre cinquecento specie botaniche identificabili rivela una conoscenza naturalistica di straordinaria precisione.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraIn,
      artworkId: artPrimavera,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'infantile' },
      content: {
        title: 'La Primavera — per i più piccoli',
        screenText: 'Questo quadro è un giardino magico pieno di fiori!\nProva a contare i personaggi: sono nove, e ognuno ha un compito speciale.\nC\'è anche un bambino che vola con l\'arco: è Cupido, e con le sue frecce fa innamorare le persone.',
        ttsText: 'Questo quadro è un giardino magico pieno di fiori! Prova a contare i personaggi: sono nove, e ognuno ha un compito speciale. C\'è anche un bambino che vola con l\'arco: è Cupido, e con le sue frecce fa innamorare le persone.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraMd,
      artworkId: artPrimavera,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La Primavera — racconto',
        screenText: 'In un boschetto di aranci si muovono nove figure della mitologia classica.\nDa destra: Zefiro, vento di primavera, insegue la ninfa Cloris che si trasforma in Flora, la dea fiorita.\nAl centro presiede Venere, sovrastata da Cupido bendato; a sinistra danzano le tre Grazie e Mercurio dissolve le nuvole con il suo bastone.\nIl prato contiene centinaia di specie di fiori realmente osservate: un tappeto botanico che celebra il rinnovarsi della natura.',
        ttsText: 'In un boschetto di aranci si muovono nove figure della mitologia classica. Da destra: Zefiro, vento di primavera, insegue la ninfa Cloris che si trasforma in Flora, la dea fiorita. Al centro presiede Venere, sovrastata da Cupido bendato; a sinistra danzano le tre Grazie e Mercurio dissolve le nuvole con il suo bastone. Il prato contiene centinaia di specie di fiori realmente osservate: un tappeto botanico che celebra il rinnovarsi della natura.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraSp,
      artworkId: artPrimavera,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'specialistico' },
      content: {
        title: 'La Primavera — scheda specialistica',
        screenText: 'La tavola (203 × 314 cm, tempera grassa) è documentata nell\'inventario mediceo del 1499 nella camera di Lorenzo di Pierfrancesco de\' Medici, accanto alla Pallade e il centauro.\nLa lettura neoplatonica (Gombrich, Wind) interpreta la sequenza Zefiro-Cloris-Flora come ascesa dall\'amore sensibile all\'amor divino, con Venere-Humanitas mediatrice; letture successive privilegiano la committenza nuziale del 1482.\nLa fonte primaria resta Ovidio (Fasti V, 193-214) per la metamorfosi di Cloris, integrata da Lucrezio (De rerum natura V) per la processione stagionale.\nL\'analisi botanica di Levi d\'Ancona ha censito oltre 130 specie identificabili, fiorenti tra marzo e maggio nell\'area fiorentina: un realismo scientifico in tensione con l\'assetto antiprospettico della scena.\nIl restauro del 1982 ha restituito la brillantezza delle lacche e confermato l\'assenza di pentimenti strutturali.',
        ttsText: 'La tavola, documentata nell\'inventario mediceo del 1499 nella camera di Lorenzo di Pierfrancesco de\' Medici, misura due metri per oltre tre. La lettura neoplatonica di Gombrich e Wind interpreta la sequenza Zefiro, Cloris, Flora come ascesa dall\'amore sensibile all\'amor divino, con Venere Humanitas mediatrice; letture successive privilegiano la committenza nuziale del 1482. La fonte primaria resta Ovidio, integrata da Lucrezio per la processione stagionale. L\'analisi botanica ha censito oltre centotrenta specie identificabili, fiorenti tra marzo e maggio nell\'area fiorentina: un realismo scientifico in tensione con l\'assetto antiprospettico della scena. Il restauro del 1982 ha restituito la brillantezza delle lacche.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Annunciazione
    {
      id: iAnnunciazioneEl,
      artworkId: artAnnunciazione,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Annunciazione',
        screenText: 'Questo quadro racconta il momento in cui un angelo annuncia a Maria che diventerà la madre di Gesù.\nLeonardo l\'ha dipinto da giovane, ma si vede già il suo talento straordinario nel paesaggio sullo sfondo.\nL\'angelo è inginocchiato sul prato fiorito a sinistra; Maria è seduta davanti a un leggio a destra.\nSullo sfondo si apre un paesaggio con alberi, colline e un fiume che si perde all\'orizzonte.',
        ttsText: 'Questo quadro racconta il momento in cui un angelo annuncia a Maria che diventerà la madre di Gesù. Leonardo lo ha dipinto da giovane, ma si vede già il suo talento straordinario nel paesaggio sullo sfondo. L\'angelo è inginocchiato sul prato fiorito a sinistra; Maria è seduta davanti a un leggio a destra. Sullo sfondo si apre un paesaggio con alberi, colline e un fiume che si perde all\'orizzonte.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iAnnunciazioneAv,
      artworkId: artAnnunciazione,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Annunciazione — lettura critica',
        screenText: 'L\'Annunciazione (1472-1475) è la prima opera di dimensioni significative attribuita a Leonardo, eseguita nella bottega del Verrocchio.\nLa composizione rivela l\'influenza del maestro, ma la mano di Leonardo è riconoscibile nella resa atmosferica del paesaggio — uno sfumato ante litteram — e nella qualità botanica delle erbe del prato.\nUn\'anomalia prospettica nel braccio destro di Maria è interpretata da alcuni studiosi come compensazione per un punto di vista obliquo, non frontale.\nIl leggio marmoreo con rilievi classicheggianti segnala la precoce attenzione leonardesca per l\'antico.',
        ttsText: 'L\'Annunciazione, databile tra il 1472 e il 1475, è la prima opera di dimensioni significative attribuita a Leonardo, eseguita nella bottega del Verrocchio. La mano di Leonardo è riconoscibile nella resa atmosferica del paesaggio, uno sfumato ante litteram, e nella qualità botanica delle erbe del prato. Un\'anomalia prospettica nel braccio destro di Maria è interpretata da alcuni studiosi come compensazione per un punto di vista obliquo. Il leggio marmoreo con rilievi classicheggianti segnala la precoce attenzione leonardesca per l\'antico.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Adorazione dei Magi
    {
      id: iAdorazioneEl,
      artworkId: artAdorazione,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Adorazione dei Magi',
        screenText: 'Questo dipinto mostra i tre Re Magi che vanno ad adorare il Bambino Gesù appena nato.\nLeonardo ha lasciato l\'opera incompiuta: si vede il disegno preparatorio color marrone sotto la vernice.\nNonostante sia incompleto, è pieno di figure in movimento e di emozioni intense.\nÈ affascinante perché ci mostra come lavorava Leonardo prima di stendere i colori definitivi.',
        ttsText: 'Questo dipinto mostra i tre Re Magi che vanno ad adorare il Bambino Gesù appena nato. Leonardo ha lasciato l\'opera incompiuta: si vede il disegno preparatorio color marrone sotto la vernice. Nonostante sia incompleto, è pieno di figure in movimento e di emozioni intense. È affascinante perché ci mostra come lavorava Leonardo prima di stendere i colori definitivi.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iAdorazioneAv,
      artworkId: artAdorazione,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Adorazione dei Magi — lettura critica',
        screenText: 'L\'Adorazione dei Magi (1481-1482) fu commissionata dai monaci agostiniani di San Donato a Scopeto, ma Leonardo partì per Milano lasciandola incompiuta.\nL\'opera segna una rivoluzione compositiva: abbandono dell\'oro di fondo per una profondità spaziale reale, folla in movimento emotivo, studio degli stati d\'animo come priorità narrativa.\nIl disegno preparatorio visibile negli strati inferiori costituisce un documento eccezionale del metodo progettuale leonardesco.\nIl recente restauro ha rivelato tracce di azzurrite e lapislazzulo che suggeriscono un\'intenzione cromatica mai realizzata.',
        ttsText: 'L\'Adorazione dei Magi, iniziata nel 1481 e lasciata incompiuta nel 1482, fu commissionata dai monaci agostiniani di San Donato a Scopeto. L\'opera segna una rivoluzione compositiva: abbandono dell\'oro di fondo per una profondità spaziale reale, folla in movimento emotivo, studio degli stati d\'animo come priorità narrativa. Il disegno preparatorio visibile negli strati inferiori costituisce un documento eccezionale del metodo progettuale leonardesco. Il recente restauro ha rivelato tracce di azzurrite e lapislazzulo che suggeriscono un\'intenzione cromatica mai realizzata.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Tondo Doni
    {
      id: iTondoDoniEl,
      artworkId: artTondoDoni,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Tondo Doni',
        screenText: 'Questo dipinto rotondo — chiamato "tondo" — raffigura la Sacra Famiglia: Maria, Giuseppe e il piccolo Gesù.\nÈ l\'unico dipinto su tavola di Michelangelo conservato fino a oggi.\nEssendo famoso come scultore, Michelangelo dipinge le figure come se fossero scolpite, con i muscoli molto evidenti.\nNella cornice originale in legno dorato si trovano cinque teste intagliate di profeti o divinità.',
        ttsText: 'Questo dipinto rotondo, chiamato tondo, raffigura la Sacra Famiglia: Maria, Giuseppe e il piccolo Gesù. È l\'unico dipinto su tavola di Michelangelo conservato fino a oggi. Essendo famoso come scultore, Michelangelo dipinge le figure come se fossero scolpite, con i muscoli molto evidenti. Nella cornice originale in legno dorato si trovano cinque teste intagliate di profeti o divinità.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iTondoDoniAv,
      artworkId: artTondoDoni,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Tondo Doni — lettura critica',
        screenText: 'Il Tondo Doni (1504-1506) fu commissionato da Agnolo Doni in occasione delle nozze con Maddalena Strozzi.\nÈ la sola tavola di Michelangelo pervenuta integra; il confronto con la produzione scultorea è rivelatorio: il disegno potente preannuncia la Cappella Sistina.\nLa composizione a piramide dinamica e le figure in torsione (contrapposto) influenzeranno profondamente il Manierismo fiorentino.\nNello sfondo, ignudi in posa classica rimandano alla cultura antiquaria del momento; il San Giovannino funge da raccordo tipologico tra pagano e cristiano.',
        ttsText: 'Il Tondo Doni, databile tra il 1504 e il 1506, fu commissionato da Agnolo Doni in occasione delle nozze con Maddalena Strozzi. È la sola tavola di Michelangelo pervenuta integra; il confronto con la produzione scultorea è rivelatorio: il disegno potente preannuncia la Cappella Sistina. La composizione a piramide dinamica e le figure in torsione influenzeranno profondamente il Manierismo fiorentino.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Madonna del Cardellino
    {
      id: iMadonnaEl,
      artworkId: artMadonna,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Madonna del Cardellino',
        screenText: 'In questo quadro vediamo la Madonna con due bambini: Gesù e San Giovannino, il futuro Giovanni Battista.\nIl nome "del Cardellino" viene dal piccolo uccellino che Giovanni tiene in mano e mostra a Gesù.\nRaffaello ha dipinto tutto con grande dolcezza: i visi, i gesti, e il paesaggio aperto sullo sfondo.\nÈ considerato uno dei quadri più belli e teneri di tutto il Rinascimento.',
        ttsText: 'In questo quadro vediamo la Madonna con due bambini: Gesù e San Giovannino, il futuro Giovanni Battista. Il nome del Cardellino viene dal piccolo uccellino che Giovanni tiene in mano e mostra a Gesù. Raffaello ha dipinto tutto con grande dolcezza: i visi, i gesti, e il paesaggio aperto sullo sfondo. È considerato uno dei quadri più belli e teneri di tutto il Rinascimento.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMadonnaAv,
      artworkId: artMadonna,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Madonna del Cardellino — lettura critica',
        screenText: 'La Madonna del Cardellino (1505-1506) testimonia il periodo fiorentino di Raffaello, in cui il pittore assimilò e superò le lezioni di Leonardo e Fra\' Bartolommeo.\nLa composizione piramidale raggiunge un equilibrio più sereno e classico rispetto ai modelli leonardeschi.\nIl cardellino ha valenza simbolica: allude alla Passione di Cristo attraverso la leggenda che si sia macchiato di sangue toccando la corona di spine.\nL\'opera fu gravemente danneggiata dal crollo del palazzo Nasi nel 1547 e restaurata da Ridolfo Ghirlandaio; le crepe visibili testimoniano quel restauro cinquecentesco.',
        ttsText: 'La Madonna del Cardellino, databile al 1505-1506, testimonia il periodo fiorentino di Raffaello, in cui il pittore assimilò e superò le lezioni di Leonardo. La composizione piramidale raggiunge un equilibrio più sereno e classico. Il cardellino ha valenza simbolica: allude alla Passione di Cristo attraverso la leggenda che si sia macchiato di sangue toccando la corona di spine. L\'opera fu gravemente danneggiata dal crollo del palazzo Nasi nel 1547 e restaurata da Ridolfo Ghirlandaio.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Ritratto di Leone X
    {
      id: iLeoneXEl,
      artworkId: artLeoneX,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Ritratto di Leone X',
        screenText: 'Questo ritratto mostra Papa Leone X dei Medici seduto al centro, con due cardinali ai lati.\nIl papa sta esaminando un manoscritto con una lente di ingrandimento — era miope e amava i libri antichi.\nRaffaello rende la personalità di ognuno: il papa sicuro di sé, i cardinali pensierosi.\nSul tavolo si vede anche una campanella d\'argento usata per chiamare i servitori.',
        ttsText: 'Questo ritratto mostra Papa Leone X dei Medici seduto al centro, con due cardinali ai lati. Il papa sta esaminando un manoscritto con una lente di ingrandimento, perché era miope e amava i libri antichi. Raffaello rende la personalità di ognuno: il papa sicuro di sé, i cardinali pensierosi. Sul tavolo si vede anche una campanella d\'argento usata per chiamare i servitori.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iLeoneXAv,
      artworkId: artLeoneX,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Ritratto di Leone X — lettura critica',
        screenText: 'Il Ritratto di Leone X con i cardinali Giulio de\' Medici e Luigi de\' Rossi (1517-1518) segna un punto di svolta nella storia del ritratto di corte.\nRaffaello introduce una spazialità tridimensionale e una caratterizzazione psicologica di rara intensità: ogni personaggio ha una presenza individuale e un rapporto narrativo con gli altri.\nIl manoscritto miniato — identificato con le Ore di Amedeo VIII di Savoia — e la lente riflettono la cultura umanista di Leone X.\nLa superficie in velluto rosso è un esercizio di bravura pittorica che influenzerà la ritrattistica veneziana per decenni.',
        ttsText: 'Il Ritratto di Leone X con i cardinali Giulio de Medici e Luigi de Rossi, datato al 1517-1518, segna un punto di svolta nella storia del ritratto di corte. Raffaello introduce una spazialità tridimensionale e una caratterizzazione psicologica di rara intensità. Il manoscritto miniato e la lente riflettono la cultura umanista di Leone X. La superficie in velluto rosso è un esercizio di bravura pittorica che influenzerà la ritrattistica veneziana per decenni.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Venere di Urbino
    {
      id: iVenereUrbinoEl,
      artworkId: artVenereUrbino,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Venere di Urbino',
        screenText: 'Questo dipinto mostra una donna distesa su un letto bianco che guarda direttamente verso di noi.\nTiziano l\'ha chiamata "Venere" — la dea della bellezza — ma probabilmente era il ritratto di una nobildonna veneziana.\nSullo sfondo, due serve stanno cercando qualcosa in un grande cassettone.\nIl quadro colpisce per i colori caldi e per lo sguardo diretto e sicuro della donna.',
        ttsText: 'Questo dipinto mostra una donna distesa su un letto bianco che guarda direttamente verso di noi. Tiziano la ha chiamata Venere, la dea della bellezza, ma probabilmente era il ritratto di una nobildonna veneziana. Sullo sfondo, due serve stanno cercando qualcosa in un grande cassettone. Il quadro colpisce per i colori caldi e per lo sguardo diretto e sicuro della donna.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereUrbinoAv,
      artworkId: artVenereUrbino,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Venere di Urbino — lettura critica',
        screenText: 'La Venere di Urbino (1538) fu commissionata da Guidobaldo della Rovere, duca di Camerino, probabilmente in occasione del matrimonio.\nTiziano trasforma il modello della Venere dormiente di Giorgione in una figura sveglia e consapevole dello sguardo: l\'erotismo è esplicito e diretto, non mediato dal pretesto mitologico.\nIl cagnolino — simbolo di fedeltà coniugale — e le serve al cassettone spostano la lettura verso il ritratto nuziale.\nManet si riferì esplicitamente a quest\'opera per la sua Olympia (1865), innescando uno dei più celebri scandali della pittura moderna.',
        ttsText: 'La Venere di Urbino, dipinta nel 1538, fu commissionata da Guidobaldo della Rovere probabilmente in occasione del matrimonio. Tiziano trasforma il modello della Venere dormiente di Giorgione in una figura sveglia e consapevole dello sguardo: l\'erotismo è diretto. Il cagnolino, simbolo di fedeltà coniugale, e le serve al cassettone spostano la lettura verso il ritratto nuziale. Manet si riferì esplicitamente a quest\'opera per la sua Olympia del 1865.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Flora
    {
      id: iFloraEl,
      artworkId: artFlora,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Flora',
        screenText: 'Questo ritratto mostra una giovane donna che tiene in mano un mazzo di fiori e ne offre alcuni a chi guarda.\nViene chiamata "Flora" perché nella mitologia è la dea della primavera e dei fiori.\nTiziano l\'ha dipinta con abiti che scivolano dalla spalla in modo molto elegante.\nI colori caldi e morbidi sono tipici dello stile della pittura veneziana del Cinquecento.',
        ttsText: 'Questo ritratto mostra una giovane donna che tiene in mano un mazzo di fiori e ne offre alcuni a chi guarda. Viene chiamata Flora perché nella mitologia è la dea della primavera e dei fiori. Tiziano la ha dipinta con abiti che scivolano dalla spalla in modo molto elegante. I colori caldi e morbidi sono tipici dello stile della pittura veneziana del Cinquecento.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iFloraAv,
      artworkId: artFlora,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Flora — lettura critica',
        screenText: 'Flora (1515-1520) appartiene alla serie di ritratti di "belle donne" che Tiziano realizzò nella sua maturità veneziana.\nL\'identificazione con Flora, dea della primavera, rimane ipotetica: il gesto di offrire fiori e il peplo svolazzante suggeriscono il riferimento mitologico, ma l\'opera oscilla tra ritratto idealizzato e figura allegorica.\nLa tecnica è emblematica della scuola veneziana: nessun disegno sottostante, costruzione per velature cromatiche successive, superficie vibrante che dissolve i contorni.\nL\'opera influenzò la tradizione del ritratto di corte nordeuropeo, in particolare attraverso incisioni che ne diffusero il modello.',
        ttsText: 'Flora, dipinta tra il 1515 e il 1520, appartiene alla serie di ritratti di belle donne che Tiziano realizzò nella sua maturità veneziana. L\'identificazione con Flora, dea della primavera, rimane ipotetica: il gesto di offrire fiori suggerisce il riferimento mitologico, ma l\'opera oscilla tra ritratto idealizzato e figura allegorica. La tecnica è emblematica della scuola veneziana: costruzione per velature cromatiche successive, superficie vibrante che dissolve i contorni. L\'opera influenzò la tradizione del ritratto di corte nordeuropeo.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Medusa
    {
      id: iMedusaEl,
      artworkId: artMedusa,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Medusa',
        screenText: 'Questa è la testa di Medusa, il mostro della mitologia greca con i capelli fatti di serpenti.\nChiunque la guardasse si trasformava in pietra — solo Perseo riuscì a sconfiggerla usando uno scudo come specchio.\nCaravaggio ha dipinto questa testa su uno scudo vero, di forma convessa, come fosse una scultura.\nL\'espressione di terrore è così realistica che colpisce ancora oggi i visitatori.',
        ttsText: 'Questa è la testa di Medusa, il mostro della mitologia greca con i capelli fatti di serpenti. Chiunque la guardasse si trasformava in pietra, solo Perseo riuscì a sconfiggerla usando uno scudo come specchio. Caravaggio ha dipinto questa testa su uno scudo vero, di forma convessa, come fosse una scultura. L\'espressione di terrore è così realistica che colpisce ancora oggi i visitatori.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaAv,
      artworkId: artMedusa,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Medusa — lettura critica',
        screenText: 'La Medusa (1597) fu dipinta su uno scudo convesso di pelle di cavallo teso su legno — un oggetto d\'uso reale trasformato in opera d\'arte e dono diplomatico.\nIl Cardinale Del Monte la donò a Ferdinando I de\' Medici; Caravaggio ne realizzò due versioni, quella degli Uffizi è la seconda e più rifinita.\nIl soggetto consente all\'artista di esplorare il tema della mimesi estrema: la testa recisa è autorappresentazione dell\'artista, iconografia che ritorna nella Davide e Golia della Galleria Borghese.\nLa forma convessa accentua l\'effetto illusionistico: lo spettatore è idealmente incluso nello spazio della decapitazione.',
        ttsText: 'La Medusa, dipinta nel 1597, fu realizzata su uno scudo convesso di pelle di cavallo come dono diplomatico per Ferdinando I de Medici. Caravaggio ne realizzò due versioni; quella degli Uffizi è la seconda e più rifinita. La testa recisa è autorappresentazione dell\'artista, iconografia che ritorna nella Davide e Golia della Galleria Borghese. La forma convessa accentua l\'effetto illusionistico: lo spettatore è idealmente incluso nello spazio della decapitazione.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaIn,
      artworkId: artMedusa,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'infantile' },
      content: {
        title: 'Medusa — per i più piccoli',
        screenText: 'Aiuto, un mostro con i serpenti al posto dei capelli!\nÈ Medusa, una creatura delle storie greche antiche.\nNon avere paura: è solo dipinta sopra uno scudo rotondo, come quelli dei cavalieri.',
        ttsText: 'Aiuto, un mostro con i serpenti al posto dei capelli! È Medusa, una creatura delle storie greche antiche. Non avere paura: è solo dipinta sopra uno scudo rotondo, come quelli dei cavalieri.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaMd,
      artworkId: artMedusa,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Medusa — racconto',
        screenText: 'Nel mito greco chi incrociava lo sguardo di Medusa veniva pietrificato; Perseo la vinse guardandola riflessa nel proprio scudo.\nCaravaggio gioca proprio su questo: dipinge la testa mozzata sulla superficie convessa di uno scudo da parata vero.\nIl sangue sgorga ancora e la bocca è spalancata in un grido: l\'attimo scelto è quello tra la vita e la morte.\nLo scudo fu donato dal cardinal Del Monte a Ferdinando I de\' Medici per l\'armeria di famiglia, dove stupiva gli ospiti come una meraviglia.',
        ttsText: 'Nel mito greco chi incrociava lo sguardo di Medusa veniva pietrificato; Perseo la vinse guardandola riflessa nel proprio scudo. Caravaggio gioca proprio su questo: dipinge la testa mozzata sulla superficie convessa di uno scudo da parata vero. Il sangue sgorga ancora e la bocca è spalancata in un grido: l\'attimo scelto è quello tra la vita e la morte. Lo scudo fu donato dal cardinal Del Monte a Ferdinando primo de\' Medici per l\'armeria di famiglia, dove stupiva gli ospiti come una meraviglia.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaSp,
      artworkId: artMedusa,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'specialistico' },
      content: {
        title: 'Medusa — scheda specialistica',
        screenText: 'La rotella da parata (Ø 60 cm circa, olio su tela incollata su legno di pioppo) giunse a Firenze nel 1598 come dono del cardinal Francesco Maria Del Monte al granduca Ferdinando I.\nLa cosiddetta "Medusa Murtola" (collezione privata, autenticata 2002) precede la versione uffiziana; le indagini radiografiche mostrano nella seconda una messa a punto compositiva, non una replica meccanica.\nIl cartiglio seicentesco dell\'inventario mediceo la registrava montata su un\'armatura persiana donata dallo scià Abbas I: contesto di Wunderkammer che ne condizionò la ricezione.\nLa critica (Marini, Gregori) vi legge la traduzione caravaggesca del paragone tra pittura e scultura: la convessità reale del supporto genera l\'illusione concava del volto, secondo il principio ottico già leonardesco.\nL\'urlo è studiato dal vero con ogni probabilità su modello maschile, come suggerisce la fisiognomica; l\'identificazione con un autoritratto resta ipotesi non documentata.',
        ttsText: 'La rotella da parata, olio su tela incollata su legno di pioppo, giunse a Firenze nel 1598 come dono del cardinal Del Monte al granduca Ferdinando primo. La cosiddetta Medusa Murtola precede la versione degli Uffizi; le indagini radiografiche mostrano nella seconda una messa a punto compositiva, non una replica meccanica. L\'inventario mediceo la registrava montata su un\'armatura persiana donata dallo scià Abbas primo: un contesto da camera delle meraviglie che ne condizionò la ricezione. La critica vi legge la traduzione caravaggesca del paragone tra pittura e scultura: la convessità reale del supporto genera l\'illusione concava del volto. L\'urlo è studiato dal vero con ogni probabilità su modello maschile; l\'identificazione con un autoritratto resta ipotesi non documentata.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Sacrificio di Isacco
    {
      id: iSacrifEl,
      artworkId: artSacrificio,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Sacrificio di Isacco',
        screenText: 'Il dipinto racconta una storia della Bibbia: Dio chiede ad Abramo di sacrificare il figlio Isacco per mettere alla prova la sua fede.\nNel momento preciso in cui Abramo sta per farlo, un angelo appare e lo ferma.\nCaravaggio mostra questo momento drammatico con luci molto forti e ombre profonde, tipiche del suo stile.\nLe espressioni dei personaggi — il terrore di Isacco, la determinazione di Abramo — sono straordinariamente reali.',
        ttsText: 'Il dipinto racconta una storia della Bibbia: Dio chiede ad Abramo di sacrificare il figlio Isacco per mettere alla prova la sua fede. Nel momento preciso in cui Abramo sta per farlo, un angelo appare e lo ferma. Caravaggio mostra questo momento drammatico con luci molto forti e ombre profonde, tipiche del suo stile. Le espressioni dei personaggi, il terrore di Isacco e la determinazione di Abramo, sono straordinariamente reali.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iSacrifAv,
      artworkId: artSacrificio,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Sacrificio di Isacco — lettura critica',
        screenText: 'Il Sacrificio di Isacco (1601-1602) è una delle opere della maturità romana di Caravaggio, commissionata dal Cardinale Maffeo Barberini, futuro Papa Urbano VIII.\nRispetto alla versione precedente (Uffizi, 1594-1596), la composizione è più matura: il triangolo dinamico Abramo-Isacco-ariete esalta la tensione narrativa.\nIl tenebrismo caravaggesco è qui al massimo dell\'efficacia: la luce radente dall\'alto sinistro modella i volumi come in un bassorilievo e separa psicologicamente i piani della scena.\nL\'angelo che blocca il braccio di Abramo è tra le figure più eleganti dell\'intera produzione di Caravaggio.',
        ttsText: 'Il Sacrificio di Isacco, databile al 1601-1602, fu commissionato dal Cardinale Maffeo Barberini, futuro Papa Urbano VIII. Il triangolo dinamico Abramo-Isacco-ariete esalta la tensione narrativa rispetto alla versione precedente. Il tenebrismo caravaggesco è qui al massimo dell\'efficacia: la luce radente modella i volumi come in un bassorilievo e separa psicologicamente i piani della scena. L\'angelo che blocca il braccio di Abramo è tra le figure più eleganti dell\'intera produzione di Caravaggio.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Giuditta e Oloferne
    {
      id: iGiudittaEl,
      artworkId: artGiuditta,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Giuditta e Oloferne',
        screenText: 'Questo dipinto mostra Giuditta, una coraggiosa eroina biblica, mentre decapita il generale nemico Oloferne.\nGiuditta era una vedova che salvò la sua città infiltrandosi nell\'accampamento del nemico assiro.\nArtemisia Gentileschi era una donna pittrice — cosa rarissima nel Seicento — e ha dipinto questa scena con grande forza.\nA destra c\'è la fedele serva di Giuditta che regge il sacco per raccogliere la testa.',
        ttsText: 'Questo dipinto mostra Giuditta, una coraggiosa eroina biblica, mentre decapita il generale nemico Oloferne. Giuditta era una vedova che salvò la sua città infiltrandosi nell\'accampamento del nemico assiro. Artemisia Gentileschi era una donna pittrice, cosa rarissima nel Seicento, e ha dipinto questa scena con grande forza. A destra c\'è la fedele serva di Giuditta che regge il sacco per raccogliere la testa.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaAv,
      artworkId: artGiuditta,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Giuditta e Oloferne — lettura critica',
        screenText: 'La Giuditta e Oloferne (1620-1621) di Artemisia Gentileschi è il suo capolavoro maturo, superiore alla versione di Capodimonte (1612-1613) per forza compositiva e coerenza cromatica.\nArtemisia fu la prima donna ammessa all\'Accademia del Disegno di Firenze (1616); questa opera riflette la piena padronanza del linguaggio caravaggesco — assorbito tramite il padre Orazio — rielaborato con un taglio più mosso e gestualità più energica.\nLa lettura autobiografica (il processo per lo stupro subito da Agostino Tassi, 1612) è spesso evocata, ma gli storici più recenti invitano a non ridurre l\'opera a trauma personale.\nIl contrasto tra la determinazione fisica di Giuditta e la passività di Oloferne costruisce un\'inversione di genere potente e programmatica.',
        ttsText: 'La Giuditta e Oloferne di Artemisia Gentileschi, databile al 1620-1621, è il suo capolavoro maturo. Artemisia fu la prima donna ammessa all\'Accademia del Disegno di Firenze nel 1616; l\'opera riflette la piena padronanza del linguaggio caravaggesco rielaborato con una gestualità più energica. La lettura autobiografica è spesso evocata, ma gli storici più recenti invitano a non ridurre l\'opera a trauma personale. Il contrasto tra la determinazione di Giuditta e la passività di Oloferne costruisce un\'inversione di genere potente.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaIn,
      artworkId: artGiuditta,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'infantile' },
      content: {
        title: 'Giuditta e Oloferne — per i più piccoli',
        screenText: 'Questa è la storia di Giuditta, un\'eroina coraggiosissima.\nPer salvare la sua città sconfisse un generale cattivo, aiutata dalla sua amica fedele.\nL\'ha dipinta Artemisia, una delle prime donne pittrici famose: anche lei era molto coraggiosa!',
        ttsText: 'Questa è la storia di Giuditta, un\'eroina coraggiosissima. Per salvare la sua città sconfisse un generale cattivo, aiutata dalla sua amica fedele. L\'ha dipinta Artemisia, una delle prime donne pittrici famose: anche lei era molto coraggiosa!',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaMd,
      artworkId: artGiuditta,
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Giuditta e Oloferne — racconto',
        screenText: 'L\'episodio viene dal Libro di Giuditta: la vedova ebrea entra nell\'accampamento assiro e decapita il generale Oloferne, liberando la città di Betulia.\nArtemisia Gentileschi sceglie il momento più crudo e lo illumina come una scena di teatro, con la tecnica dei forti contrasti imparata da Caravaggio.\nA differenza di molti colleghi uomini, dipinge le due donne come complici forti e determinate, impegnate in uno sforzo fisico reale.\nIl sangue che schizza sulle lenzuola scandalizzò i contemporanei: per secoli il quadro rimase appeso in angoli poco visibili.',
        ttsText: 'L\'episodio viene dal Libro di Giuditta: la vedova ebrea entra nell\'accampamento assiro e decapita il generale Oloferne, liberando la città di Betulia. Artemisia Gentileschi sceglie il momento più crudo e lo illumina come una scena di teatro, con la tecnica dei forti contrasti imparata da Caravaggio. A differenza di molti colleghi uomini, dipinge le due donne come complici forti e determinate, impegnate in uno sforzo fisico reale. Il sangue che schizza sulle lenzuola scandalizzò i contemporanei: per secoli il quadro rimase appeso in angoli poco visibili.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaSp,
      artworkId: artGiuditta,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'specialistico' },
      content: {
        title: 'Giuditta e Oloferne — scheda specialistica',
        screenText: 'La tela (146,5 × 108 cm) è la seconda redazione del soggetto, successiva alla versione di Capodimonte (1612-13 circa) e databile al soggiorno fiorentino grazie alla nota di pagamento granducale del 1620.\nLa radiografia ha rivelato varianti significative rispetto alla prima versione: il braccio destro di Giuditta ruotato per accentuare la leva del gesto e l\'aggiunta del bracciale con Diana, letto come firma iconografica dell\'artista.\nLa struttura compositiva a croce obliqua concentra i tre corpi nel primo piano, senza sfondo architettonico: soluzione che radicalizza il modello caravaggesco della Giuditta Costa.\nLa provenienza è ricostruita dagli inventari medicei: registrata a Palazzo Pitti nel 1637, migrò agli Uffizi solo nel 1774, esposta con riluttanza per la crudezza del soggetto.\nLa bibliografia recente (Garrard, Locker, Barker) ha spostato il fuoco dalla biografia processuale all\'autocoscienza professionale di Artemisia, documentata dal carteggio con i committenti.',
        ttsText: 'La tela è la seconda redazione del soggetto, successiva alla versione di Capodimonte e databile al soggiorno fiorentino grazie alla nota di pagamento granducale del 1620. La radiografia ha rivelato varianti significative: il braccio destro di Giuditta ruotato per accentuare la leva del gesto e l\'aggiunta del bracciale con Diana, letto come firma iconografica dell\'artista. La struttura compositiva a croce obliqua concentra i tre corpi nel primo piano, senza sfondo architettonico. La provenienza è ricostruita dagli inventari medicei: registrata a Palazzo Pitti nel 1637, migrò agli Uffizi solo nel 1774, esposta con riluttanza per la crudezza del soggetto. La bibliografia recente ha spostato il fuoco dalla biografia processuale all\'autocoscienza professionale di Artemisia.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // ── Seconda durata per registro, sulle 4 opere vetrina ─────────────────
    // Gli item qui sotto non aggiungono registri: aggiungono *durate* a
    // registri già coperti. Sono la ragione per cui "dimmi di più" e "troppo
    // semplice" non finiscono sullo stesso contenuto.

    // La nascita di Venere — (medio, 4min) è già iVenereMd2, sopra.
    {
      id: iVenereEl2m,
      artworkId: artVenere,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La nascita di Venere — racconto guidato',
        screenText: 'Venere, la dea della bellezza, è appena nata dalla schiuma del mare e arriva a riva su una conchiglia gigante.\nA sinistra vedi due figure che volano abbracciate: sono Zefiro, il vento di primavera, e la ninfa Aura. Soffiando insieme spingono la conchiglia verso la spiaggia, e dalle loro bocche escono anche delle rose.\nA destra una ragazza corre incontro a Venere con un mantello pieno di fiori per coprirla: è una delle Ore, le divinità che governano le stagioni.\nGuarda i capelli di Venere: Botticelli li ha dipinti lunghi e mossi dal vento, e in alcuni punti ha usato oro vero, perché brillassero alla luce delle candele.',
        ttsText: 'Venere, la dea della bellezza, è appena nata dalla schiuma del mare e arriva a riva su una conchiglia gigante. A sinistra vedi due figure che volano abbracciate: sono Zefiro, il vento di primavera, e la ninfa Aura. Soffiando insieme spingono la conchiglia verso la spiaggia, e dalle loro bocche escono anche delle rose. A destra una ragazza corre incontro a Venere con un mantello pieno di fiori per coprirla: è una delle Ore, le divinità che governano le stagioni. Guarda i capelli di Venere: Botticelli li ha dipinti lunghi e mossi dal vento, e in alcuni punti ha usato oro vero, perché brillassero alla luce delle candele.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereEl4m,
      artworkId: artVenere,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La nascita di Venere — visita approfondita',
        screenText: 'Sei davanti a uno dei quadri più famosi del mondo, e vale la pena guardarlo con calma.\nAl centro c\'è Venere, la dea della bellezza. Secondo il mito non è nata da una madre: è nata dalla schiuma del mare, già adulta. Botticelli la mostra proprio nell\'istante in cui la sua conchiglia tocca la riva.\nA sinistra due figure volano abbracciate. Quello con le guance gonfie è Zefiro, il vento tiepido di primavera; con lui c\'è la ninfa Aura. Soffiano insieme, e il loro fiato è disegnato come tante linee dorate che attraversano il quadro. Dalle loro bocche escono rose, che è il fiore sacro a Venere.\nA destra una giovane donna corre incontro alla dea con un mantello ricamato di fiori. È una delle Ore, le divinità che si occupano delle stagioni: sta per coprire Venere, come si fa con qualcuno appena arrivato dal freddo.\nAdesso guarda il mare. Botticelli non ha provato a dipingerlo realistico: sono tante piccole "V" bianche ripetute, come i segni che farebbe un bambino. Non è un errore, è una scelta: al pittore interessava il ritmo del disegno, non l\'imitazione della realtà.\nUn\'ultima cosa da cercare: i capelli di Venere e le ali di Zefiro hanno dentro dell\'oro vero, steso a pennello. Nella penombra delle sale del Quattrocento, illuminate da candele, quei dettagli si accendevano davvero.',
        ttsText: 'Sei davanti a uno dei quadri più famosi del mondo, e vale la pena guardarlo con calma. Al centro c\'è Venere, la dea della bellezza. Secondo il mito non è nata da una madre: è nata dalla schiuma del mare, già adulta. Botticelli la mostra proprio nell\'istante in cui la sua conchiglia tocca la riva. A sinistra due figure volano abbracciate. Quello con le guance gonfie è Zefiro, il vento tiepido di primavera; con lui c\'è la ninfa Aura. Soffiano insieme, e il loro fiato è disegnato come tante linee dorate che attraversano il quadro. Dalle loro bocche escono rose, che è il fiore sacro a Venere. A destra una giovane donna corre incontro alla dea con un mantello ricamato di fiori. È una delle Ore, le divinità che si occupano delle stagioni: sta per coprire Venere, come si fa con qualcuno appena arrivato dal freddo. Adesso guarda il mare. Botticelli non ha provato a dipingerlo realistico: sono tante piccole vu bianche ripetute, come i segni che farebbe un bambino. Non è un errore, è una scelta: al pittore interessava il ritmo del disegno, non l\'imitazione della realtà. Un\'ultima cosa da cercare: i capelli di Venere e le ali di Zefiro hanno dentro dell\'oro vero, steso a pennello. Nella penombra delle sale del Quattrocento, illuminate da candele, quei dettagli si accendevano davvero.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iVenereMd2m,
      artworkId: artVenere,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La nascita di Venere — racconto esteso',
        screenText: 'Dipinta a tempera su tela tra il 1484 e il 1486, la tavola nasce in ambiente mediceo, probabilmente per una villa di campagna: il grande formato su tela, leggero e trasportabile, era il supporto tipico della decorazione suburbana.\nIl soggetto è l\'approdo di Venere Anadiomene, la dea "nata dalle acque". A sinistra Zefiro e Aura ne sospingono la conchiglia; a destra un\'Ora le porge un manto fiorito.\nLa posa riprende il tipo statuario della Venere pudica, che Botticelli poteva studiare nella collezione medicea: una citazione dall\'antico, reinterpretata con proporzioni allungate e un contorno nitido, quasi disegnato.\nÈ un\'immagine pagana in una Firenze cristiana, e non era una provocazione: nella cultura neoplatonica del circolo di Marsilio Ficino la bellezza di Venere era letta come un gradino verso la bellezza divina.',
        ttsText: 'Dipinta a tempera su tela tra il 1484 e il 1486, la tavola nasce in ambiente mediceo, probabilmente per una villa di campagna: il grande formato su tela, leggero e trasportabile, era il supporto tipico della decorazione suburbana. Il soggetto è l\'approdo di Venere Anadiomene, la dea nata dalle acque. A sinistra Zefiro e Aura ne sospingono la conchiglia; a destra un\'Ora le porge un manto fiorito. La posa riprende il tipo statuario della Venere pudica, che Botticelli poteva studiare nella collezione medicea: una citazione dall\'antico, reinterpretata con proporzioni allungate e un contorno nitido, quasi disegnato. È un\'immagine pagana in una Firenze cristiana, e non era una provocazione: nella cultura neoplatonica del circolo di Marsilio Ficino la bellezza di Venere era letta come un gradino verso la bellezza divina.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iVenereAv2m,
      artworkId: artVenere,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'La nascita di Venere — lettura critica in breve',
        screenText: 'Tre nodi critici, in sintesi.\nIl primo è la fonte: l\'Anadiomene di Apelle descritta da Plinio, filtrata dagli Inni omerici e, secondo una lettura ancora discussa, dalle Stanze di Poliziano.\nIl secondo è la tecnica: tempera magra su tela, con velature di verde terra nelle carni e oro in conchiglia — una scelta che privilegia la luminosità sul rilievo, in aperta divergenza dalla ricerca volumetrica coeva.\nIl terzo è l\'antinaturalismo consapevole: la torsione del collo è anatomicamente impossibile, la spalla sinistra cade oltre il verosimile. Botticelli non sbaglia, subordina l\'anatomia alla linea.',
        ttsText: 'Tre nodi critici, in sintesi. Il primo è la fonte: l\'Anadiomene di Apelle descritta da Plinio, filtrata dagli Inni omerici e, secondo una lettura ancora discussa, dalle Stanze di Poliziano. Il secondo è la tecnica: tempera magra su tela, con velature di verde terra nelle carni e oro in conchiglia, una scelta che privilegia la luminosità sul rilievo, in aperta divergenza dalla ricerca volumetrica coeva. Il terzo è l\'antinaturalismo consapevole: la torsione del collo è anatomicamente impossibile, la spalla sinistra cade oltre il verosimile. Botticelli non sbaglia, subordina l\'anatomia alla linea.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },

    // La Primavera
    {
      id: iPrimaveraEl2m,
      artworkId: artPrimavera,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La Primavera — racconto guidato',
        screenText: 'Guarda il quadro da destra verso sinistra, come si legge una storia.\nA destra un uomo azzurro con le guance gonfie afferra una ragazza: è Zefiro, il vento, e lei è la ninfa Cloris. Subito accanto la vedi trasformata: è diventata Flora, la dea dei fiori, e ne sparge a piene mani.\nAl centro, un po\' più indietro delle altre figure, c\'è Venere. Sopra di lei vola Cupido con gli occhi bendati e una freccia accesa.\nA sinistra tre ragazze danzano tenendosi per mano: sono le Grazie. E all\'estremo bordo Mercurio, con il bastone, allontana le nuvole per tenere lontano il brutto tempo.\nSotto i loro piedi ci sono più di cinquecento piante dipinte una per una, e quasi duecento specie diverse davvero riconoscibili.',
        ttsText: 'Guarda il quadro da destra verso sinistra, come si legge una storia. A destra un uomo azzurro con le guance gonfie afferra una ragazza: è Zefiro, il vento, e lei è la ninfa Cloris. Subito accanto la vedi trasformata: è diventata Flora, la dea dei fiori, e ne sparge a piene mani. Al centro, un po\' più indietro delle altre figure, c\'è Venere. Sopra di lei vola Cupido con gli occhi bendati e una freccia accesa. A sinistra tre ragazze danzano tenendosi per mano: sono le Grazie. E all\'estremo bordo Mercurio, con il bastone, allontana le nuvole per tenere lontano il brutto tempo. Sotto i loro piedi ci sono più di cinquecento piante dipinte una per una, e quasi duecento specie diverse davvero riconoscibili.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraEl4m,
      artworkId: artPrimavera,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'La Primavera — visita approfondita',
        screenText: 'Questo quadro non racconta una storia sola: ne mette insieme diverse, tutte legate all\'arrivo della primavera. Conviene guardarlo da destra a sinistra.\nAll\'estrema destra un uomo dalla pelle azzurra esce dagli alberi e afferra una ragazza. Lui è Zefiro, il vento tiepido che porta la bella stagione; lei è la ninfa Cloris, e dalla sua bocca escono dei fiori. Un passo più a sinistra la ritrovi trasformata: ora è Flora, la dea della primavera, con un vestito coperto di fiori che sparge sul prato. È la stessa persona in due momenti diversi, dipinta due volte.\nAl centro c\'è Venere. Botticelli l\'ha messa leggermente più indietro delle altre figure, e gli alberi dietro di lei si aprono in un arco, quasi una cornice: è il suo giardino, e lei ne è la padrona di casa. Sopra di lei vola suo figlio Cupido, con gli occhi bendati, e punta una freccia verso le tre ragazze a sinistra.\nQuelle tre sono le Grazie, e danzano in cerchio tenendosi per mano. Guarda i loro veli: sono così sottili che si vede attraverso. Botticelli era famoso proprio per questo.\nAll\'estrema sinistra, l\'ultimo personaggio è Mercurio, riconoscibile dai sandali alati e dal bastone con i serpenti. Non guarda gli altri: alza il bastone verso l\'alto e allontana le poche nuvole rimaste, per proteggere il giardino.\nInfine guarda in basso. Il prato non è un fondo generico: sono state contate più di cinquecento piante dipinte una a una, di quasi duecento specie diverse, molte delle quali fiorivano davvero nella campagna fiorentina tra marzo e maggio.',
        ttsText: 'Questo quadro non racconta una storia sola: ne mette insieme diverse, tutte legate all\'arrivo della primavera. Conviene guardarlo da destra a sinistra. All\'estrema destra un uomo dalla pelle azzurra esce dagli alberi e afferra una ragazza. Lui è Zefiro, il vento tiepido che porta la bella stagione; lei è la ninfa Cloris, e dalla sua bocca escono dei fiori. Un passo più a sinistra la ritrovi trasformata: ora è Flora, la dea della primavera, con un vestito coperto di fiori che sparge sul prato. È la stessa persona in due momenti diversi, dipinta due volte. Al centro c\'è Venere. Botticelli l\'ha messa leggermente più indietro delle altre figure, e gli alberi dietro di lei si aprono in un arco, quasi una cornice: è il suo giardino, e lei ne è la padrona di casa. Sopra di lei vola suo figlio Cupido, con gli occhi bendati, e punta una freccia verso le tre ragazze a sinistra. Quelle tre sono le Grazie, e danzano in cerchio tenendosi per mano. Guarda i loro veli: sono così sottili che si vede attraverso. Botticelli era famoso proprio per questo. All\'estrema sinistra, l\'ultimo personaggio è Mercurio, riconoscibile dai sandali alati e dal bastone con i serpenti. Non guarda gli altri: alza il bastone verso l\'alto e allontana le poche nuvole rimaste, per proteggere il giardino. Infine guarda in basso. Il prato non è un fondo generico: sono state contate più di cinquecento piante dipinte una a una, di quasi duecento specie diverse, molte delle quali fiorivano davvero nella campagna fiorentina tra marzo e maggio.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iPrimaveraMd2m,
      artworkId: artPrimavera,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La Primavera — racconto esteso',
        screenText: 'La lettura corrente procede da destra a sinistra e segue le Fasti di Ovidio: Zefiro rapisce Cloris, che nell\'unione si trasforma in Flora, dea della fioritura. Le due figure contigue sono dunque un\'unica narrazione in due tempi.\nVenere presiede il boschetto da una posizione arretrata, inquadrata dall\'arco degli alberi; Cupido bendato scocca verso le Grazie, il cui girotondo è stato letto come figurazione delle tre fasi del dono: dare, ricevere, restituire.\nMercurio, all\'estremità sinistra, dissipa le nubi con il caduceo: è il custode del giardino, non un partecipante.\nL\'insieme non illustra un testo unico ma compone un discorso sull\'amore e sulla fecondità, coerente con la cultura neoplatonica del circolo mediceo per cui il quadro fu quasi certamente eseguito.',
        ttsText: 'La lettura corrente procede da destra a sinistra e segue i Fasti di Ovidio: Zefiro rapisce Cloris, che nell\'unione si trasforma in Flora, dea della fioritura. Le due figure contigue sono dunque un\'unica narrazione in due tempi. Venere presiede il boschetto da una posizione arretrata, inquadrata dall\'arco degli alberi; Cupido bendato scocca verso le Grazie, il cui girotondo è stato letto come figurazione delle tre fasi del dono: dare, ricevere, restituire. Mercurio, all\'estremità sinistra, dissipa le nubi con il caduceo: è il custode del giardino, non un partecipante. L\'insieme non illustra un testo unico ma compone un discorso sull\'amore e sulla fecondità, coerente con la cultura neoplatonica del circolo mediceo per cui il quadro fu quasi certamente eseguito.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iPrimaveraMd4m,
      artworkId: artPrimavera,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'La Primavera — racconto completo',
        screenText: 'La tavola, di quasi tre metri di larghezza, fu eseguita intorno al 1480 e risulta inventariata nel 1499 nella casa fiorentina di Lorenzo di Pierfrancesco de\' Medici, cugino del Magnifico. Non conosciamo il testo che Botticelli doveva illustrare, e forse non esisteva: il quadro sembra piuttosto comporre più fonti in una sola immagine.\nLa sequenza narrativa va da destra a sinistra, contro l\'abitudine di lettura. Nei Fasti Ovidio fa raccontare a Flora la propria origine: era la ninfa Cloris, Zefiro la rapì, e dall\'unione nacque la sua nuova identità di dea dei fiori. Botticelli mette le due figure una accanto all\'altra, così la metamorfosi si vede accadere: dalla bocca di Cloris escono già i fiori che ricoprono la veste di Flora.\nAl centro Venere, arretrata rispetto al piano delle altre figure e incorniciata dall\'apertura del fogliame, presiede il giardino con un gesto misurato della mano. Cupido, bendato, punta le Grazie: la cecità dell\'amore è un motivo che il Quattrocento eredita dalla tradizione medievale e reinterpreta in chiave positiva.\nIl girotondo delle tre Grazie è la parte più celebre della tavola. Nella lettura neoplatonica diffusa nel circolo di Marsilio Ficino, le tre figure rappresentano i momenti del dono — dare, ricevere, restituire — e insieme i gradi attraverso cui la bellezza sensibile conduce alla bellezza intelligibile.\nMercurio chiude la composizione a sinistra. Il caduceo alzato dissipa le nubi: il suo compito è proteggere il giardino, non abitarlo, e infatti è l\'unica figura che guarda altrove.\nResta il prato, che è forse il vero prodigio tecnico dell\'opera: oltre cinquecento esemplari vegetali dipinti singolarmente, riferibili a quasi duecento specie, in larga parte identificabili e coerenti con la fioritura primaverile della campagna toscana.',
        ttsText: 'La tavola, di quasi tre metri di larghezza, fu eseguita intorno al 1480 e risulta inventariata nel 1499 nella casa fiorentina di Lorenzo di Pierfrancesco de\' Medici, cugino del Magnifico. Non conosciamo il testo che Botticelli doveva illustrare, e forse non esisteva: il quadro sembra piuttosto comporre più fonti in una sola immagine. La sequenza narrativa va da destra a sinistra, contro l\'abitudine di lettura. Nei Fasti Ovidio fa raccontare a Flora la propria origine: era la ninfa Cloris, Zefiro la rapì, e dall\'unione nacque la sua nuova identità di dea dei fiori. Botticelli mette le due figure una accanto all\'altra, così la metamorfosi si vede accadere: dalla bocca di Cloris escono già i fiori che ricoprono la veste di Flora. Al centro Venere, arretrata rispetto al piano delle altre figure e incorniciata dall\'apertura del fogliame, presiede il giardino con un gesto misurato della mano. Cupido, bendato, punta le Grazie: la cecità dell\'amore è un motivo che il Quattrocento eredita dalla tradizione medievale e reinterpreta in chiave positiva. Il girotondo delle tre Grazie è la parte più celebre della tavola. Nella lettura neoplatonica diffusa nel circolo di Marsilio Ficino, le tre figure rappresentano i momenti del dono, dare, ricevere, restituire, e insieme i gradi attraverso cui la bellezza sensibile conduce alla bellezza intelligibile. Mercurio chiude la composizione a sinistra. Il caduceo alzato dissipa le nubi: il suo compito è proteggere il giardino, non abitarlo, e infatti è l\'unica figura che guarda altrove. Resta il prato, che è forse il vero prodigio tecnico dell\'opera: oltre cinquecento esemplari vegetali dipinti singolarmente, riferibili a quasi duecento specie, in larga parte identificabili e coerenti con la fioritura primaverile della campagna toscana.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iPrimaveraAv2m,
      artworkId: artPrimavera,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'La Primavera — lettura critica in breve',
        screenText: 'La questione aperta non è l\'identificazione delle figure, sostanzialmente acquisita, ma lo statuto del programma iconografico.\nLa lettura warburghiana ne fa un\'illustrazione di fonti poetiche precise; la revisione novecentesca, da Gombrich in avanti, vi legge piuttosto un programma neoplatonico costruito ad hoc per l\'educazione del giovane Lorenzo di Pierfrancesco.\nLa terza posizione, oggi la più cauta, nega l\'esistenza di un testo-fonte unitario: la tavola sarebbe una composizione di motivi, non la traduzione di un testo.\nSul piano formale resta decisivo il rifiuto della prospettiva costruita: il fondo scuro annulla la profondità, le figure si dispongono su un piano quasi continuo e la costruzione è affidata al ritmo lineare.',
        ttsText: 'La questione aperta non è l\'identificazione delle figure, sostanzialmente acquisita, ma lo statuto del programma iconografico. La lettura warburghiana ne fa un\'illustrazione di fonti poetiche precise; la revisione novecentesca, da Gombrich in avanti, vi legge piuttosto un programma neoplatonico costruito ad hoc per l\'educazione del giovane Lorenzo di Pierfrancesco. La terza posizione, oggi la più cauta, nega l\'esistenza di un testo fonte unitario: la tavola sarebbe una composizione di motivi, non la traduzione di un testo. Sul piano formale resta decisivo il rifiuto della prospettiva costruita: il fondo scuro annulla la profondità, le figure si dispongono su un piano quasi continuo e la costruzione è affidata al ritmo lineare.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },

    // Medusa
    {
      id: iMedusaEl2m,
      artworkId: artMedusa,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Medusa — racconto guidato',
        screenText: 'Quello che sembra un quadro rotondo è in realtà uno scudo di legno, ricoperto di tela e dipinto.\nSopra c\'è la testa di Medusa, il mostro del mito greco che aveva serpenti al posto dei capelli e trasformava in pietra chiunque la guardasse negli occhi.\nCaravaggio sceglie l\'istante esatto in cui l\'eroe Perseo le taglia la testa: la bocca è ancora aperta per il grido, gli occhi sono spalancati, il sangue schizza dal collo.\nIl trucco più bello è che il viso è dipinto su una superficie curva, ma sembra che la testa sporga verso di te: uno scudo che invece di proteggere sembra attaccare.\nL\'opera fu mandata in dono al granduca Ferdinando I de\' Medici, che collezionava armi e armature.',
        ttsText: 'Quello che sembra un quadro rotondo è in realtà uno scudo di legno, ricoperto di tela e dipinto. Sopra c\'è la testa di Medusa, il mostro del mito greco che aveva serpenti al posto dei capelli e trasformava in pietra chiunque la guardasse negli occhi. Caravaggio sceglie l\'istante esatto in cui l\'eroe Perseo le taglia la testa: la bocca è ancora aperta per il grido, gli occhi sono spalancati, il sangue schizza dal collo. Il trucco più bello è che il viso è dipinto su una superficie curva, ma sembra che la testa sporga verso di te: uno scudo che invece di proteggere sembra attaccare. L\'opera fu mandata in dono al granduca Ferdinando primo de\' Medici, che collezionava armi e armature.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iMedusaEl4m,
      artworkId: artMedusa,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Medusa — visita approfondita',
        screenText: 'Prima di guardare l\'immagine, guarda l\'oggetto: non è una tela tesa su un telaio, è uno scudo da parata. Un disco di legno di pioppo, leggermente bombato, coperto di tela e poi dipinto. Scudi come questo non servivano in battaglia: erano oggetti da cerimonia e da collezione.\nIl soggetto è Medusa. Nel mito greco era una delle tre Gorgoni, e la sua particolarità era terribile: aveva serpenti vivi al posto dei capelli e chiunque incrociasse il suo sguardo diventava di pietra. L\'eroe Perseo riuscì a ucciderla usando lo scudo come specchio, così da colpirla senza guardarla direttamente.\nCaravaggio non dipinge Perseo, e nemmeno il mostro vivo. Sceglie l\'attimo immediatamente successivo al colpo. La testa è già staccata — vedi il sangue che esce dal collo in tre getti — ma il volto non lo sa ancora: la bocca è spalancata in un grido, le sopracciglia sono sollevate, gli occhi guardano in basso con un\'espressione di puro sbigottimento. È l\'ultimo istante di coscienza, dipinto.\nI serpenti, invece, sono vivissimi. Si torcono, si sollevano, alcuni sembrano uscire dalla superficie. Caravaggio li ha dipinti con la stessa attenzione con cui altri pittori dipingevano i gioielli.\nE poi c\'è il gioco più raffinato. Lo scudo è convesso, cioè gonfio verso l\'esterno. Ma Caravaggio lo ha dipinto con le ombre di una superficie concava, cioè incavata. Il risultato è che il tuo occhio si confonde e la testa sembra venirti incontro, come se sporgesse dal disco.\nL\'oggetto fu inviato a Firenze come dono diplomatico al granduca Ferdinando I de\' Medici, appassionato collezionista di armature. Per secoli è rimasto nell\'Armeria medicea, insieme alle armi vere.',
        ttsText: 'Prima di guardare l\'immagine, guarda l\'oggetto: non è una tela tesa su un telaio, è uno scudo da parata. Un disco di legno di pioppo, leggermente bombato, coperto di tela e poi dipinto. Scudi come questo non servivano in battaglia: erano oggetti da cerimonia e da collezione. Il soggetto è Medusa. Nel mito greco era una delle tre Gorgoni, e la sua particolarità era terribile: aveva serpenti vivi al posto dei capelli e chiunque incrociasse il suo sguardo diventava di pietra. L\'eroe Perseo riuscì a ucciderla usando lo scudo come specchio, così da colpirla senza guardarla direttamente. Caravaggio non dipinge Perseo, e nemmeno il mostro vivo. Sceglie l\'attimo immediatamente successivo al colpo. La testa è già staccata, vedi il sangue che esce dal collo in tre getti, ma il volto non lo sa ancora: la bocca è spalancata in un grido, le sopracciglia sono sollevate, gli occhi guardano in basso con un\'espressione di puro sbigottimento. È l\'ultimo istante di coscienza, dipinto. I serpenti, invece, sono vivissimi. Si torcono, si sollevano, alcuni sembrano uscire dalla superficie. Caravaggio li ha dipinti con la stessa attenzione con cui altri pittori dipingevano i gioielli. E poi c\'è il gioco più raffinato. Lo scudo è convesso, cioè gonfio verso l\'esterno. Ma Caravaggio lo ha dipinto con le ombre di una superficie concava, cioè incavata. Il risultato è che il tuo occhio si confonde e la testa sembra venirti incontro, come se sporgesse dal disco. L\'oggetto fu inviato a Firenze come dono diplomatico al granduca Ferdinando primo de\' Medici, appassionato collezionista di armature. Per secoli è rimasto nell\'Armeria medicea, insieme alle armi vere.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaMd2m,
      artworkId: artMedusa,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Medusa — racconto esteso',
        screenText: 'Il supporto è uno scudo da parata in legno di pioppo rivestito di tela, eseguito intorno al 1597-1598 su commissione del cardinale Francesco Maria Del Monte, protettore di Caravaggio, e destinato in dono a Ferdinando I de\' Medici.\nLa scelta del soggetto è colta: lo scudo con la Gorgone rimanda all\'egida di Atena, e in chiave encomiastica al principe che pietrifica i nemici.\nCaravaggio fissa l\'istante fra la decapitazione e la morte. Il volto è ancora percorso dalla coscienza — bocca aperta, sopracciglia inarcate, sguardo abbassato — mentre il sangue erompe dal collo in getti già inerti.\nLa contraddizione ottica è deliberata: su una superficie convessa il pittore dipinge il chiaroscuro di una concava, e la testa pare aggettare verso chi guarda. Il volto, secondo una tradizione antica, sarebbe un autoritratto allo specchio.',
        ttsText: 'Il supporto è uno scudo da parata in legno di pioppo rivestito di tela, eseguito intorno al millecinquecentonovantasette su commissione del cardinale Francesco Maria Del Monte, protettore di Caravaggio, e destinato in dono a Ferdinando primo de\' Medici. La scelta del soggetto è colta: lo scudo con la Gorgone rimanda all\'egida di Atena, e in chiave encomiastica al principe che pietrifica i nemici. Caravaggio fissa l\'istante fra la decapitazione e la morte. Il volto è ancora percorso dalla coscienza, bocca aperta, sopracciglia inarcate, sguardo abbassato, mentre il sangue erompe dal collo in getti già inerti. La contraddizione ottica è deliberata: su una superficie convessa il pittore dipinge il chiaroscuro di una concava, e la testa pare aggettare verso chi guarda. Il volto, secondo una tradizione antica, sarebbe un autoritratto allo specchio.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iMedusaMd4m,
      artworkId: artMedusa,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Medusa — racconto completo',
        screenText: 'L\'opera che hai davanti nasce come oggetto d\'arme, non come quadro. È uno scudo da parata: un disco convesso in legno di pioppo, di poco meno di settanta centimetri, rivestito di tela gessata e poi dipinto a olio. La destinazione era l\'Armeria medicea, dove rimase per secoli accanto alle armature autentiche.\nLa commissione risale al 1597-1598 e si deve al cardinale Francesco Maria Del Monte, primo protettore romano di Caravaggio, che ne fece un dono diplomatico a Ferdinando I de\' Medici. La scelta iconografica è tutt\'altro che casuale: lo scudo con la testa della Gorgone è l\'egida di Atena, e in chiave celebrativa allude al principe capace di pietrificare i propri nemici. Un\'arma che vince senza colpire.\nIl racconto mitico è noto: Medusa, unica mortale fra le tre Gorgoni, pietrificava chiunque ne incrociasse lo sguardo; Perseo la decapitò servendosi del proprio scudo come specchio. Caravaggio, però, non illustra l\'impresa. Isola un istante brevissimo, quello fra il taglio e la morte, e lo tratta come un fatto fisiologico prima che eroico.\nDi qui la costruzione del volto: la bocca è spalancata su un grido che non sentiamo, le sopracciglia si sollevano al centro, lo sguardo cade verso il basso in un\'espressione più di incredulità che di dolore. Il sangue esce dal collo in getti che il pittore rende già privi di forza. La testa, insomma, è viva ancora per un attimo e lo sa.\nAttorno, i serpenti sono trattati con una precisione quasi naturalistica: si attorcigliano, si sollevano, uno si morde. Sono l\'unica parte dell\'opera in cui la pittura indugia sul dettaglio decorativo.\nResta l\'invenzione ottica, che è il vero motivo della fama dell\'opera. La superficie è convessa, ma il chiaroscuro è quello di una superficie concava: l\'occhio riceve due informazioni contraddittorie e risolve il conflitto facendo aggettare la testa verso l\'esterno. Lo scudo, oggetto difensivo per definizione, si comporta visivamente come una minaccia.\nUna tradizione antica, non verificabile ma tenace, vuole che il volto sia un autoritratto dipinto allo specchio: l\'artista che si ritrae nell\'istante in cui viene decapitato.',
        ttsText: 'L\'opera che hai davanti nasce come oggetto d\'arme, non come quadro. È uno scudo da parata: un disco convesso in legno di pioppo, di poco meno di settanta centimetri, rivestito di tela gessata e poi dipinto a olio. La destinazione era l\'Armeria medicea, dove rimase per secoli accanto alle armature autentiche. La commissione risale al millecinquecentonovantasette e si deve al cardinale Francesco Maria Del Monte, primo protettore romano di Caravaggio, che ne fece un dono diplomatico a Ferdinando primo de\' Medici. La scelta iconografica è tutt\'altro che casuale: lo scudo con la testa della Gorgone è l\'egida di Atena, e in chiave celebrativa allude al principe capace di pietrificare i propri nemici. Un\'arma che vince senza colpire. Il racconto mitico è noto: Medusa, unica mortale fra le tre Gorgoni, pietrificava chiunque ne incrociasse lo sguardo; Perseo la decapitò servendosi del proprio scudo come specchio. Caravaggio, però, non illustra l\'impresa. Isola un istante brevissimo, quello fra il taglio e la morte, e lo tratta come un fatto fisiologico prima che eroico. Di qui la costruzione del volto: la bocca è spalancata su un grido che non sentiamo, le sopracciglia si sollevano al centro, lo sguardo cade verso il basso in un\'espressione più di incredulità che di dolore. Il sangue esce dal collo in getti che il pittore rende già privi di forza. La testa, insomma, è viva ancora per un attimo e lo sa. Attorno, i serpenti sono trattati con una precisione quasi naturalistica: si attorcigliano, si sollevano, uno si morde. Sono l\'unica parte dell\'opera in cui la pittura indugia sul dettaglio decorativo. Resta l\'invenzione ottica, che è il vero motivo della fama dell\'opera. La superficie è convessa, ma il chiaroscuro è quello di una superficie concava: l\'occhio riceve due informazioni contraddittorie e risolve il conflitto facendo aggettare la testa verso l\'esterno. Lo scudo, oggetto difensivo per definizione, si comporta visivamente come una minaccia. Una tradizione antica, non verificabile ma tenace, vuole che il volto sia un autoritratto dipinto allo specchio: l\'artista che si ritrae nell\'istante in cui viene decapitato.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iMedusaAv2m,
      artworkId: artMedusa,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Medusa — lettura critica in breve',
        screenText: 'Tre elementi qualificano l\'opera nel percorso caravaggesco degli anni Del Monte.\nIl primo è la contraddizione fra supporto e resa: chiaroscuro concavo su superficie convessa, un artificio che sposta l\'opera dal piano della rappresentazione a quello dell\'inganno percettivo, in linea con la cultura del meraviglioso di fine secolo.\nIl secondo è il trattamento del tempo. Caravaggio isola una frazione post mortem in cui la coscienza sopravvive al corpo: una scelta che anticipa la drammaturgia dell\'istante delle opere romane mature.\nIl terzo è lo statuto del ritratto. L\'identificazione con l\'autoritratto allo specchio, priva di conferme documentarie, resta plausibile sul piano tecnico e coerente con la prassi giovanile del pittore.',
        ttsText: 'Tre elementi qualificano l\'opera nel percorso caravaggesco degli anni Del Monte. Il primo è la contraddizione fra supporto e resa: chiaroscuro concavo su superficie convessa, un artificio che sposta l\'opera dal piano della rappresentazione a quello dell\'inganno percettivo, in linea con la cultura del meraviglioso di fine secolo. Il secondo è il trattamento del tempo. Caravaggio isola una frazione post mortem in cui la coscienza sopravvive al corpo: una scelta che anticipa la drammaturgia dell\'istante delle opere romane mature. Il terzo è lo statuto del ritratto. L\'identificazione con l\'autoritratto allo specchio, priva di conferme documentarie, resta plausibile sul piano tecnico e coerente con la prassi giovanile del pittore.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },

    // Giuditta e Oloferne
    {
      id: iGiudittaEl2m,
      artworkId: artGiuditta,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Giuditta e Oloferne — racconto guidato',
        screenText: 'La storia viene dalla Bibbia. Oloferne è un generale nemico che assedia la città di Betulia; Giuditta, una donna della città, entra nel suo accampamento fingendosi alleata, aspetta che si ubriachi e lo uccide nel sonno.\nArtemisia Gentileschi sceglie il momento più duro: la decapitazione mentre sta accadendo.\nGuarda come sono disposte le figure. Giuditta tiene la spada con entrambe le braccia e allontana il corpo da sé; la serva Abra non aspetta in disparte, come nella maggior parte dei quadri su questo tema, ma blocca Oloferne con tutto il proprio peso. Sono due donne che lavorano insieme.\nArtemisia dipinse questa tela poco dopo il processo per la violenza subita dal pittore Agostino Tassi, e molti studiosi leggono in quella forza una risposta personale.',
        ttsText: 'La storia viene dalla Bibbia. Oloferne è un generale nemico che assedia la città di Betulia; Giuditta, una donna della città, entra nel suo accampamento fingendosi alleata, aspetta che si ubriachi e lo uccide nel sonno. Artemisia Gentileschi sceglie il momento più duro: la decapitazione mentre sta accadendo. Guarda come sono disposte le figure. Giuditta tiene la spada con entrambe le braccia e allontana il corpo da sé; la serva Abra non aspetta in disparte, come nella maggior parte dei quadri su questo tema, ma blocca Oloferne con tutto il proprio peso. Sono due donne che lavorano insieme. Artemisia dipinse questa tela poco dopo il processo per la violenza subita dal pittore Agostino Tassi, e molti studiosi leggono in quella forza una risposta personale.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iGiudittaEl4m,
      artworkId: artGiuditta,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'elementare' },
      content: {
        title: 'Giuditta e Oloferne — visita approfondita',
        screenText: 'Il racconto è nel Libro di Giuditta, uno dei testi dell\'Antico Testamento. La città ebraica di Betulia è assediata dall\'esercito assiro, guidato dal generale Oloferne, e sta per arrendersi. Giuditta, una vedova della città, decide di agire da sola: si presenta al campo nemico dicendo di voler passare dalla loro parte, si guadagna la fiducia di Oloferne, aspetta che una sera beva troppo e, quando resta sola con lui nella tenda, gli taglia la testa con la sua stessa spada.\nQuasi tutti i pittori che hanno affrontato questa storia hanno scelto il dopo: Giuditta che si allontana con la testa avvolta in un panno, il volto composto. Artemisia Gentileschi sceglie invece il durante, e non risparmia nulla.\nOsserva la costruzione della scena. Il corpo di Oloferne occupa il centro in diagonale; si è svegliato e sta cercando di reagire, e infatti il suo braccio spinge verso l\'alto. Giuditta è a destra, appoggiata sulle gambe divaricate per avere stabilità, e tiene la spada con entrambe le mani mentre con la sinistra allontana da sé la testa dell\'uomo: è un gesto pratico, non eroico, di chi non vuole sporcarsi.\nLa vera differenza è la serva. Nella tradizione figurativa Abra aspetta fuori dalla tenda, o al massimo regge il sacco. Qui è dentro la scena a pieno titolo: si getta sul petto di Oloferne con tutto il corpo per tenerlo fermo. La decapitazione diventa un\'azione a quattro braccia.\nLa luce arriva da sinistra, tagliente, e illumina solo ciò che serve: i volti concentrati delle due donne, il braccio dell\'uomo, la lama. Il resto sprofonda nel buio. È il linguaggio di Caravaggio, che Artemisia conosceva bene attraverso il padre Orazio.\nUn ultimo dato, che aiuta a capire la tela. Artemisia la dipinse tra il 1620 e il 1621, pochi anni dopo il processo pubblico contro il pittore Agostino Tassi, che l\'aveva violentata quando lei aveva diciassette anni. Molti studiosi hanno letto in questa Giuditta così determinata una risposta a quella vicenda. Altri invitano alla prudenza. Il quadro, in ogni caso, non chiede compassione: chiede di guardare.',
        ttsText: 'Il racconto è nel Libro di Giuditta, uno dei testi dell\'Antico Testamento. La città ebraica di Betulia è assediata dall\'esercito assiro, guidato dal generale Oloferne, e sta per arrendersi. Giuditta, una vedova della città, decide di agire da sola: si presenta al campo nemico dicendo di voler passare dalla loro parte, si guadagna la fiducia di Oloferne, aspetta che una sera beva troppo e, quando resta sola con lui nella tenda, gli taglia la testa con la sua stessa spada. Quasi tutti i pittori che hanno affrontato questa storia hanno scelto il dopo: Giuditta che si allontana con la testa avvolta in un panno, il volto composto. Artemisia Gentileschi sceglie invece il durante, e non risparmia nulla. Osserva la costruzione della scena. Il corpo di Oloferne occupa il centro in diagonale; si è svegliato e sta cercando di reagire, e infatti il suo braccio spinge verso l\'alto. Giuditta è a destra, appoggiata sulle gambe divaricate per avere stabilità, e tiene la spada con entrambe le mani mentre con la sinistra allontana da sé la testa dell\'uomo: è un gesto pratico, non eroico, di chi non vuole sporcarsi. La vera differenza è la serva. Nella tradizione figurativa Abra aspetta fuori dalla tenda, o al massimo regge il sacco. Qui è dentro la scena a pieno titolo: si getta sul petto di Oloferne con tutto il corpo per tenerlo fermo. La decapitazione diventa un\'azione a quattro braccia. La luce arriva da sinistra, tagliente, e illumina solo ciò che serve: i volti concentrati delle due donne, il braccio dell\'uomo, la lama. Il resto sprofonda nel buio. È il linguaggio di Caravaggio, che Artemisia conosceva bene attraverso il padre Orazio. Un ultimo dato, che aiuta a capire la tela. Artemisia la dipinse tra il milleseicentoventi e il milleseicentoventuno, pochi anni dopo il processo pubblico contro il pittore Agostino Tassi, che l\'aveva violentata quando lei aveva diciassette anni. Molti studiosi hanno letto in questa Giuditta così determinata una risposta a quella vicenda. Altri invitano alla prudenza. Il quadro, in ogni caso, non chiede compassione: chiede di guardare.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaMd2m,
      artworkId: artGiuditta,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Giuditta e Oloferne — racconto esteso',
        screenText: 'La tela, databile al 1620-1621, riprende un soggetto che Artemisia aveva già affrontato a Napoli e che qui porta alla massima tensione.\nRispetto alla tradizione iconografica la novità sta nella distribuzione dei ruoli: la serva Abra, di norma relegata al margine o all\'attesa, partecipa fisicamente all\'azione immobilizzando il corpo del generale. La decapitazione è un\'impresa condivisa, non un gesto solitario.\nLa costruzione è caravaggesca nella luce — un fascio radente da sinistra che isola i volti e la lama lasciando il resto nel buio — ma se ne distacca nella regia dei corpi, disposti secondo diagonali che si contrastano.\nLa critica ha spesso letto la tela in rapporto al processo del 1612 contro Agostino Tassi; l\'ipotesi è suggestiva e va maneggiata con cautela, perché il tema era già ampiamente diffuso nella pittura del tempo.',
        ttsText: 'La tela, databile al milleseicentoventi, riprende un soggetto che Artemisia aveva già affrontato a Napoli e che qui porta alla massima tensione. Rispetto alla tradizione iconografica la novità sta nella distribuzione dei ruoli: la serva Abra, di norma relegata al margine o all\'attesa, partecipa fisicamente all\'azione immobilizzando il corpo del generale. La decapitazione è un\'impresa condivisa, non un gesto solitario. La costruzione è caravaggesca nella luce, un fascio radente da sinistra che isola i volti e la lama lasciando il resto nel buio, ma se ne distacca nella regia dei corpi, disposti secondo diagonali che si contrastano. La critica ha spesso letto la tela in rapporto al processo del milleseicentododici contro Agostino Tassi; l\'ipotesi è suggestiva e va maneggiata con cautela, perché il tema era già ampiamente diffuso nella pittura del tempo.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
    {
      id: iGiudittaMd4m,
      artworkId: artGiuditta,
      classification: { fruitionLength: '4min', languageCode: 'it', languageRegister: 'medio' },
      content: {
        title: 'Giuditta e Oloferne — racconto completo',
        screenText: 'Il soggetto viene dal Libro di Giuditta: assediata Betulia dall\'esercito assiro, la vedova Giuditta si introduce nel campo nemico con un pretesto, guadagna la fiducia del generale Oloferne e, approfittandone dell\'ubriachezza, lo decapita con la sua stessa spada, salvando la città.\nNella pittura del Cinque e Seicento il tema è frequentissimo, ma quasi sempre declinato nel momento successivo all\'atto: Giuditta che esce dalla tenda con la testa, il volto composto in un\'espressione di trionfo o di mesta gravità. La scelta di Artemisia Gentileschi è un\'altra: rappresentare l\'azione mentre si compie, con tutte le sue implicazioni fisiche.\nLa composizione è organizzata su diagonali contrapposte. Il corpo di Oloferne taglia la tela obliquamente, dal fondo verso lo spettatore; il braccio sollevato tenta la reazione ed è l\'unico segnale che l\'uomo si è svegliato. Giuditta occupa il lato destro con una postura solidamente piantata: le gambe divaricate per il bilanciamento, il braccio destro sulla spada, il sinistro che tiene la testa a distanza, in un gesto di puntualità pratica lontanissimo dall\'enfasi eroica.\nIl nodo iconografico decisivo è però la serva. Nella tradizione figurativa Abra attende all\'esterno o al più regge il sacco; nella tela degli Uffizi è dentro l\'azione, gettata con tutto il peso sul torace del generale per immobilizzarlo. La violenza diventa un\'operazione a quattro braccia, e con essa cambia il significato complessivo della scena: non un miracolo compiuto da una figura eletta, ma un lavoro.\nSul piano formale il linguaggio è quello caravaggesco che Artemisia aveva assimilato attraverso il padre Orazio e l\'ambiente romano: fascio luminoso radente da sinistra, fondo assorbito nel buio, selezione degli elementi illuminati secondo un criterio narrativo — i volti concentrati, il braccio, la lama, il rosso del panneggio. Ma la costruzione dello spazio è più asciutta e la fisicità dei corpi più marcata di quanto Caravaggio stesso avrebbe fatto.\nResta la questione biografica. La tela fu eseguita tra il 1620 e il 1621, nove anni dopo il processo intentato dal padre contro Agostino Tassi per la violenza subita da Artemisia diciassettenne. Una parte cospicua della critica novecentesca ha letto la determinazione della protagonista come elaborazione di quella vicenda. La lettura è legittima ma va tenuta insieme a un dato di contesto: il soggetto era già estremamente richiesto dal mercato, e Artemisia lo replicò più volte su commissione.',
        ttsText: 'Il soggetto viene dal Libro di Giuditta: assediata Betulia dall\'esercito assiro, la vedova Giuditta si introduce nel campo nemico con un pretesto, guadagna la fiducia del generale Oloferne e, approfittando della sua ubriachezza, lo decapita con la sua stessa spada, salvando la città. Nella pittura del Cinque e Seicento il tema è frequentissimo, ma quasi sempre declinato nel momento successivo all\'atto: Giuditta che esce dalla tenda con la testa, il volto composto in un\'espressione di trionfo o di mesta gravità. La scelta di Artemisia Gentileschi è un\'altra: rappresentare l\'azione mentre si compie, con tutte le sue implicazioni fisiche. La composizione è organizzata su diagonali contrapposte. Il corpo di Oloferne taglia la tela obliquamente, dal fondo verso lo spettatore; il braccio sollevato tenta la reazione ed è l\'unico segnale che l\'uomo si è svegliato. Giuditta occupa il lato destro con una postura solidamente piantata: le gambe divaricate per il bilanciamento, il braccio destro sulla spada, il sinistro che tiene la testa a distanza, in un gesto di puntualità pratica lontanissimo dall\'enfasi eroica. Il nodo iconografico decisivo è però la serva. Nella tradizione figurativa Abra attende all\'esterno o al più regge il sacco; nella tela degli Uffizi è dentro l\'azione, gettata con tutto il peso sul torace del generale per immobilizzarlo. La violenza diventa un\'operazione a quattro braccia, e con essa cambia il significato complessivo della scena: non un miracolo compiuto da una figura eletta, ma un lavoro. Sul piano formale il linguaggio è quello caravaggesco che Artemisia aveva assimilato attraverso il padre Orazio e l\'ambiente romano: fascio luminoso radente da sinistra, fondo assorbito nel buio, selezione degli elementi illuminati secondo un criterio narrativo, i volti concentrati, il braccio, la lama, il rosso del panneggio. Ma la costruzione dello spazio è più asciutta e la fisicità dei corpi più marcata di quanto Caravaggio stesso avrebbe fatto. Resta la questione biografica. La tela fu eseguita tra il milleseicentoventi e il milleseicentoventuno, nove anni dopo il processo intentato dal padre contro Agostino Tassi per la violenza subita da Artemisia diciassettenne. Una parte cospicua della critica novecentesca ha letto la determinazione della protagonista come elaborazione di quella vicenda. La lettura è legittima ma va tenuta insieme a un dato di contesto: il soggetto era già estremamente richiesto dal mercato, e Artemisia lo replicò più volte su commissione.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore2,
      lastUpdaterId: usrAutore2,
    },
    {
      id: iGiudittaAv2m,
      artworkId: artGiuditta,
      classification: { fruitionLength: '2min', languageCode: 'it', languageRegister: 'avanzato' },
      content: {
        title: 'Giuditta e Oloferne — lettura critica in breve',
        screenText: 'Il punto critico non è il caravaggismo dichiarato, ma la ristrutturazione del tipo iconografico.\nSpostando Abra da testimone ad agente, Artemisia converte un\'immagine di elezione provvidenziale in una scena di azione coordinata: la protagonista perde l\'aura e acquista competenza operativa. È una modifica strutturale, non un accento.\nSul piano formale la regia per diagonali contrapposte e il taglio ravvicinato producono una compressione dello spazio che il modello caravaggesco, più teatrale, non conosce.\nQuanto alla lettura biografica in chiave di rivalsa sul processo Tassi, va contestualizzata: il soggetto era di forte domanda sul mercato e l\'artista lo replicò in più redazioni. La coincidenza cronologica è un indizio, non una dimostrazione.',
        ttsText: 'Il punto critico non è il caravaggismo dichiarato, ma la ristrutturazione del tipo iconografico. Spostando Abra da testimone ad agente, Artemisia converte un\'immagine di elezione provvidenziale in una scena di azione coordinata: la protagonista perde l\'aura e acquista competenza operativa. È una modifica strutturale, non un accento. Sul piano formale la regia per diagonali contrapposte e il taglio ravvicinato producono una compressione dello spazio che il modello caravaggesco, più teatrale, non conosce. Quanto alla lettura biografica in chiave di rivalsa sul processo Tassi, va contestualizzata: il soggetto era di forte domanda sul mercato e l\'artista lo replicò in più redazioni. La coincidenza cronologica è un indizio, non una dimostrazione.',
      },
      isFree: true,
      status: 'published',
      creatorId: usrAutore1,
      lastUpdaterId: usrAutore1,
    },
  ], (doc) => ({
    // Il titolo distingue le varianti della stessa opera, comprese quelle che
    // condividono il registro e differiscono solo per durata.
    artworkId: doc.artworkId,
    'content.title': doc.content.title,
  }));

  // Risoluzione degli id realmente memorizzati: il titolo è la chiave stabile,
  // unica anche tra candidati multipli sullo stesso registro (stesso criterio
  // del filtro di upsert qui sopra).
  const storedItems = await ArtworkItem.find({ artworkId: { $in: storedArtworks.map((a) => a.id) } }).lean();
  const itemIdByTitle = new Map(storedItems.map((item) => [item.content.title, item.id]));
  const itemByTitle = (title) => {
    const id = itemIdByTitle.get(title);
    if (!id) throw new Error(`Seed inconsistente: item "${title}" non trovato dopo l'upsert`);
    return id;
  };

  iVenereEl = itemByTitle('La nascita di Venere');
  iVenereAv = itemByTitle('La nascita di Venere — lettura critica');
  iVenereIn = itemByTitle('La nascita di Venere — per i più piccoli');
  iVenereMd = itemByTitle('La nascita di Venere — racconto');
  iVenereMd2 = itemByTitle('La nascita di Venere — tra mito e tecnica');
  iVenereSp = itemByTitle('La nascita di Venere — scheda specialistica');
  iPrimaveraEl = itemByTitle('La Primavera');
  iPrimaveraAv = itemByTitle('La Primavera — lettura critica');
  iPrimaveraIn = itemByTitle('La Primavera — per i più piccoli');
  iPrimaveraMd = itemByTitle('La Primavera — racconto');
  iPrimaveraSp = itemByTitle('La Primavera — scheda specialistica');
  iAnnunciazioneEl = itemByTitle('Annunciazione');
  iAnnunciazioneAv = itemByTitle('Annunciazione — lettura critica');
  iAdorazioneEl = itemByTitle('Adorazione dei Magi');
  iAdorazioneAv = itemByTitle('Adorazione dei Magi — lettura critica');
  iTondoDoniEl = itemByTitle('Tondo Doni');
  iTondoDoniAv = itemByTitle('Tondo Doni — lettura critica');
  iMadonnaEl = itemByTitle('Madonna del Cardellino');
  iMadonnaAv = itemByTitle('Madonna del Cardellino — lettura critica');
  iLeoneXEl = itemByTitle('Ritratto di Leone X');
  iLeoneXAv = itemByTitle('Ritratto di Leone X — lettura critica');
  iVenereUrbinoEl = itemByTitle('Venere di Urbino');
  iVenereUrbinoAv = itemByTitle('Venere di Urbino — lettura critica');
  iFloraEl = itemByTitle('Flora');
  iFloraAv = itemByTitle('Flora — lettura critica');
  iMedusaEl = itemByTitle('Medusa');
  iMedusaAv = itemByTitle('Medusa — lettura critica');
  iMedusaIn = itemByTitle('Medusa — per i più piccoli');
  iMedusaMd = itemByTitle('Medusa — racconto');
  iMedusaSp = itemByTitle('Medusa — scheda specialistica');
  iSacrifEl = itemByTitle('Sacrificio di Isacco');
  iSacrifAv = itemByTitle('Sacrificio di Isacco — lettura critica');
  iGiudittaEl = itemByTitle('Giuditta e Oloferne');
  iGiudittaAv = itemByTitle('Giuditta e Oloferne — lettura critica');
  iGiudittaIn = itemByTitle('Giuditta e Oloferne — per i più piccoli');
  iGiudittaMd = itemByTitle('Giuditta e Oloferne — racconto');
  iGiudittaSp = itemByTitle('Giuditta e Oloferne — scheda specialistica');

  iVenereEl2m = itemByTitle('La nascita di Venere — racconto guidato');
  iVenereEl4m = itemByTitle('La nascita di Venere — visita approfondita');
  iVenereMd2m = itemByTitle('La nascita di Venere — racconto esteso');
  iVenereAv2m = itemByTitle('La nascita di Venere — lettura critica in breve');
  iPrimaveraEl2m = itemByTitle('La Primavera — racconto guidato');
  iPrimaveraEl4m = itemByTitle('La Primavera — visita approfondita');
  iPrimaveraMd2m = itemByTitle('La Primavera — racconto esteso');
  iPrimaveraMd4m = itemByTitle('La Primavera — racconto completo');
  iPrimaveraAv2m = itemByTitle('La Primavera — lettura critica in breve');
  iMedusaEl2m = itemByTitle('Medusa — racconto guidato');
  iMedusaEl4m = itemByTitle('Medusa — visita approfondita');
  iMedusaMd2m = itemByTitle('Medusa — racconto esteso');
  iMedusaMd4m = itemByTitle('Medusa — racconto completo');
  iMedusaAv2m = itemByTitle('Medusa — lettura critica in breve');
  iGiudittaEl2m = itemByTitle('Giuditta e Oloferne — racconto guidato');
  iGiudittaEl4m = itemByTitle('Giuditta e Oloferne — visita approfondita');
  iGiudittaMd2m = itemByTitle('Giuditta e Oloferne — racconto esteso');
  iGiudittaMd4m = itemByTitle('Giuditta e Oloferne — racconto completo');
  iGiudittaAv2m = itemByTitle('Giuditta e Oloferne — lettura critica in breve');

  // Varianti dell'opera riusate dagli step delle visite: una tappa mette a
  // disposizione tutte le varianti disponibili per quell'opera, e il player le
  // dispone da sé sui due assi leggendo registro e durata da ogni item.
  // L'ordine è quello della scala dei registri, poi della durata crescente —
  // conta solo per la leggibilità della lista nell'Editor, non per il player.
  //
  // Opere vetrina: griglia registro × durata con più celle per riga.
  const venereVariants = [
    iVenereIn,                                  // infantile  1min
    iVenereEl, iVenereEl2m, iVenereEl4m,        // elementare 1/2/4min
    iVenereMd, iVenereMd2m, iVenereMd2,         // medio      1/2/4min
    iVenereAv2m, iVenereAv,                     // avanzato   2/4min
    iVenereSp,                                  // specialistico 4min
  ];
  const primaveraVariants = [
    iPrimaveraIn,
    iPrimaveraEl, iPrimaveraEl2m, iPrimaveraEl4m,
    iPrimaveraMd, iPrimaveraMd2m, iPrimaveraMd4m,
    iPrimaveraAv2m, iPrimaveraAv,
    iPrimaveraSp,
  ];
  const medusaVariants = [
    iMedusaIn,
    iMedusaEl, iMedusaEl2m, iMedusaEl4m,
    iMedusaMd, iMedusaMd2m, iMedusaMd4m,
    iMedusaAv2m, iMedusaAv,
    iMedusaSp,
  ];
  const giudittaVariants = [
    iGiudittaIn,
    iGiudittaEl, iGiudittaEl2m, iGiudittaEl4m,
    iGiudittaMd, iGiudittaMd2m, iGiudittaMd4m,
    iGiudittaAv2m, iGiudittaAv,
    iGiudittaSp,
  ];
  // Opere con copertura minima: due sole varianti, una per estremo della scala.
  // È il caso rado che il Navigator deve gestire ripiegando sulla variante più
  // vicina invece di pretendere la cella esatta.
  const annunciazioneVariants = [iAnnunciazioneEl, iAnnunciazioneAv];
  const adorazioneVariants = [iAdorazioneEl, iAdorazioneAv];
  const tondoDoniVariants = [iTondoDoniEl, iTondoDoniAv];
  const madonnaVariants = [iMadonnaEl, iMadonnaAv];
  const leoneXVariants = [iLeoneXEl, iLeoneXAv];
  const venereUrbinoVariants = [iVenereUrbinoEl, iVenereUrbinoAv];
  const floraVariants = [iFloraEl, iFloraAv];
  const sacrificioVariants = [iSacrifEl, iSacrifAv];

  // ── VISITE ────────────────────────────────────────────────────────────────

  await upsertMany(Visit, [
    {
      id: visHighlights,
      museumId: musUffizi,
      title: 'Highlights degli Uffizi',
      slug: 'highlights-degli-uffizi',
      subtitle: 'I capolavori imperdibili in un\'ora',
      description: 'Un percorso pensato per chi visita gli Uffizi per la prima volta o ha poco tempo. Tocca le dodici opere più iconiche del museo con spiegazioni chiare e accessibili a tutti.',
      estimatedDurationMinutes: 60,
      authorId: usrAutore1,
      status: 'published',
      steps: [
        {
          id: 'step-intro-highlights-degli-uffizi',
          type: 'logistics_intro',
          title: 'Benvenuto agli Uffizi',
          description: 'Siete entrati dalla biglietteria principale al piano terra. Salite al primo piano tramite l\'ascensore o la scala monumentale. La visita inizia dalla Sala 10-14, dedicata a Botticelli — seguite i pannelli indicativi.',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 10-14 — Botticelli',
          description: 'Entrate nella Sala 10-14 di Botticelli. La Primavera è sulla parete di fondo a sinistra: il grande dipinto con le figure su sfondo scuro.',
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera — Botticelli',
          itemIds: primaveraVariants,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Nascita di Venere',
          description: 'Rimanete nella stessa sala. La Nascita di Venere è sulla parete opposta alla Primavera, a pochi passi.',
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere — Botticelli',
          itemIds: venereVariants,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 35 — Leonardo',
          description: 'Uscite dalla Sala 10-14, girate a destra nel corridoio e percorretelo fino alla Sala 35 (Leonardo). L\'Annunciazione è la prima grande opera sulla parete sinistra entrando.',
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Annunciazione — Leonardo da Vinci',
          itemIds: annunciazioneVariants,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso l\'Adorazione dei Magi',
          description: 'Rimanete nella Sala 35. L\'Adorazione dei Magi è sulla parete di fronte, in posizione centrale.',
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Adorazione dei Magi — Leonardo da Vinci',
          itemIds: adorazioneVariants,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 41 — Michelangelo e Raffaello',
          description: 'Proseguite lungo il corridoio fino alla Sala 41 (Michelangelo e Raffaello). Il Tondo Doni è nella prima nicchia a destra entrando, riconoscibile per la cornice in legno dorato e la forma circolare.',
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Tondo Doni — Michelangelo',
          itemIds: tondoDoniVariants,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 10,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Madonna del Cardellino',
          description: 'Rimanete nella Sala 41. La Madonna del Cardellino di Raffaello è sulla parete laterale sinistra, non lontano dal Tondo Doni.',
          order: 11,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Madonna del Cardellino — Raffaello',
          itemIds: madonnaVariants,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 12,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso il Ritratto di Leone X',
          description: 'Spostatevi verso la parete di fondo della Sala 41: il Ritratto di Leone X occupa una posizione centrale di grande visibilità.',
          order: 13,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Ritratto di Leone X — Raffaello',
          itemIds: leoneXVariants,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 14,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 83 — pittura veneziana',
          description: 'Uscite dalla Sala 41 e avanzate lungo il corridoio fino alla Sala 83 (Tiziano e pittura veneziana). La Flora è nella prima sala veneziana, sulla parete destra.',
          order: 15,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Flora — Tiziano',
          itemIds: floraVariants,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 16,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Venere di Urbino',
          description: 'Rimanete nella Sala 83. La Venere di Urbino è esposta sulla parete opposta alla Flora, di fronte a voi.',
          order: 17,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Venere di Urbino — Tiziano',
          itemIds: venereUrbinoVariants,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 18,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 90 — Caravaggio',
          description: 'Percorrete il corridoio fino alla Sala 90 (Caravaggio). La Medusa è esposta su un supporto apposito al centro della sala, visibile da tutti i lati.',
          order: 19,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Medusa — Caravaggio',
          itemIds: medusaVariants,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 20,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso il Sacrificio di Isacco',
          description: 'Rimanete nella Sala 90. Il Sacrificio di Isacco è appeso sulla parete sinistra, accanto alla Medusa.',
          order: 21,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Sacrificio di Isacco — Caravaggio',
          itemIds: sacrificioVariants,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 22,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 96 — Artemisia Gentileschi',
          description: 'Proseguite nella Sala 96 (Artemisia Gentileschi). La Giuditta è l\'opera principale della sala, visibile appena entrati sulla parete di fondo.',
          order: 23,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Giuditta e Oloferne — Artemisia Gentileschi',
          itemIds: giudittaVariants,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 24,
        },
        {
          id: 'step-outro-highlights-degli-uffizi',
          type: 'logistics_intro',
          title: 'Fine della visita',
          description: 'Il percorso Highlights termina qui. Grazie per aver esplorato gli Uffizi con noi: potete uscire dalla stessa sala d\'ingresso o proseguire liberamente nel museo.',
          order: 25,
        },
      ],
    },

    {
      id: visRinascimento,
      museumId: musUffizi,
      title: 'Capolavori del Rinascimento',
      slug: 'capolavori-del-rinascimento',
      subtitle: 'Approfondimento critico per appassionati d\'arte',
      description: 'Percorso dedicato ai grandi maestri del Rinascimento: Botticelli, Leonardo, Michelangelo, Raffaello e Tiziano. Ogni tappa offre una lettura critica dell\'opera nel contesto storico e stilistico dell\'epoca.',
      estimatedDurationMinutes: 90,
      authorId: usrAutore1,
      status: 'published',
      steps: [
        {
          id: 'step-intro-capolavori-del-rinascimento',
          type: 'logistics_intro',
          title: 'Introduzione al percorso',
          description: 'Questo percorso dura circa 90 minuti e richiede attenzione prolungata. Si consiglia di scaricare la visita prima dell\'ingresso. Si parte dalla Sala 10-14 (Botticelli), primo piano.',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 10-14',
          description: 'Dal primo piano, percorrete il corridoio est fino alla Sala 10-14. La Primavera è sulla parete di fondo a sinistra.',
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera — analisi critica',
          itemIds: primaveraVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Nascita di Venere',
          description: 'Rimanete nella Sala 10-14. La Nascita di Venere è sulla parete opposta, visibile a pochi passi.',
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere — analisi critica',
          itemIds: venereVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 35 — Leonardo da Vinci',
          description: 'Uscite dalla Sala 10-14, girate a destra e percorrete il corridoio fino alla Sala 35 (Leonardo da Vinci). L\'Annunciazione è sulla parete sinistra entrando.',
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Annunciazione — analisi critica',
          itemIds: annunciazioneVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso l\'Adorazione dei Magi',
          description: 'Rimanete nella Sala 35. L\'Adorazione dei Magi è sulla parete frontale, in posizione centrale.',
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Adorazione dei Magi — analisi critica',
          itemIds: adorazioneVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 41 — Michelangelo e Raffaello',
          description: 'Avanzate lungo il corridoio fino alla Sala 41 (Michelangelo e Raffaello). Il Tondo Doni è nella prima nicchia a destra entrando nella sala.',
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Tondo Doni — analisi critica',
          itemIds: tondoDoniVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 10,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Madonna del Cardellino',
          description: 'Rimanete nella Sala 41. La Madonna del Cardellino è sulla parete laterale sinistra.',
          order: 11,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Madonna del Cardellino — analisi critica',
          itemIds: madonnaVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 12,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso il Ritratto di Leone X',
          description: 'Spostatevi verso la parete di fondo della Sala 41: il Ritratto di Leone X è esposto in posizione preminente.',
          order: 13,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Ritratto di Leone X — analisi critica',
          itemIds: leoneXVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 14,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 83 — pittura veneziana',
          description: 'Uscite dalla Sala 41 e percorrete il corridoio fino alla Sala 83 (pittura veneziana, Tiziano). La Flora è sulla parete destra della sala.',
          order: 15,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Flora — analisi critica',
          itemIds: floraVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 16,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Venere di Urbino',
          description: 'Rimanete nella Sala 83. Voltate verso la parete opposta: la Venere di Urbino è il pendant della Flora.',
          order: 17,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Venere di Urbino — analisi critica',
          itemIds: venereUrbinoVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 18,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la Sala 90 — Caravaggio',
          description: 'Continuate verso la Sala 90 (Caravaggio). Il Sacrificio di Isacco è sulla parete sinistra della sala.',
          order: 19,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Sacrificio di Isacco — analisi critica',
          itemIds: sacrificioVariants,
          defaultRegister: 'avanzato',
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 20,
        },
        {
          id: 'step-outro-capolavori-del-rinascimento',
          type: 'logistics_intro',
          title: 'Fine della visita',
          description: 'Il percorso sul Rinascimento termina qui. Grazie per l\'attenzione: potete uscire dalla stessa sala d\'ingresso o proseguire liberamente nel museo.',
          order: 21,
        },
      ],
    },

    {
      id: visFamiglie,
      museumId: musUffizi,
      title: 'Uffizi per famiglie',
      slug: 'uffizi-per-famiglie',
      subtitle: 'Alla scoperta dell\'arte con i bambini',
      description: 'Un percorso breve e coinvolgente pensato per famiglie con bambini. Ogni opera viene raccontata con storie e curiosità adatte ai più piccoli. Durata indicativa: 45 minuti.',
      targetAudience: 'Bambini e famiglie',
      estimatedDurationMinutes: 45,
      authorId: usrAutore1,
      status: 'published',
      steps: [
        {
          id: 'step-intro-uffizi-per-famiglie',
          type: 'logistics_intro',
          title: 'Pronti per l\'avventura!',
          description: 'Benvenuti agli Uffizi! Oggi faremo un viaggio nel tempo tra quadri bellissimi. Seguite i grandi al primo piano e iniziamo dalla Sala di Botticelli — si parte!',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Su per le scale, verso Botticelli!',
          description: 'Salite al primo piano e seguite il corridoio fino alla Sala 10-14. La Nascita di Venere è sulla parete di fondo — la vedrete subito, è grandissima!',
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere',
          itemIds: venereVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Un giro su te stesso!',
          description: 'Giratevi: La Primavera è sulla parete di fronte, a soli pochi passi dalla Nascita di Venere.',
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera',
          itemIds: primaveraVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'A caccia di Leonardo!',
          description: 'Uscite dalla Sala di Botticelli, girate a destra e camminate lungo il corridoio. Alla Sala 35 siete arrivati da Leonardo! L\'Annunciazione è sulla parete sinistra.',
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'L\'Annunciazione di Leonardo',
          itemIds: annunciazioneVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Ancora Leonardo!',
          description: 'Rimanete nella stessa sala di Leonardo. L\'Adorazione dei Magi è sulla parete di fronte a voi — il grande dipinto marrone che sembra incompiuto.',
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'L\'Adorazione dei Magi',
          itemIds: adorazioneVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso il quadro rotondo!',
          description: 'Continuate lungo il corridoio fino alla Sala 41. Appena entrate, cercate a destra il quadro tondo con la cornice di legno dorato — è unico nel suo genere!',
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Il Tondo Doni di Michelangelo',
          itemIds: tondoDoniVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 10,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Cercate l\'uccellino!',
          description: 'Rimanete nella stessa sala. La Madonna del Cardellino di Raffaello è sulla parete laterale sinistra — cercate il quadretto con il piccolo uccellino!',
          order: 11,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Madonna del Cardellino',
          itemIds: madonnaVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 12,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Verso la sala dei fiori!',
          description: 'Camminate lungo il corridoio fino alla grande Sala 83 con i dipinti veneziani. La Flora è la prima che vedrete a destra, la donna con i fiori.',
          order: 13,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Flora di Tiziano',
          itemIds: floraVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 14,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Girati dall\'altra parte!',
          description: 'Giratevi verso l\'altra parete della sala. La Venere di Urbino è lì di fronte a voi — la signora sdraiata sul letto.',
          order: 15,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Venere di Urbino',
          itemIds: venereUrbinoVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 16,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Attenti a non pietrificarvi!',
          description: 'Avanzate fino alla Sala 90. La Medusa è esposta su un supporto speciale al centro della sala — guardate, ma attenti a non pietrificarvi!',
          order: 17,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Medusa di Caravaggio',
          itemIds: medusaVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 18,
        },
        {
          id: generateEntityId('vs'),
          type: 'transition',
          title: 'Ultimi passi, quasi arrivati!',
          description: 'Percorrete ancora pochi passi fino alla Sala 96. La Giuditta è il grande dipinto sulla parete principale — si vede subito entrando, è molto drammatico!',
          order: 19,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Giuditta e Oloferne',
          itemIds: giudittaVariants,
          defaultRegister: 'elementare',
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 20,
        },
        {
          id: 'step-outro-uffizi-per-famiglie',
          type: 'logistics_intro',
          title: 'Missione compiuta!',
          description: 'L\'avventura tra i quadri degli Uffizi finisce qui. Bravissimi esploratori: potete uscire dalla stessa sala d\'ingresso o continuare a curiosare nel museo.',
          order: 21,
        },
      ],
    },
  ], (doc) => ({ slug: doc.slug }));

  const storedVisits = await Promise.all([
    Visit.findOne({ slug: 'highlights-degli-uffizi' }).lean(),
    Visit.findOne({ slug: 'capolavori-del-rinascimento' }).lean(),
    Visit.findOne({ slug: 'uffizi-per-famiglie' }).lean(),
  ]);

  [visHighlights, visRinascimento, visFamiglie] = storedVisits.map((visit) => visit.id);

  // ── COVER IMAGES ──────────────────────────────────────────────────────────
  // Cover del museo (dipinto PD "Tribuna degli Uffizi") e delle tre visite. Le
  // visite riusano i binari PD già scaricati per le opere, ma come Upload
  // distinti (filename cover-*) così la cover della visita non è accoppiata
  // all'asset dell'opera. In entrambi i casi si popola coverImage solo se vuoto,
  // mirror del guard su assets[] sopra: un upload dal Marketplace non viene mai
  // sovrascritto al re-seed.
  async function seedCoverImage(Model, targetId, sourceBasename, coverFilename) {
    const src = seedAssetFiles.find((f) => f.startsWith(`${sourceBasename}.`));
    if (!src) {
      console.warn(`  [seed] cover mancante in seed-assets/, salto: ${sourceBasename}`);
      return;
    }
    const data = fs.readFileSync(path.join(SEED_ASSETS_DIR, src));
    const ext = path.extname(src).toLowerCase();
    await Upload.updateOne(
      { filename: coverFilename },
      {
        $set: { mimeType: MIME_BY_EXT[ext], size: data.length, data, uploaderId: usrAdmin },
        $setOnInsert: { id: generateEntityId('upl') },
      },
      { upsert: true }
    );
    const upload = await Upload.findOne({ filename: coverFilename }).select('id').lean();
    await Model.updateOne(
      { id: targetId, $or: [{ coverImage: { $exists: false } }, { coverImage: null }, { coverImage: '' }] },
      { $set: { coverImage: `/uploads/${upload.id}` } }
    );
  }

  await seedCoverImage(Museum, musUffizi, 'museum-uffizi-tribuna', 'museum-uffizi-tribuna.jpg');
  await seedCoverImage(Visit, visHighlights, 'uo-ufz-001-nascita-di-venere', 'cover-highlights-degli-uffizi.jpg');
  await seedCoverImage(Visit, visRinascimento, 'uo-ufz-002-primavera', 'cover-capolavori-del-rinascimento.jpg');
  await seedCoverImage(Visit, visFamiglie, 'uo-ufz-006-madonna-del-cardellino', 'cover-uffizi-per-famiglie.jpg');

  // ── ACTIVITY e APIKEY ─────────────────────────────────────────────────────

  await upsertMany(Activity, [
    {
      id: generateEntityId('act'),
      userId: usrAutore1,
      action: 'Published artwork',
      entityType: 'artwork',
      entityId: artVenere,
      entityName: 'La nascita di Venere',
      museumId: musUffizi,
      timestamp: new Date(),
    },
  ], (doc) => ({
    userId: doc.userId,
    entityType: doc.entityType,
    entityId: doc.entityId,
    action: doc.action,
  }));

  const rawApiKey = BOOTSTRAP_API_KEY;
  await upsertMany(ApiKey, [{
    id: generateEntityId('key'),
    name: 'bootstrap-dev-key',
    prefix: rawApiKey.slice(0, 8),
    keyHash: ApiKey.hashValue(rawApiKey),
    status: 'active',
    createdByUserId: usrAdmin,
  }], (doc) => ({ name: doc.name }));

  console.log('');
  console.log('Seed completato con successo!');
  console.log('');
  console.log('  Museo:     Galleria degli Uffizi (' + musUffizi + ')');
  console.log('  Utenti:    5  (admin, autore1, autore2, visitatore1, visitatore2)');
  console.log('  Opere:     12');
  console.log('  Immagini:  ' + seededImages + '/12 riproduzioni PD (Wikimedia Commons) su /uploads');
  console.log('  Items:     56 su due assi (registro × durata)');
  console.log('             · 8 opere: elementare 1min + avanzato 4min');
  console.log('             · Venere, Primavera, Medusa, Giuditta: 5 registri, con');
  console.log('               1/2/4min su elementare e medio e 2/4min su avanzato');
  console.log('  Visite:    3  (Highlights 26 step, Rinascimento 22 step, Famiglie 22 step)');
  console.log('');
  console.log('  Password di tutti gli utenti: 12345678');
  console.log('  API key di bootstrap: ' + rawApiKey);
  console.log('');
}

module.exports = seed;

if (require.main === module) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  }).finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    process.exit(0);
  });
}

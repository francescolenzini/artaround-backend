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
  // Secondo candidato per la coppia (Venere, medio): esercita la scelta con
  // preview nel Visit Builder.
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
      classification: { fruitionLength: '1min', languageCode: 'it', languageRegister: 'medio' },
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
  ], (doc) => ({
    // Il titolo distingue anche i candidati multipli sullo stesso registro
    // (es. i due "medio" della Nascita di Venere).
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

  // Mappe registro→item riusate dagli step delle visite: la stessa tappa serve
  // tutti i registri disponibili per quell'opera.
  const venereRegisters = { infantile: iVenereIn, elementare: iVenereEl, medio: iVenereMd, avanzato: iVenereAv, specialistico: iVenereSp };
  const primaveraRegisters = { infantile: iPrimaveraIn, elementare: iPrimaveraEl, medio: iPrimaveraMd, avanzato: iPrimaveraAv, specialistico: iPrimaveraSp };
  const medusaRegisters = { infantile: iMedusaIn, elementare: iMedusaEl, medio: iMedusaMd, avanzato: iMedusaAv, specialistico: iMedusaSp };
  const giudittaRegisters = { infantile: iGiudittaIn, elementare: iGiudittaEl, medio: iGiudittaMd, avanzato: iGiudittaAv, specialistico: iGiudittaSp };
  const annunciazioneRegisters = { elementare: iAnnunciazioneEl, avanzato: iAnnunciazioneAv };
  const adorazioneRegisters = { elementare: iAdorazioneEl, avanzato: iAdorazioneAv };
  const tondoDoniRegisters = { elementare: iTondoDoniEl, avanzato: iTondoDoniAv };
  const madonnaRegisters = { elementare: iMadonnaEl, avanzato: iMadonnaAv };
  const leoneXRegisters = { elementare: iLeoneXEl, avanzato: iLeoneXAv };
  const venereUrbinoRegisters = { elementare: iVenereUrbinoEl, avanzato: iVenereUrbinoAv };
  const floraRegisters = { elementare: iFloraEl, avanzato: iFloraAv };
  const sacrificioRegisters = { elementare: iSacrifEl, avanzato: iSacrifAv };

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
          id: generateEntityId('vs'),
          type: 'logistics_intro',
          title: 'Benvenuto agli Uffizi',
          description: 'Siete entrati dalla biglietteria principale al piano terra. Salite al primo piano tramite l\'ascensore o la scala monumentale. La visita inizia dalla Sala 10-14, dedicata a Botticelli — seguite i pannelli indicativi.',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera — Botticelli',
          directionsFromPrevious: 'Entrate nella Sala 10-14 di Botticelli. La Primavera è sulla parete di fondo a sinistra: il grande dipinto con le figure su sfondo scuro.',
          itemsByRegister: primaveraRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere — Botticelli',
          directionsFromPrevious: 'Rimanete nella stessa sala. La Nascita di Venere è sulla parete opposta alla Primavera, a pochi passi.',
          itemsByRegister: venereRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Annunciazione — Leonardo da Vinci',
          directionsFromPrevious: 'Uscite dalla Sala 10-14, girate a destra nel corridoio e percorretelo fino alla Sala 35 (Leonardo). L\'Annunciazione è la prima grande opera sulla parete sinistra entrando.',
          itemsByRegister: annunciazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Adorazione dei Magi — Leonardo da Vinci',
          directionsFromPrevious: 'Rimanete nella Sala 35. L\'Adorazione dei Magi è sulla parete di fronte, in posizione centrale.',
          itemsByRegister: adorazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Tondo Doni — Michelangelo',
          directionsFromPrevious: 'Proseguite lungo il corridoio fino alla Sala 41 (Michelangelo e Raffaello). Il Tondo Doni è nella prima nicchia a destra entrando, riconoscibile per la cornice in legno dorato e la forma circolare.',
          itemsByRegister: tondoDoniRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Madonna del Cardellino — Raffaello',
          directionsFromPrevious: 'Rimanete nella Sala 41. La Madonna del Cardellino di Raffaello è sulla parete laterale sinistra, non lontano dal Tondo Doni.',
          itemsByRegister: madonnaRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Ritratto di Leone X — Raffaello',
          directionsFromPrevious: 'Spostatevi verso la parete di fondo della Sala 41: il Ritratto di Leone X occupa una posizione centrale di grande visibilità.',
          itemsByRegister: leoneXRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Flora — Tiziano',
          directionsFromPrevious: 'Uscite dalla Sala 41 e avanzate lungo il corridoio fino alla Sala 83 (Tiziano e pittura veneziana). La Flora è nella prima sala veneziana, sulla parete destra.',
          itemsByRegister: floraRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Venere di Urbino — Tiziano',
          directionsFromPrevious: 'Rimanete nella Sala 83. La Venere di Urbino è esposta sulla parete opposta alla Flora, di fronte a voi.',
          itemsByRegister: venereUrbinoRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Medusa — Caravaggio',
          directionsFromPrevious: 'Percorrete il corridoio fino alla Sala 90 (Caravaggio). La Medusa è esposta su un supporto apposito al centro della sala, visibile da tutti i lati.',
          itemsByRegister: medusaRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 10,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Sacrificio di Isacco — Caravaggio',
          directionsFromPrevious: 'Rimanete nella Sala 90. Il Sacrificio di Isacco è appeso sulla parete sinistra, accanto alla Medusa.',
          itemsByRegister: sacrificioRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 11,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Giuditta e Oloferne — Artemisia Gentileschi',
          directionsFromPrevious: 'Proseguite nella Sala 96 (Artemisia Gentileschi). La Giuditta è l\'opera principale della sala, visibile appena entrati sulla parete di fondo.',
          itemsByRegister: giudittaRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 12,
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
          id: generateEntityId('vs'),
          type: 'logistics_intro',
          title: 'Introduzione al percorso',
          description: 'Questo percorso dura circa 90 minuti e richiede attenzione prolungata. Si consiglia di scaricare la visita prima dell\'ingresso. Si parte dalla Sala 10-14 (Botticelli), primo piano.',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera — analisi critica',
          directionsFromPrevious: 'Dal primo piano, percorrete il corridoio est fino alla Sala 10-14. La Primavera è sulla parete di fondo a sinistra.',
          itemsByRegister: primaveraRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere — analisi critica',
          directionsFromPrevious: 'Rimanete nella Sala 10-14. La Nascita di Venere è sulla parete opposta, visibile a pochi passi.',
          itemsByRegister: venereRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Annunciazione — analisi critica',
          directionsFromPrevious: 'Uscite dalla Sala 10-14, girate a destra e percorrete il corridoio fino alla Sala 35 (Leonardo da Vinci). L\'Annunciazione è sulla parete sinistra entrando.',
          itemsByRegister: annunciazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Adorazione dei Magi — analisi critica',
          directionsFromPrevious: 'Rimanete nella Sala 35. L\'Adorazione dei Magi è sulla parete frontale, in posizione centrale.',
          itemsByRegister: adorazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Tondo Doni — analisi critica',
          directionsFromPrevious: 'Avanzate lungo il corridoio fino alla Sala 41 (Michelangelo e Raffaello). Il Tondo Doni è nella prima nicchia a destra entrando nella sala.',
          itemsByRegister: tondoDoniRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Madonna del Cardellino — analisi critica',
          directionsFromPrevious: 'Rimanete nella Sala 41. La Madonna del Cardellino è sulla parete laterale sinistra.',
          itemsByRegister: madonnaRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Ritratto di Leone X — analisi critica',
          directionsFromPrevious: 'Spostatevi verso la parete di fondo della Sala 41: il Ritratto di Leone X è esposto in posizione preminente.',
          itemsByRegister: leoneXRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Flora — analisi critica',
          directionsFromPrevious: 'Uscite dalla Sala 41 e percorrete il corridoio fino alla Sala 83 (pittura veneziana, Tiziano). La Flora è sulla parete destra della sala.',
          itemsByRegister: floraRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Venere di Urbino — analisi critica',
          directionsFromPrevious: 'Rimanete nella Sala 83. Voltate verso la parete opposta: la Venere di Urbino è il pendant della Flora.',
          itemsByRegister: venereUrbinoRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Sacrificio di Isacco — analisi critica',
          directionsFromPrevious: 'Continuate verso la Sala 90 (Caravaggio). Il Sacrificio di Isacco è sulla parete sinistra della sala.',
          itemsByRegister: sacrificioRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 10,
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
          id: generateEntityId('vs'),
          type: 'logistics_intro',
          title: 'Pronti per l\'avventura!',
          description: 'Benvenuti agli Uffizi! Oggi faremo un viaggio nel tempo tra quadri bellissimi. Seguite i grandi al primo piano e iniziamo dalla Sala di Botticelli — si parte!',
          order: 0,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La nascita di Venere',
          directionsFromPrevious: 'Salite al primo piano e seguite il corridoio fino alla Sala 10-14. La Nascita di Venere è sulla parete di fondo — la vedrete subito, è grandissima!',
          itemsByRegister: venereRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 1,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Primavera',
          directionsFromPrevious: 'Giratevi: La Primavera è sulla parete di fronte, a soli pochi passi dalla Nascita di Venere.',
          itemsByRegister: primaveraRegisters,
          mapCoords: { x: 43.9, y: 23.2, floor: 1 },
          order: 2,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'L\'Annunciazione di Leonardo',
          directionsFromPrevious: 'Uscite dalla Sala di Botticelli, girate a destra e camminate lungo il corridoio. Alla Sala 35 siete arrivati da Leonardo! L\'Annunciazione è sulla parete sinistra.',
          itemsByRegister: annunciazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 3,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'L\'Adorazione dei Magi',
          directionsFromPrevious: 'Rimanete nella stessa sala di Leonardo. L\'Adorazione dei Magi è sulla parete di fronte a voi — il grande dipinto marrone che sembra incompiuto.',
          itemsByRegister: adorazioneRegisters,
          mapCoords: { x: 70.1, y: 66.2, floor: 1 },
          order: 4,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Il Tondo Doni di Michelangelo',
          directionsFromPrevious: 'Continuate lungo il corridoio fino alla Sala 41. Appena entrate, cercate a destra il quadro tondo con la cornice di legno dorato — è unico nel suo genere!',
          itemsByRegister: tondoDoniRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 5,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Madonna del Cardellino',
          directionsFromPrevious: 'Rimanete nella stessa sala. La Madonna del Cardellino di Raffaello è sulla parete laterale sinistra — cercate il quadretto con il piccolo uccellino!',
          itemsByRegister: madonnaRegisters,
          mapCoords: { x: 56.9, y: 66.2, floor: 1 },
          order: 6,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Flora di Tiziano',
          directionsFromPrevious: 'Camminate lungo il corridoio fino alla grande Sala 83 con i dipinti veneziani. La Flora è la prima che vedrete a destra, la donna con i fiori.',
          itemsByRegister: floraRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 7,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Venere di Urbino',
          directionsFromPrevious: 'Giratevi verso l\'altra parete della sala. La Venere di Urbino è lì di fronte a voi — la signora sdraiata sul letto.',
          itemsByRegister: venereUrbinoRegisters,
          mapCoords: { x: 83.5, y: 82.7, floor: 2 },
          order: 8,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'La Medusa di Caravaggio',
          directionsFromPrevious: 'Avanzate fino alla Sala 90. La Medusa è esposta su un supporto speciale al centro della sala — guardate, ma attenti a non pietrificarvi!',
          itemsByRegister: medusaRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 9,
        },
        {
          id: generateEntityId('vs'),
          type: 'main_item',
          title: 'Giuditta e Oloferne',
          directionsFromPrevious: 'Percorrete ancora pochi passi fino alla Sala 96. La Giuditta è il grande dipinto sulla parete principale — si vede subito entrando, è molto drammatico!',
          itemsByRegister: giudittaRegisters,
          mapCoords: { x: 73.6, y: 19.2, floor: 2 },
          order: 10,
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
  console.log('  Items:     37 (elementare + avanzato per tutte; 5 registri completi per');
  console.log('             Venere, Primavera, Medusa e Giuditta; 2 candidati "medio" per Venere)');
  console.log('  Visite:    3  (Highlights 13 step, Rinascimento 11 step, Famiglie 11 step)');
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

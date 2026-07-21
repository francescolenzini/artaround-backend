# artaround-backend

API REST del progetto ArtAround — Node.js + Express + MongoDB (Mongoose).
Auth a due livelli (API key + JWT), RBAC a tre ruoli, multi-tenant, paginazione
server-side, logging richieste con masking, Swagger protetto da Basic Auth, suite
di test (Jest + mongodb-memory-server).

Progetto **autonomo**: si sviluppa e si esegue anche da solo, senza il repo
`artaround` (che lo userà come submodule insieme a Navigator e Marketplace).

> **Esecuzione: esclusivamente via Docker.** Non è previsto l'avvio nativo (`npm`
> diretto sull'host): tutte le variabili d'ambiente sono fornite dai file
> `docker-compose`. Per questo il repo non contiene un `.env.example` app-level.

## Struttura del repo

```
.
├── app/                    # applicazione (unico artefatto copiato in produzione)
│   ├── server.js           # entry-point: avvia buildApp() e mette in ascolto
│   ├── src/                # app.js (Express app), config/, models/, routes/,
│   │                       # middleware/, services/, scripts/ (seed, apikey-cli), docs/ (openapi)
│   └── public/             # asset statici serviti da express.static (es. /up.html)
├── tests/                  # unit + integration (Jest) — NON entra nell'immagine di produzione
├── docker/
│   ├── Dockerfile              # immagine di SVILUPPO
│   ├── Dockerfile.prod         # immagine di PRODUZIONE (solo API)
│   ├── docker-compose.yml      # topologia di SVILUPPO: backend + mongo
│   └── docker-compose.prod.yml # topologia di PRODUZIONE: backend + mongo
├── .dockerignore
├── package.json
└── jest.config.js
```

---

## La dockerizzazione, in dettaglio

Il progetto ha **due topologie indipendenti**, una per lo sviluppo e una per la
produzione standalone di questo backend. Non condividono Dockerfile né nomi di
servizio: sono pensate per scopi diversi ed è importante non confonderle.

### File coinvolti e ruolo di ciascuno

| File | Usato da | Ruolo |
|---|---|---|
| `docker/Dockerfile` | `docker-compose.yml` (dev) | Immagine singolo-stage `node:20-alpine`. Installa le dipendenze (incluse le devDependencies, serve `nodemon`) e lancia `npm run dev`. Pensata per essere usata con il sorgente bind-mounted sopra (vedi sotto): il `COPY . .` è solo un fallback per un eventuale avvio senza bind-mount. |
| `docker/Dockerfile.prod` | `docker-compose.prod.yml` (prod) | Multi-stage: uno stage `deps` installa **solo** le dipendenze di produzione (`npm ci --omit=dev`), lo stage `runtime` copia `node_modules` + `package*.json` + la sola cartella `app/` (niente `tests/`, niente `docker/`). Esegue come utente non privilegiato `node`. Nessun hot-reload: `CMD node app/server.js`. |
| `docker/docker-compose.yml` | sviluppo | Due servizi: **`app`** (backend, build da `Dockerfile`) e **`database`** (Mongo). Bind-mount del sorgente + volumi per `node_modules` e dati Mongo (vedi sotto). Tutte le variabili hanno un default: parte con `docker compose up` senza alcun file `.env`. |
| `docker/docker-compose.prod.yml` | produzione standalone | Due servizi: **`backend`** (build da `Dockerfile.prod`) e **`mongo`**. Tre variabili sono **obbligatorie** (`MONGO_PASSWORD`, `JWT_SECRET`, `SWAGGER_PASSWORD`): il compose si rifiuta di partire se mancano. |
| `.dockerignore` | entrambe le build | Esclude da ogni contesto di build: `node_modules`, `tests/`, `docker/` stesso, file di log, `.git`, `.env*`. Tiene piccolo il context e impedisce che segreti locali finiscano in un layer immagine. |

> **Attenzione ai nomi di servizio: sono diversi tra dev e produzione.**
> In sviluppo il backend è il servizio **`app`** e Mongo è **`database`**.
> In produzione il backend è il servizio **`backend`** e Mongo è **`mongo`**.
> I comandi `docker compose ... run --rm <servizio> ...` più sotto usano già il
> nome corretto per ciascun contesto — se scrivi un comando a mano, verifica quale
> dei due compose stai usando.

### Mappa delle porte

| Ambiente | Servizio | Host | Container | Note |
|---|---|---|---|---|
| Dev | `app` (API/Swagger) | `3002` | `3001` | host `3002` per evitare il conflitto con Docker Desktop su `3001` (Windows) |
| Dev | `app` (debugger Node) | `9229` | `9229` | `chrome://inspect` o VS Code |
| Dev | `database` (Mongo) | `27017` | `27017` | pubblicata per ispezione da client esterni (Compass, mongosh) |
| Prod | `backend` (API) | `${BACKEND_PORT:-3001}` | `3001` | configurabile via env |
| Prod | `mongo` | — | `27017` | **non pubblicata sull'host** (`expose`, solo rete interna) |

### Volumi: bind-mount per il codice, volumi named per il resto

Solo in sviluppo (`docker-compose.yml`); la produzione non ha bind-mount:

- **`..:/app`** (bind-mount) — monta l'intero repo dentro il container. È ciò che
  rende vivo l'hot-reload: modifichi un file sull'host, `nodemon --legacy-watch`
  (con `CHOKIDAR_USEPOLLING=true`, necessario su bind-mount macOS/Windows) lo
  rileva e riavvia il processo.
- **`backend_node_modules:/app/node_modules`** (volume named) — evita che il
  bind-mount del sorgente "nasconda" le dipendenze già installate nell'immagine.
  Senza questo volume, ogni avvio richiederebbe un `npm install` a runtime e le
  performance del filesystem bind-mounted su Docker Desktop (mac/Win) sarebbero
  penalizzanti.
- **`mongo_data:/data/db`** (volume named, sia dev sia prod) — persiste i dati tra
  restart. Si azzera con `docker compose ... down -v`.

### Health check e ordine di avvio

Il servizio Mongo (`database` in dev, `mongo` in prod) ha un `healthcheck` basato
su `mongosh` + ping autenticato; il servizio backend dichiara
`depends_on: { condition: service_healthy }`, quindi Compose non avvia il backend
finché Mongo non risponde davvero (non solo "container up", ma "pronto ad
accettare connessioni autenticate").

---

## Sviluppo (Docker)

Nessuna configurazione richiesta: il compose di sviluppo ha un default per ogni
variabile.

```bash
# build + avvio di backend (app) e mongo (database)
docker compose -f docker/docker-compose.yml up -d --build

# popola il DB e stampa la API key di bootstrap
docker compose -f docker/docker-compose.yml run --rm app npm run seed

# log in tempo reale
docker compose -f docker/docker-compose.yml logs -f app
```

- API / Swagger → <http://localhost:3002/docs> (Basic Auth: `swagger` / `swagger`)
- Pagina di stato → <http://localhost:3002/up.html>
- Health check applicativo → <http://localhost:3002/health>
- Debugger Node → porta `9229`

Stop / reset:

```bash
docker compose -f docker/docker-compose.yml down       # stop
docker compose -f docker/docker-compose.yml down -v     # stop + cancella i dati Mongo
```

### Nota su Swagger "Try it out"

`app/src/docs/openapi.js` dichiara `servers: [{ url: '/' }]` (URL relativo): il
pulsante "Try it out" di Swagger UI chiama sempre la stessa origine da cui `/docs`
è servito, qualunque sia la porta pubblicata sull'host. Se in futuro vedessi un
errore "Failed to fetch" da Swagger, il primo sospetto è che questo campo sia
tornato a un URL assoluto (es. `http://localhost:3001`) disallineato dalla porta
pubblicata.

### Nota sul messaggio dell'inspector

Nei log del container di sviluppo compare due volte una riga innocua:

```
Starting inspector on 0.0.0.0:9229 failed: address already in use
```

È dovuta al fatto che sia il processo `nodemon` sia il processo Node figlio che
avvia ereditano `NODE_OPTIONS=--inspect=0.0.0.0:9229`: solo uno dei due riesce ad
aprire la porta. Non impedisce l'avvio dell'app né del debugger.

---

## Test

La suite (Jest) vive in `tests/unit/` e `tests/integration/` e usa
**`mongodb-memory-server`**: ogni test avvia un MongoDB effimero in-memory,
indipendente dal container `database`/`mongo` del compose.

| File | Cosa copre |
|---|---|
| `tests/unit/middleware/auth.test.js` | auth a due livelli (API key + JWT) e RBAC: chiave mancante, chiave valida, JWT valido, richiesta di entrambi, enforcement dei ruoli |
| `tests/unit/services/pagination.test.js` | servizio di paginazione: alias di sort/ricerca, filtri JSON + filtri query combinati |
| `tests/integration/smoke.integration.test.js` | `/health`, `/docs-json` protetto da Basic Auth, login con API key valida, login rifiutato senza API key |
| `tests/integration/artworks.crud.integration.test.js` | CRUD di un'opera da `super_admin`, scoping di un `author` ai musei assegnati, `visitor` in sola lettura, rifiuto senza JWT |
| `tests/integration/seed.integration.test.js` | idempotenza del seed (il museo Uffizi resta stabile su esecuzioni ripetute) |

Script disponibili (da `package.json`): `test`, `test:unit`, `test:integration`,
`test:watch`, `test:ci` (con coverage su `app/src/**`).

### ⚠️ Non eseguire i test con l'immagine di sviluppo così com'è

`mongodb-memory-server` scarica un binario ufficiale di MongoDB linkato con
**glibc**. L'immagine di sviluppo è `node:20-alpine`, basata su **musl**: lanciare
`npm test` dentro il container `app` fallisce (tipicamente con un errore di avvio
del binario `mongod`, non un fallimento dei test stessi).

Esegui i test con un'immagine Node su base **glibc**, ad esempio così (dalla radice
del repo, non richiede alcun file locale aggiuntivo):

```bash
docker run --rm -v "$PWD":/app -v /app/node_modules -w /app node:20 \
  sh -c "npm ci && npm test"
```

Sostituisci `npm test` con `npm run test:unit` o `npm run test:integration` per un
sottoinsieme. Il volume anonimo su `/app/node_modules` evita di scrivere un
`node_modules` per Linux dentro la cartella del progetto sull'host.

---

## Produzione (Docker, solo API)

`Dockerfile.prod` / `docker-compose.prod.yml` eseguono **solo le API**
(`node app/server.js`): il backend non serve alcun frontend, per restare a
singola responsabilità.

Il compose di produzione richiede alcuni **segreti obbligatori**. Crea un file
`.env` (non versionato) accanto al progetto, oppure esporta le variabili in shell:

```dotenv
# .env di PRODUZIONE — NON versionare
MONGO_USER=artaround
MONGO_PASSWORD=<password-robusta>
MONGO_DB=artaround
JWT_SECRET=<segreto-lungo-e-casuale>      # es. openssl rand -hex 32
JWT_EXPIRES_IN=8h
SWAGGER_USER=swagger
SWAGGER_PASSWORD=<password>
BACKEND_PORT=3001
```

```bash
docker compose -f docker/docker-compose.prod.yml --env-file .env up -d --build

# seed una tantum -> stampa la API key
docker compose -f docker/docker-compose.prod.yml --env-file .env run --rm backend npm run seed
```

Per il deploy sui **due container del dipartimento** (un unico container Node che
serve API + Navigator + Marketplace, più Mongo) si usa il repo **artaround**,
che assembla i build dei tre componenti — questo compose di produzione standalone
serve a validare il backend da solo, non è il percorso di consegna finale.

---

## Variabili d'ambiente

Le variabili sono lette da `process.env` (vedi `app/src/config/env.js`) e fornite
esclusivamente dai file `docker-compose` — non esiste un `.env.example` app-level.

| Variabile | Sviluppo (default) | Produzione |
|---|---|---|
| `PORT` | `3001` | `3001` (fisso interno; esposta via `BACKEND_PORT`) |
| `NODE_ENV` | `development` | `production` |
| `MONGO_URI` | costruita da `MONGO_USER`/`MONGO_PASSWORD`/`MONGO_DB` verso il servizio `database` | idem, verso il servizio `mongo` |
| `JWT_SECRET` | `dev-jwt-secret-change-me` | **obbligatoria**, nessun default |
| `JWT_EXPIRES_IN` | `8h` | `8h` |
| `SWAGGER_USER` | `swagger` | `swagger` |
| `SWAGGER_PASSWORD` | `swagger` | **obbligatoria**, nessun default |
| `MONGO_PASSWORD` | `artaround` | **obbligatoria**, nessun default |

## Script principali (eseguiti nel container)

| Comando | Azione |
|---|---|
| `npm run dev` | avvio con nodemon (`app/server.js`), usato da `docker/Dockerfile` |
| `npm start` | avvio produzione (`node app/server.js`), usato da `docker/Dockerfile.prod` |
| `npm run seed` | popola il DB e stampa la API key di bootstrap |
| `npm run apikey` | CLI gestione API key (`app/src/scripts/apikey-cli.js`) |
| `npm test` / `test:unit` / `test:integration` / `test:ci` | suite Jest — vedi nota sull'immagine glibc sopra |

## Troubleshooting

| Sintomo | Causa probabile | Rimedio |
|---|---|---|
| `service "backend" is not defined` (dev) | nome servizio sbagliato | in dev il servizio si chiama `app`, non `backend` |
| `getaddrinfo ENOTFOUND mongo` / `ENOTFOUND database` | l'host in `MONGO_URI` non combacia col nome del servizio Mongo nel compose in uso | in dev dev'essere `@database:27017`, in prod `@mongo:27017` |
| Swagger "Try it out" → `Failed to fetch` | `servers` in `openapi.js` punta a un URL assoluto/porta sbagliata | deve restare `{ url: '/' }` (relativo) |
| `npm test` fallisce nel container di sviluppo | `mongodb-memory-server` richiede glibc, l'immagine dev è Alpine/musl | esegui i test con l'immagine `node:20` (vedi sezione Test) |
| Login fallisce con `Invalid API key` | API key mancante o vecchia | ri-esegui `npm run seed`, usa la chiave appena stampata |
| Porta 3001 occupata (Windows) | Docker Desktop la usa | in dev il backend è pubblicato su **3002** |

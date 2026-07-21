# -----------------------------------------------------------------------------
# ArtAround Backend — immagine di SVILUPPO (progetto autonomo)
# App sotto app/ (app/server.js, app/src/...). Hot-reload con nodemon + inspector.
# In sviluppo il sorgente è bind-mounted; node_modules vive in un volume anonimo.
# -----------------------------------------------------------------------------
FROM node:20-alpine

ENV NODE_ENV=development
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

EXPOSE 3001 9229

CMD ["npm", "run", "dev"]

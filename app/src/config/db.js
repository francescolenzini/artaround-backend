const mongoose = require('mongoose');
const env = require('./env');

// L'URI si rilegge da process.env a ogni chiamata, non al caricamento del
// modulo: chi importa `connectDb` puo' farlo prima che l'URI definitivo sia
// noto (i test lo impostano sul mongo in memoria dentro beforeAll, quando
// questo file e' gia' in cache). Leggendolo qui, connectDb() usa sempre
// l'ultimo valore invece di quello catturato all'import. `env.mongoUri` resta
// il ripiego e porta con se' il default di sviluppo.
async function connectDb() {
  await mongoose.connect(process.env.MONGO_URI || env.mongoUri, {
    autoIndex: true,
  });
}

module.exports = { connectDb };

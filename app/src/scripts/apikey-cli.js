const crypto = require('crypto');

const { connectDb } = require('../config/db');
const ApiKey = require('../models/ApiKey');

async function main() {
  await connectDb();

  const [command, ...args] = process.argv.slice(2);

  if (command === 'generate') {
    const nameArg = args.find((arg) => arg.startsWith('--name='));
    const createdByArg = args.find((arg) => arg.startsWith('--createdBy='));
    const name = nameArg ? nameArg.split('=')[1] : 'console-key';
    const createdByUserId = createdByArg ? createdByArg.split('=')[1] : 'system';

    const raw = crypto.randomBytes(32).toString('hex');

    const key = await ApiKey.create({
      name,
      prefix: raw.slice(0, 8),
      keyHash: ApiKey.hashValue(raw),
      status: 'active',
      createdByUserId,
    });

    console.log('API key generated:');
    console.log(`prefix=${key.prefix}`);
    console.log(`value=${raw}`);
    process.exit(0);
  }

  if (command === 'disable') {
    const prefixArg = args.find((arg) => arg.startsWith('--prefix='));
    const disabledByArg = args.find((arg) => arg.startsWith('--disabledBy='));

    if (!prefixArg) {
      console.error('Missing --prefix=<prefix>');
      process.exit(1);
    }

    const prefix = prefixArg.split('=')[1];
    const disabledByUserId = disabledByArg ? disabledByArg.split('=')[1] : 'system';

    const key = await ApiKey.findOne({ prefix });

    if (!key) {
      console.error('API key not found');
      process.exit(1);
    }

    key.status = 'disabled';
    key.disabledByUserId = disabledByUserId;
    key.disabledAt = new Date();
    await key.save();

    console.log(`API key ${prefix} disabled`);
    process.exit(0);
  }

  if (command === 'list') {
    const keys = await ApiKey.find().select('-keyHash').sort({ createdAt: -1 });
    console.table(
      keys.map((key) => ({
        name: key.name,
        prefix: key.prefix,
        status: key.status,
        createdByUserId: key.createdByUserId,
        disabledByUserId: key.disabledByUserId,
        lastUsedAt: key.lastUsedAt,
      }))
    );
    process.exit(0);
  }

  console.log('Usage:');
  console.log('  node src/scripts/apikey-cli.js generate --name=<name> --createdBy=<userId>');
  console.log('  node src/scripts/apikey-cli.js disable --prefix=<prefix> --disabledBy=<userId>');
  console.log('  node src/scripts/apikey-cli.js list');
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

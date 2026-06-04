require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

function encrypt(text) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

async function main() {
  const client = await p.client.findFirst({ where: { name: 'Agence Laforet Clichy' } });
  await p.ovhConfig.upsert({
    where: { clientId: client.id },
    update: {
      endpoint: 'ovh-eu',
      applicationKey: 'FAKE_AK_TEST',
      applicationSecret: encrypt('FAKE_AS_TEST'),
      consumerKey: encrypt('FAKE_CK_TEST'),
    },
    create: {
      clientId: client.id,
      endpoint: 'ovh-eu',
      applicationKey: 'FAKE_AK_TEST',
      applicationSecret: encrypt('FAKE_AS_TEST'),
      consumerKey: encrypt('FAKE_CK_TEST'),
    },
  });
  console.log('OVH test config inserted');
}
main().catch(console.error).finally(() => p.$disconnect());

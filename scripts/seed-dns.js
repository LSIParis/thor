require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const client = await prisma.client.findFirst({ where: { name: 'Agence Laforet Clichy' } });

  await prisma.dnsZone.createMany({
    data: [
      { clientId: client.id, domain: 'laforet-clichy.fr', registrar: 'OVH', registrationDate: new Date('2020-03-15'), expiryDate: new Date('2026-03-15'), autoRenew: true },
      { clientId: client.id, domain: 'laforet-clichy.com', registrar: 'OVH', registrationDate: new Date('2020-03-15'), expiryDate: new Date('2025-08-15'), autoRenew: false, notes: 'Redirection vers .fr' },
    ],
  });

  const zone = await prisma.dnsZone.findFirst({ where: { domain: 'laforet-clichy.fr' } });
  await prisma.dnsRecord.createMany({
    data: [
      { zoneId: zone.id, type: 'A',     name: '@',    value: '89.185.43.12',               ttl: 3600 },
      { zoneId: zone.id, type: 'A',     name: 'www',  value: '89.185.43.12',               ttl: 3600 },
      { zoneId: zone.id, type: 'CNAME', name: 'mail', value: 'ghs.google.com.',             ttl: 3600 },
      { zoneId: zone.id, type: 'MX',    name: '@',    value: 'aspmx.l.google.com.',         ttl: 3600, priority: 1 },
      { zoneId: zone.id, type: 'MX',    name: '@',    value: 'alt1.aspmx.l.google.com.',    ttl: 3600, priority: 5 },
      { zoneId: zone.id, type: 'TXT',   name: '@',    value: 'v=spf1 include:_spf.google.com ~all', ttl: 3600 },
      { zoneId: zone.id, type: 'TXT',   name: '@',    value: 'google-site-verification=xxxxxxxxxxx', ttl: 3600 },
    ],
  });

  await prisma.sslCertificate.createMany({
    data: [
      { clientId: client.id, domain: 'laforet-clichy.fr', issuer: "Let's Encrypt", type: 'DV', issuedDate: new Date('2025-03-01'), expiryDate: new Date('2025-06-15'), autoRenew: true },
      { clientId: client.id, domain: '*.laforet-clichy.fr', issuer: 'Sectigo', type: 'Wildcard', issuedDate: new Date('2024-09-01'), expiryDate: new Date('2025-09-01'), autoRenew: false },
    ],
  });

  await prisma.hosting.createMany({
    data: [
      { clientId: client.id, name: 'Site vitrine', type: 'Mutualisé', provider: 'OVH', url: 'https://laforet-clichy.fr', ipAddress: '89.185.43.12', plan: 'Pro', renewalDate: new Date('2026-01-15') },
      { clientId: client.id, name: 'VPS Mail', type: 'VPS', provider: 'Scaleway', ipAddress: '51.158.72.44', plan: 'DEV1-S', renewalDate: new Date('2025-12-01') },
    ],
  });

  console.log('DNS data seeded OK');
}

main().catch(console.error).finally(() => prisma.$disconnect());

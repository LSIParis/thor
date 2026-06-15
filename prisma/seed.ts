import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('Admin1234!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@lsi-maintenance.fr' },
    update: { emailVerified: true, passwordHash: hash },
    create: {
      name: 'Administrateur',
      email: 'admin@lsi-maintenance.fr',
      passwordHash: hash,
      role: 'ADMIN',
      emailVerified: true,
    },
  })
  console.log('Admin user seeded: admin@lsi-maintenance.fr / Admin1234!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

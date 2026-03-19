import { PrismaClient } from '@prisma/client';
import { hashPassword } from './auth.js';

const prisma = new PrismaClient();

async function seed() {
  // Create admin user
  const adminHash = await hashPassword('admin123');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminHash, role: 'admin' },
  });

  // Create default spaces
  const merchantSpace = await prisma.space.upsert({
    where: { id: 1 },
    update: {},
    create: { name: '商户数据', description: '商户手机号数据', isPrimary: true },
  });

  const purchaseSpace = await prisma.space.upsert({
    where: { id: 2 },
    update: {},
    create: { name: '采购数据', description: '采购手机号数据' },
  });

  // Create default channels
  await prisma.channel.upsert({
    where: { id: 1 },
    update: {},
    create: { name: '渠道A', spaceId: merchantSpace.id, description: '默认渠道A' },
  });
  await prisma.channel.upsert({
    where: { id: 2 },
    update: {},
    create: { name: '渠道B', spaceId: merchantSpace.id, description: '默认渠道B' },
  });
  await prisma.channel.upsert({
    where: { id: 3 },
    update: {},
    create: { name: '采购渠道', spaceId: purchaseSpace.id, description: '默认采购渠道' },
  });

  console.log('Seed completed: admin/admin123');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

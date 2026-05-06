import { PrismaClient } from '@prisma/client';

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) throw new Error('DATABASE_URL is required for tests');

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

export async function cleanDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.timeLog.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.groupMember.deleteMany(),
    prisma.group.deleteMany(),
    prisma.task.deleteMany(),
    prisma.document.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
    prisma.project.deleteMany(),
  ]);
}

export async function createTestUser(overrides: {
  email?: string;
  name?: string;
  role?: string;
  password?: string;
} = {}) {
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash(overrides.password ?? 'Password123!', 10);
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}@test.com`,
      name: overrides.name ?? 'Test User',
      password: hash,
      role: overrides.role as never ?? 'JUNIOR_MEMBER',
    },
  });
}

export { prisma as testPrisma };

import { PrismaClient, Role, TaskStatus, Priority, AvailabilityStatus, MessageType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  console.log('🌱 Starting seed...');

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST);

  // ─── Step 1: Admin ────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'alice@tms.dev' },
    update: {},
    create: {
      email: 'alice@tms.dev',
      name: 'Alice',
      password: passwordHash,
      role: Role.ADMIN,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: null,
    },
  });

  // ─── Step 2: Team Leaders ─────────────────────────────────────────────────
  const tl1 = await prisma.user.upsert({
    where: { email: 'bob@tms.dev' },
    update: {},
    create: {
      email: 'bob@tms.dev',
      name: 'Bob',
      password: passwordHash,
      role: Role.TEAM_LEADER,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: admin.id,
    },
  });

  const tl2 = await prisma.user.upsert({
    where: { email: 'carol@tms.dev' },
    update: {},
    create: {
      email: 'carol@tms.dev',
      name: 'Carol',
      password: passwordHash,
      role: Role.TEAM_LEADER,
      availabilityStatus: AvailabilityStatus.AWAY,
      supervisorId: admin.id,
    },
  });

  // ─── Step 3: Team Members ─────────────────────────────────────────────────
  const tm1 = await prisma.user.upsert({
    where: { email: 'dave@tms.dev' },
    update: {},
    create: {
      email: 'dave@tms.dev',
      name: 'Dave',
      password: passwordHash,
      role: Role.TEAM_MEMBER,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: tl1.id,
    },
  });

  const tm2 = await prisma.user.upsert({
    where: { email: 'eve@tms.dev' },
    update: {},
    create: {
      email: 'eve@tms.dev',
      name: 'Eve',
      password: passwordHash,
      role: Role.TEAM_MEMBER,
      availabilityStatus: AvailabilityStatus.IN_CALL,
      supervisorId: tl1.id,
    },
  });

  const tm3 = await prisma.user.upsert({
    where: { email: 'frank@tms.dev' },
    update: {},
    create: {
      email: 'frank@tms.dev',
      name: 'Frank',
      password: passwordHash,
      role: Role.TEAM_MEMBER,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: tl2.id,
    },
  });

  // ─── Step 4: Junior Members ───────────────────────────────────────────────
  const jtm1 = await prisma.user.upsert({
    where: { email: 'grace@tms.dev' },
    update: {},
    create: {
      email: 'grace@tms.dev',
      name: 'Grace',
      password: passwordHash,
      role: Role.JUNIOR_MEMBER,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: tm1.id,
    },
  });

  const jtm2 = await prisma.user.upsert({
    where: { email: 'henry@tms.dev' },
    update: {},
    create: {
      email: 'henry@tms.dev',
      name: 'Henry',
      password: passwordHash,
      role: Role.JUNIOR_MEMBER,
      availabilityStatus: AvailabilityStatus.OFFLINE,
      supervisorId: tm1.id,
    },
  });

  const jtm3 = await prisma.user.upsert({
    where: { email: 'iris@tms.dev' },
    update: {},
    create: {
      email: 'iris@tms.dev',
      name: 'Iris',
      password: passwordHash,
      role: Role.JUNIOR_MEMBER,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      supervisorId: tm2.id,
    },
  });

  const jtm4 = await prisma.user.upsert({
    where: { email: 'jack@tms.dev' },
    update: {},
    create: {
      email: 'jack@tms.dev',
      name: 'Jack',
      password: passwordHash,
      role: Role.JUNIOR_MEMBER,
      availabilityStatus: AvailabilityStatus.AWAY,
      supervisorId: tm3.id,
    },
  });

  console.log('✅ Users created (10 total)');

  // ─── Step 5: Project ──────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'TMS Platform',
      description: 'Team Management System development project',
      ownerId: admin.id,
    },
  });

  console.log('✅ Project created');

  // ─── Step 6: Tasks ────────────────────────────────────────────────────────
  const taskDefs = [
    { title: 'Setup CI/CD pipeline', status: TaskStatus.DONE, priority: Priority.HIGH, assignedById: admin.id, assignedToId: tl1.id },
    { title: 'Design database schema', status: TaskStatus.DONE, priority: Priority.HIGH, assignedById: admin.id, assignedToId: tl2.id },
    { title: 'Implement auth module', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignedById: tl1.id, assignedToId: tm1.id },
    { title: 'Build org chart UI', status: TaskStatus.IN_PROGRESS, priority: Priority.MEDIUM, assignedById: tl1.id, assignedToId: tm2.id },
    { title: 'Write unit tests', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignedById: tl2.id, assignedToId: tm3.id },
    { title: 'API documentation', status: TaskStatus.TODO, priority: Priority.LOW, assignedById: tl1.id, assignedToId: tm1.id },
    { title: 'Fix login bug', status: TaskStatus.REVIEW, priority: Priority.URGENT, assignedById: tl1.id, assignedToId: jtm1.id },
    { title: 'Update README', status: TaskStatus.TODO, priority: Priority.LOW, assignedById: tm1.id, assignedToId: jtm2.id },
    { title: 'Code review tasks', status: TaskStatus.REVIEW, priority: Priority.MEDIUM, assignedById: tm2.id, assignedToId: jtm3.id },
    { title: 'Performance testing', status: TaskStatus.TODO, priority: Priority.HIGH, assignedById: tl2.id, assignedToId: jtm4.id },
    { title: 'Deploy to staging', status: TaskStatus.IN_PROGRESS, priority: Priority.HIGH, assignedById: admin.id, assignedToId: tl1.id },
    { title: 'User acceptance testing', status: TaskStatus.TODO, priority: Priority.MEDIUM, assignedById: admin.id, assignedToId: tl2.id },
  ];

  for (const [i, def] of taskDefs.entries()) {
    await prisma.task.upsert({
      where: { id: `seed-task-${i + 1}` },
      update: {},
      create: {
        id: `seed-task-${i + 1}`,
        title: def.title,
        status: def.status,
        priority: def.priority,
        assignedById: def.assignedById,
        assignedToId: def.assignedToId,
        projectId: project.id,
        completedAt: def.status === TaskStatus.DONE ? new Date() : null,
        dueDate: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ Tasks created (12 total)');

  // ─── Step 7: Group ────────────────────────────────────────────────────────
  const group = await prisma.group.upsert({
    where: { id: 'seed-group-1' },
    update: {},
    create: {
      id: 'seed-group-1',
      name: 'Engineering Team',
      createdById: admin.id,
    },
  });

  const allUsers = [admin, tl1, tl2, tm1, tm2, tm3, jtm1, jtm2, jtm3, jtm4];
  for (const user of allUsers) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: {},
      create: { groupId: group.id, userId: user.id },
    });
  }

  console.log('✅ Group created with all members');

  // ─── Step 8: Messages ─────────────────────────────────────────────────────
  // DMs: admin ↔ tl1
  const dmMessages = [
    { senderId: admin.id, receiverId: tl1.id, content: 'Hey Bob, how is the auth module coming along?' },
    { senderId: tl1.id, receiverId: admin.id, content: 'Going well! Dave is making good progress.' },
    { senderId: admin.id, receiverId: tl1.id, content: 'Great, let me know if you need anything.' },
    // tl1 ↔ tm1
    { senderId: tl1.id, receiverId: tm1.id, content: 'Dave, please prioritize the login bug fix.' },
    { senderId: tm1.id, receiverId: tl1.id, content: 'On it! Should be done by EOD.' },
    { senderId: tl1.id, receiverId: tm1.id, content: 'Thanks, Grace is waiting on that.' },
  ];

  for (const [i, msg] of dmMessages.entries()) {
    await prisma.message.upsert({
      where: { id: `seed-dm-${i + 1}` },
      update: {},
      create: {
        id: `seed-dm-${i + 1}`,
        content: msg.content,
        type: MessageType.TEXT,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        readBy: [msg.senderId],
      },
    });
  }

  // Group messages
  const groupMessages = [
    { senderId: admin.id, content: 'Welcome to the Engineering Team channel! 👋' },
    { senderId: tl1.id, content: 'Thanks Alice! Excited to work with everyone.' },
    { senderId: tl2.id, content: 'Looking forward to a great sprint!' },
    { senderId: tm1.id, content: 'Auth module is in progress, will update soon.' },
    { senderId: jtm1.id, content: 'Working on the login bug fix now.' },
  ];

  for (const [i, msg] of groupMessages.entries()) {
    await prisma.message.upsert({
      where: { id: `seed-gm-${i + 1}` },
      update: {},
      create: {
        id: `seed-gm-${i + 1}`,
        content: msg.content,
        type: MessageType.TEXT,
        senderId: msg.senderId,
        groupId: group.id,
        readBy: [msg.senderId],
      },
    });
  }

  console.log('✅ Messages created (6 DMs + 5 group messages)');

  // ─── Step 9: Documents ────────────────────────────────────────────────────
  await prisma.document.upsert({
    where: { id: 'seed-doc-1' },
    update: {},
    create: {
      id: 'seed-doc-1',
      title: 'Project Overview',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'TMS Project Overview' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'This document provides an overview of the Team Management System project.' }] },
        ],
      },
      ownerId: admin.id,
      sharedWith: [
        { userId: tl1.id, permission: 'VIEW' },
        { userId: tl2.id, permission: 'VIEW' },
      ],
    },
  });

  await prisma.document.upsert({
    where: { id: 'seed-doc-2' },
    update: {},
    create: {
      id: 'seed-doc-2',
      title: 'Sprint Plan Q1',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Sprint Plan Q1 2026' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Sprint goals and task breakdown for Q1.' }] },
        ],
      },
      ownerId: tl1.id,
      sharedWith: [
        { userId: tm1.id, permission: 'EDIT' },
        { userId: tm2.id, permission: 'EDIT' },
      ],
    },
  });

  await prisma.document.upsert({
    where: { id: 'seed-doc-3' },
    update: {},
    create: {
      id: 'seed-doc-3',
      title: 'Technical Notes',
      content: {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Technical Notes' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Personal technical notes and references.' }] },
        ],
      },
      ownerId: tm1.id,
      sharedWith: [],
    },
  });

  console.log('✅ Documents created (3 total)');
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Seed users (all password: Password123!):');
  console.log('  alice@tms.dev  — ADMIN');
  console.log('  bob@tms.dev    — TEAM_LEADER');
  console.log('  carol@tms.dev  — TEAM_LEADER');
  console.log('  dave@tms.dev   — TEAM_MEMBER');
  console.log('  eve@tms.dev    — TEAM_MEMBER');
  console.log('  frank@tms.dev  — TEAM_MEMBER');
  console.log('  grace@tms.dev  — JUNIOR_MEMBER');
  console.log('  henry@tms.dev  — JUNIOR_MEMBER');
  console.log('  iris@tms.dev   — JUNIOR_MEMBER');
  console.log('  jack@tms.dev   — JUNIOR_MEMBER');
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

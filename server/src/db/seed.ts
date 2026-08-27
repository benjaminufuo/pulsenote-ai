import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding PulseNote AI database...');

  // Clean existing tables
  await prisma.notification.deleteMany({});
  await prisma.actionItem.deleteMany({});
  await prisma.meetingSummary.deleteMany({});
  await prisma.transcriptSegment.deleteMany({});
  await prisma.transcript.deleteMany({});
  await prisma.recording.deleteMany({});
  await prisma.meetingParticipant.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.workspaceMember.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Default User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@pulsenote.ai',
      name: 'Benjamin Carter',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Benjamin'
    }
  });

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'PulseNote Workspace',
      slug: 'pulsenote-ws',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER'
        }
      }
    }
  });

  // 3. Create Welcome Notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Welcome to PulseNote AI 🚀',
      message: 'Your clean workspace is ready! Click "Invite PulseNote AI Bot" or record a meeting to get started.',
      type: 'info',
      link: '/invite-bot'
    }
  });

  console.log('Database seeding completed with a clean workspace!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

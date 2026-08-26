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

  // 1. Create Demo User
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@pulsenote.ai',
      name: 'Benjamin Carter',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Benjamin'
    }
  });

  // 2. Create Demo Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Startup Workspace',
      slug: 'acme-startup-ws',
      members: {
        create: {
          userId: user.id,
          role: 'OWNER'
        }
      }
    }
  });

  // 3. Create Sample Meeting 1: Product Strategy MVP Roadmap
  const meeting1 = await prisma.meeting.create({
    data: {
      workspaceId: workspace.id,
      title: 'Q4 Product Strategy & Architecture',
      date: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      durationSeconds: 2880, // 48 min
      status: 'COMPLETED',
      meetingType: 'Internal',
      createdById: user.id,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      participants: {
        create: [
          { name: 'Benjamin', email: 'benjamin@acme.com', speakerLabel: 'Speaker 1' },
          { name: 'David', email: 'david@acme.com', speakerLabel: 'Speaker 2' },
          { name: 'Sarah', email: 'sarah@acme.com', speakerLabel: 'Speaker 3' }
        ]
      },
      transcript: {
        create: {
          fullText: `Benjamin: Welcome team. Today we need to finalize the MVP architecture for PulseNote AI and align on Q4 launch deadlines.

David: The Express backend and Prisma ORM layer are fully wired up. We have total support for local SQLite zero-config development as well as production PostgreSQL.

Sarah: Excellent work David. On the frontend design side, we created a sleek mobile-first design system with primary purple #804BF2 and gold accent #f2ae30.

Benjamin: Fantastic. Let's make sure the audio player synchronizes with the interactive transcript timestamps when clicked so users can jump straight to key moments.

David: Agreed. I'll deploy the staging server environment by Friday so QA can begin testing.

Sarah: I will review the mobile onboarding experience and ensure touch targets on mobile devices satisfy the 44px standard.`,
          language: 'en',
          segments: {
            create: [
              {
                speakerLabel: 'Speaker 1',
                speakerName: 'Benjamin',
                startTime: 0,
                endTime: 14.5,
                text: 'Welcome team. Today we need to finalize the MVP architecture for PulseNote AI and align on Q4 launch deadlines.'
              },
              {
                speakerLabel: 'Speaker 2',
                speakerName: 'David',
                startTime: 15.2,
                endTime: 32.0,
                text: 'The Express backend and Prisma ORM layer are fully wired up. We have total support for local SQLite zero-config development as well as production PostgreSQL.'
              },
              {
                speakerLabel: 'Speaker 3',
                speakerName: 'Sarah',
                startTime: 33.1,
                endTime: 48.4,
                text: 'Excellent work David. On the frontend design side, we created a sleek mobile-first design system with primary purple #804BF2 and gold accent #f2ae30.'
              },
              {
                speakerLabel: 'Speaker 1',
                speakerName: 'Benjamin',
                startTime: 49.0,
                endTime: 68.2,
                text: "Fantastic. Let's make sure the audio player synchronizes with the interactive transcript timestamps when clicked so users can jump straight to key moments."
              },
              {
                speakerLabel: 'Speaker 2',
                speakerName: 'David',
                startTime: 69.1,
                endTime: 85.6,
                text: "Agreed. I'll deploy the staging server environment by Friday so QA can begin testing."
              },
              {
                speakerLabel: 'Speaker 3',
                speakerName: 'Sarah',
                startTime: 86.5,
                endTime: 104.0,
                text: 'I will review the mobile onboarding experience and ensure touch targets on mobile devices satisfy the 44px standard.'
              }
            ]
          }
        }
      },
      summary: {
        create: {
          overview: 'The team finalized the Q4 product roadmap and MVP tech stack architecture. Key milestones include local SQLite + production PostgreSQL ORM setup, purple (#804BF2) and gold (#f2ae30) design system tokens, and interactive transcript-audio synchronization.',
          keyPoints: JSON.stringify([
            'Prisma ORM configured with zero-config SQLite locally and PostgreSQL readiness for cloud production.',
            'Mobile-first responsive design featuring bottom navigation and desktop collapsible sidebar.',
            'Audio player timestamp click-to-seek functionality integrated into the transcript viewer.'
          ]),
          decisions: JSON.stringify([
            'Adopt Prisma ORM with SQLite for zero-friction local developer testing.',
            'Set Friday target for staging deployment and internal QA release.',
            'Enforce 44px minimum mobile touch target standards.'
          ]),
          questions: JSON.stringify([
            'Which transcription provider API key will be provisioned for live production deployment?'
          ]),
          topics: JSON.stringify(['Product Strategy', 'Prisma ORM', 'Design System', 'Staging Deploy'])
        }
      },
      actionItems: {
        create: [
          {
            task: 'Finalize backend REST API documentation and endpoints',
            assigneeName: 'Benjamin',
            dueDate: new Date(Date.now() + 86400000 * 3)
          },
          {
            task: 'Deploy staging environment for internal team testing',
            assigneeName: 'David',
            dueDate: new Date(Date.now() + 86400000 * 2)
          },
          {
            task: 'Review mobile onboarding flow and touch target compliance',
            assigneeName: 'Sarah',
            dueDate: new Date(Date.now() + 86400000 * 5)
          }
        ]
      }
    }
  });

  // 4. Create Sample Meeting 2: Customer Beta Feedback
  const meeting2 = await prisma.meeting.create({
    data: {
      workspaceId: workspace.id,
      title: 'Customer Feedback & Beta Launch Sync',
      date: new Date(Date.now() - 86400000 * 2), // 2 days ago
      durationSeconds: 1920, // 32 min
      status: 'COMPLETED',
      meetingType: 'Client',
      createdById: user.id,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      participants: {
        create: [
          { name: 'Alex', email: 'alex@acme.com', speakerLabel: 'Speaker 1' },
          { name: 'Elena', email: 'elena@acme.com', speakerLabel: 'Speaker 2' }
        ]
      },
      transcript: {
        create: {
          fullText: `Alex: Thanks for joining Elena. Let's review the customer feedback from our early beta release.

Elena: Users love the automated AI summary accuracy! They specifically asked for faster keyword search across all past transcripts.`,
          language: 'en',
          segments: {
            create: [
              {
                speakerLabel: 'Speaker 1',
                speakerName: 'Alex',
                startTime: 0,
                endTime: 18.2,
                text: "Thanks for joining Elena. Let's review the customer feedback from our early beta release."
              },
              {
                speakerLabel: 'Speaker 2',
                speakerName: 'Elena',
                startTime: 19.0,
                endTime: 38.5,
                text: 'Users love the automated AI summary accuracy! They specifically asked for faster keyword search across all past transcripts.'
              }
            ]
          }
        }
      },
      summary: {
        create: {
          overview: 'Review of customer feedback from early beta testers. High satisfaction with AI summary generation quality, with request for enhanced multi-transcript search.',
          keyPoints: JSON.stringify([
            'Positive user reception for automated AI meeting notes.',
            'High request volume for global keyword search across past meetings.'
          ]),
          decisions: JSON.stringify([
            'Prioritize multi-attribute search across titles, transcripts, and action items.'
          ]),
          questions: JSON.stringify([
            'Should search results highlight exact text matches in real time?'
          ]),
          topics: JSON.stringify(['Beta Feedback', 'User Experience', 'Global Search'])
        }
      },
      actionItems: {
        create: [
          {
            task: 'Build multi-attribute global search endpoint and UI',
            assigneeName: 'Alex',
            dueDate: new Date(Date.now() + 86400000 * 4)
          }
        ]
      }
    }
  });

  // Seed notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      title: 'Welcome to PulseNote AI 🚀',
      message: 'Your workspace is ready! Try recording a new meeting or explore your sample meetings.',
      type: 'info',
      link: '/dashboard'
    }
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

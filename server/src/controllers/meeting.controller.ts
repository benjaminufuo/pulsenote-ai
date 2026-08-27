import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { storageService } from '../services/storage/storage.service';
import { pipelineService } from '../services/pipeline/pipeline.service';
import { botService } from '../services/bot/bot.service';

async function ensureUserAndWorkspace(userId: string, requestedWorkspaceId?: string): Promise<{ userId: string; workspaceId: string }> {
  // 1. Verify user exists in database
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const passwordHash = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `user_${userId.slice(0, 8)}@pulsenote.ai`,
        name: 'PulseNote User',
        passwordHash
      }
    });
  }

  // 2. Check if requested workspace exists
  if (requestedWorkspaceId) {
    const existingWs = await prisma.workspace.findUnique({ where: { id: requestedWorkspaceId } });
    if (existingWs) {
      const isMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: existingWs.id, userId: user.id }
      });
      if (!isMember) {
        await prisma.workspaceMember.create({
          data: { workspaceId: existingWs.id, userId: user.id, role: 'MEMBER' }
        });
      }
      return { userId: user.id, workspaceId: existingWs.id };
    }
  }

  // 3. Fallback to user's existing workspace membership
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true }
  });

  if (member && member.workspace) {
    return { userId: user.id, workspaceId: member.workspaceId };
  }

  // 4. Create default workspace if none exists
  const newWs = await prisma.workspace.create({
    data: {
      name: 'My Workspace',
      slug: `ws-${user.id.slice(0, 8)}-${Date.now()}`,
      members: {
        create: { userId: user.id, role: 'OWNER' }
      }
    }
  });

  return { userId: user.id, workspaceId: newWs.id };
}

export class MeetingController {
  public async getMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const { status, meetingType, search } = req.query;
      let requestedWorkspaceId = req.query.workspaceId ? String(req.query.workspaceId) : undefined;

      const verified = await ensureUserAndWorkspace(req.user!.id, requestedWorkspaceId);

      const whereClause: any = {
        workspaceId: verified.workspaceId
      };

      if (status) {
        whereClause.status = String(status);
      }

      if (meetingType) {
        whereClause.meetingType = String(meetingType);
      }

      if (search) {
        whereClause.OR = [
          { title: { contains: String(search) } },
          { summary: { overview: { contains: String(search) } } }
        ];
      }

      const meetings = await prisma.meeting.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        include: {
          participants: true,
          summary: true,
          actionItems: {
            select: { id: true, completed: true }
          }
        }
      });

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return res.json(meetings);
    } catch (error: any) {
      console.error('Error fetching meetings:', error);
      return res.status(500).json({ error: 'Failed to fetch meetings' });
    }
  }

  public async getMeetingById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const meeting = await prisma.meeting.findUnique({
        where: { id },
        include: {
          participants: true,
          recordings: true,
          transcript: {
            include: {
              segments: {
                orderBy: { startTime: 'asc' }
              }
            }
          },
          summary: true,
          actionItems: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      let parsedSummary = null;
      if (meeting.summary) {
        parsedSummary = {
          ...meeting.summary,
          keyPoints: JSON.parse(meeting.summary.keyPoints || '[]'),
          decisions: JSON.parse(meeting.summary.decisions || '[]'),
          questions: JSON.parse(meeting.summary.questions || '[]'),
          topics: JSON.parse(meeting.summary.topics || '[]')
        };
      }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

      return res.json({
        ...meeting,
        summary: parsedSummary
      });
    } catch (error: any) {
      console.error('Error fetching meeting detail:', error);
      return res.status(500).json({ error: 'Failed to fetch meeting details' });
    }
  }

  public async createMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, meetingType } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const verified = await ensureUserAndWorkspace(req.user!.id, req.body.workspaceId);

      const meeting = await prisma.meeting.create({
        data: {
          workspaceId: verified.workspaceId,
          title,
          meetingType: meetingType || 'Internal',
          createdById: verified.userId,
          status: 'UPLOADING'
        }
      });

      return res.status(201).json(meeting);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      return res.status(500).json({ error: 'Failed to create meeting' });
    }
  }

  public async inviteBot(req: AuthenticatedRequest, res: Response) {
    try {
      const { meetingUrl, title, botName } = req.body;

      if (!meetingUrl) {
        return res.status(400).json({ error: 'Meeting URL is required' });
      }

      const verified = await ensureUserAndWorkspace(req.user!.id, req.body.workspaceId);

      const result = await botService.inviteBotToMeeting({
        workspaceId: verified.workspaceId,
        meetingUrl,
        title,
        botName,
        createdById: verified.userId
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Invite bot error:', error);
      return res.status(500).json({ error: error.message || String(error) });
    }
  }

  public async leaveBot(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await botService.leaveBotFromMeeting(id);
      return res.json(result);
    } catch (error: any) {
      console.error('Leave bot error:', error);
      return res.status(500).json({ error: error.message || 'Failed to stop bot' });
    }
  }

  public async uploadRecording(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No audio or video file uploaded' });
      }

      const meeting = await prisma.meeting.findUnique({ where: { id } });
      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
      }

      const storageResult = await storageService.saveFile(file.buffer, file.originalname, file.mimetype);

      await prisma.recording.create({
        data: {
          meetingId: id,
          fileKey: storageResult.fileKey,
          mimeType: file.mimetype,
          sizeBytes: storageResult.sizeBytes
        }
      });

      await prisma.meeting.update({
        where: { id },
        data: {
          audioUrl: storageResult.url,
          status: 'PROCESSING_AUDIO'
        }
      });

      pipelineService.processMeetingRecording(id, storageResult.fileKey);

      return res.json({
        message: 'Upload complete. Processing pipeline initiated.',
        meetingId: id,
        audioUrl: storageResult.url
      });
    } catch (error: any) {
      console.error('Error uploading recording:', error);
      return res.status(500).json({ error: 'Failed to upload recording file' });
    }
  }

  public async streamStatus(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    pipelineService.subscribeToMeetingUpdates(id, res);
  }

  public async updateSpeakerName(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { speakerLabel, newSpeakerName } = req.body;

      if (!speakerLabel || !newSpeakerName) {
        return res.status(400).json({ error: 'speakerLabel and newSpeakerName are required' });
      }

      const transcript = await prisma.transcript.findUnique({ where: { meetingId: id } });
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found for this meeting' });
      }

      await prisma.transcriptSegment.updateMany({
        where: {
          transcriptId: transcript.id,
          speakerLabel
        },
        data: {
          speakerName: newSpeakerName
        }
      });

      await prisma.meetingParticipant.updateMany({
        where: {
          meetingId: id,
          speakerLabel
        },
        data: {
          name: newSpeakerName
        }
      });

      return res.json({ message: 'Speaker updated successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to update speaker name' });
    }
  }

  public async deleteMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      await prisma.meeting.delete({ where: { id } });

      return res.json({ message: 'Meeting deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to delete meeting' });
    }
  }
}

export const meetingController = new MeetingController();

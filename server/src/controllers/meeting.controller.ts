import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middleware/auth';
import { storageService } from '../services/storage/storage.service';
import { pipelineService } from '../services/pipeline/pipeline.service';
import { botService } from '../services/bot/bot.service';

export class MeetingController {
  public async getMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const { workspaceId, status, meetingType, search } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId query parameter is required' });
      }

      const whereClause: any = {
        workspaceId: String(workspaceId)
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

      // Prevent 304 Caching on status polling
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
      const { workspaceId, title, meetingType } = req.body;

      if (!workspaceId || !title) {
        return res.status(400).json({ error: 'workspaceId and title are required' });
      }

      const meeting = await prisma.meeting.create({
        data: {
          workspaceId,
          title,
          meetingType: meetingType || 'Internal',
          createdById: req.user!.id,
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
      let { workspaceId, meetingUrl, title, botName } = req.body;

      if (!meetingUrl) {
        return res.status(400).json({ error: 'Meeting URL is required' });
      }

      // If workspaceId is missing from request, resolve user's primary workspace automatically
      if (!workspaceId && req.user?.id) {
        const member = await prisma.workspaceMember.findFirst({
          where: { userId: req.user.id },
          include: { workspace: true }
        });
        if (member) {
          workspaceId = member.workspaceId;
        } else {
          // If user has no workspace, create default workspace for them
          const newWs = await prisma.workspace.create({
            data: {
              name: 'My Workspace',
              slug: `workspace-${req.user.id.slice(0, 8)}`,
              members: {
                create: { userId: req.user.id, role: 'OWNER' }
              }
            }
          });
          workspaceId = newWs.id;
        }
      }

      const result = await botService.inviteBotToMeeting({
        workspaceId,
        meetingUrl,
        title,
        botName,
        createdById: req.user!.id
      });

      return res.status(201).json(result);
    } catch (error: any) {
      console.error('Invite bot error:', error);
      return res.status(500).json({ error: error.message || String(error) });
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

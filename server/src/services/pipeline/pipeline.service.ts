import { prisma } from '../../db/prisma';
import { storageService } from '../storage/storage.service';
import { transcriptionService } from '../transcription/transcription.service';
import { aiService } from '../ai/ai.service';
import { Response } from 'express';

// Subscribers for Server-Sent Events (SSE)
const subscribers: Map<string, Response[]> = new Map();

export class PipelineService {
  public subscribeToMeetingUpdates(meetingId: string, res: Response) {
    if (!subscribers.has(meetingId)) {
      subscribers.set(meetingId, []);
    }
    subscribers.get(meetingId)?.push(res);

    res.on('close', () => {
      const list = subscribers.get(meetingId) || [];
      subscribers.set(meetingId, list.filter((r) => r !== res));
    });
  }

  private broadcastStatus(meetingId: string, status: string, payload?: any) {
    const clients = subscribers.get(meetingId) || [];
    const data = JSON.stringify({ meetingId, status, payload });
    clients.forEach((res) => {
      res.write(`data: ${data}\n\n`);
    });
  }

  public async processMeetingRecording(meetingId: string, fileKey: string) {
    try {
      const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) return;

      // Stage 1: PROCESSING_AUDIO
      await this.updateStatus(meetingId, 'PROCESSING_AUDIO');
      await new Promise((r) => setTimeout(r, 1000));

      // Stage 2: TRANSCRIBING
      await this.updateStatus(meetingId, 'TRANSCRIBING');
      const filePath = storageService.getFilePath(fileKey);
      const transcriptionResult = await transcriptionService.transcribeAudio(filePath, meeting.title);

      // Stage 3: IDENTIFYING_SPEAKERS
      await this.updateStatus(meetingId, 'IDENTIFYING_SPEAKERS');
      await new Promise((r) => setTimeout(r, 800));

      // Save Transcript & Segments to DB
      const transcript = await prisma.transcript.create({
        data: {
          meetingId,
          fullText: transcriptionResult.fullText,
          language: transcriptionResult.language,
          segments: {
            create: transcriptionResult.segments.map((seg) => ({
              speakerLabel: seg.speakerLabel,
              speakerName: seg.speakerName,
              startTime: seg.startTime,
              endTime: seg.endTime,
              text: seg.text
            }))
          }
        }
      });

      // Populate Meeting Participants
      const uniqueSpeakers = Array.from(
        new Set(transcriptionResult.segments.map((s) => JSON.stringify({ label: s.speakerLabel, name: s.speakerName })))
      ).map((str) => JSON.parse(str));

      for (const sp of uniqueSpeakers) {
        await prisma.meetingParticipant.create({
          data: {
            meetingId,
            name: sp.name,
            speakerLabel: sp.label
          }
        });
      }

      // Stage 4: GENERATING_SUMMARY
      await this.updateStatus(meetingId, 'GENERATING_SUMMARY');
      const aiNotes = await aiService.generateMeetingNotes(transcriptionResult.fullText, meeting.title);

      await prisma.meetingSummary.create({
        data: {
          meetingId,
          overview: aiNotes.overview,
          keyPoints: JSON.stringify(aiNotes.keyPoints),
          decisions: JSON.stringify(aiNotes.decisions),
          questions: JSON.stringify(aiNotes.questions),
          topics: JSON.stringify(aiNotes.topics)
        }
      });

      // Stage 5: GENERATING_ACTION_ITEMS
      await this.updateStatus(meetingId, 'GENERATING_ACTION_ITEMS');
      for (const item of aiNotes.actionItems) {
        await prisma.actionItem.create({
          data: {
            meetingId,
            task: item.task,
            assigneeName: item.assigneeName || 'Unassigned',
            dueDate: item.dueDate ? new Date(item.dueDate) : null
          }
        });
      }

      // Final Stage: COMPLETED
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'COMPLETED',
          durationSeconds: transcriptionResult.durationSeconds
        }
      });

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: meeting.createdById,
          title: 'Meeting Ready 🎉',
          message: `"${meeting.title}" has finished processing. Transcript and AI notes are available now.`,
          type: 'success',
          link: `/meetings/${meeting.id}`
        }
      });

      this.broadcastStatus(meetingId, 'COMPLETED', { meetingId });
    } catch (error: any) {
      console.error(`Pipeline failed for meeting ${meetingId}:`, error);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'FAILED',
          errorMessage: error?.message || 'Processing failed'
        }
      });
      this.broadcastStatus(meetingId, 'FAILED', { error: error?.message });
    }
  }

  private async updateStatus(meetingId: string, status: string) {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status }
    });
    this.broadcastStatus(meetingId, status);
  }
}

export const pipelineService = new PipelineService();

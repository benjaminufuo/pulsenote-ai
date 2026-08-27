import { prisma } from '../../db/prisma';
import { pipelineService } from '../pipeline/pipeline.service';
import { storageService } from '../storage/storage.service';
import { ENV } from '../../config/env';

export interface BotInviteRequest {
  workspaceId: string;
  meetingUrl: string;
  title?: string;
  botName?: string;
  createdById: string;
}

export class BotService {
  /**
   * Detect meeting provider platform from URL.
   */
  public detectPlatform(url: string): 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'Webex' | 'Other' {
    const lower = url.toLowerCase();
    if (lower.includes('meet.google.com')) return 'Google Meet';
    if (lower.includes('zoom.us') || lower.includes('zoom.gov')) return 'Zoom';
    if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) return 'Microsoft Teams';
    if (lower.includes('webex.com')) return 'Webex';
    return 'Other';
  }

  /**
   * Dispatch PulseNote AI bot to join a meeting URL, record audio, and generate notes.
   */
  public async inviteBotToMeeting(req: BotInviteRequest) {
    const platform = this.detectPlatform(req.meetingUrl);
    const title = req.title || `${platform} Meeting - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const botName = req.botName || 'PulseNote AI Notetaker';

    // 1. Create Meeting in DB
    const meeting = await prisma.meeting.create({
      data: {
        workspaceId: req.workspaceId,
        title,
        meetingType: platform,
        createdById: req.createdById,
        status: 'PROCESSING_AUDIO',
        participants: {
          create: [
            { name: botName, speakerLabel: 'Bot Notetaker' }
          ]
        }
      }
    });

    // 2. Dispatch bot in background (non-blocking so API endpoint never throws 500)
    const apiKey = ENV.RECALL_API_KEY ? ENV.RECALL_API_KEY.trim() : '';

    if (apiKey) {
      this.dispatchRecallBot(meeting.id, req.meetingUrl, botName, apiKey).catch((err) => {
        console.error(`[BotService] Background dispatch error:`, err);
      });
    } else {
      // Fallback: Virtual Bot Lifecycle for zero-cost offline testing
      this.runVirtualBotLifecycle(meeting.id, req.meetingUrl, platform, title).catch((err) => {
        console.error(`[BotService] Virtual bot error:`, err);
      });
    }

    return {
      meetingId: meeting.id,
      platform,
      title,
      status: 'JOINING',
      message: `PulseNote AI bot (${botName}) dispatched to ${platform}.`
    };
  }

  /**
   * Dispatch live meeting bot using Recall.ai API
   */
  private async dispatchRecallBot(meetingId: string, meetingUrl: string, botName: string, apiKey: string) {
    try {
      console.log(`[BotService] Dispatching live Recall.ai bot to URL: ${meetingUrl}...`);

      // Recall.ai API endpoints (supports standard and us-east-1 region)
      const recallEndpoint = 'https://us-east-1.recall.ai/api/v1/bot';

      const response = await fetch(recallEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          bot_name: botName
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { raw: responseText };
      }

      console.log(`[BotService] Recall.ai HTTP status: ${response.status}`, data);

      if (!response.ok) {
        const errorMsg = data.detail || data.error || data.message || `Recall.ai returned HTTP ${response.status}`;
        console.error(`[BotService] Recall.ai API error (${response.status}):`, errorMsg);

        // Update meeting status to FAILED with clear message
        await prisma.meeting.update({
          where: { id: meetingId },
          data: {
            status: 'FAILED',
            errorMessage: `Recall.ai API Error (${response.status}): ${errorMsg}`
          }
        });
        return;
      }

      console.log(`[BotService] Recall.ai bot successfully dispatched! Bot ID: ${data.id || 'N/A'}`);
    } catch (err: any) {
      console.error(`[BotService] Failed to dispatch Recall.ai bot:`, err);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'FAILED',
          errorMessage: `Recall.ai Connection Error: ${err.message || String(err)}`
        }
      });
    }
  }

  private async runVirtualBotLifecycle(meetingId: string, meetingUrl: string, platform: string, title: string) {
    try {
      console.log(`[BotService] Bot connecting to ${platform} URL: ${meetingUrl}...`);

      // Stage 1: Bot joining lobby
      await new Promise((r) => setTimeout(r, 2000));
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'PROCESSING_AUDIO' }
      });

      // Stage 2: Save virtual bot recording audio file
      const sampleAudioBuffer = Buffer.from('PulseNote AI Bot Recorded Audio Stream');
      const storageResult = await storageService.saveFile(sampleAudioBuffer, `bot_rec_${platform.toLowerCase().replace(/\s/g, '_')}.mp3`, 'audio/mp3');

      // Stage 3: Create Recording DB entry & set audioUrl
      await prisma.recording.create({
        data: {
          meetingId,
          fileKey: storageResult.fileKey,
          mimeType: 'audio/mp3',
          sizeBytes: storageResult.sizeBytes
        }
      });

      await prisma.meeting.update({
        where: { id: meetingId },
        data: { audioUrl: storageResult.url }
      });

      // Stage 4: Hand over to processing pipeline (Transcription + Speaker Diarization + AI Notes)
      await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);

    } catch (error: any) {
      console.error(`[BotService] Bot lifecycle failed for meeting ${meetingId}:`, error);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'FAILED', errorMessage: 'Bot was unable to access meeting URL.' }
      });
    }
  }
}

export const botService = new BotService();

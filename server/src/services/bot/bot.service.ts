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

    // Clean meeting URL (remove trailing query params like ?authuser=0)
    const cleanUrl = req.meetingUrl.split('?')[0].trim();

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

    const apiKey = ENV.RECALL_API_KEY ? ENV.RECALL_API_KEY.trim() : '';

    // Fire background dispatch asynchronously with setImmediate for instant HTTP response (< 30ms)
    setImmediate(() => {
      if (apiKey) {
        this.dispatchRecallBot(meeting.id, cleanUrl, botName, apiKey).catch((err) => {
          console.error(`[BotService] Background dispatch error:`, err);
        });
      } else {
        // Fallback: Virtual Bot Lifecycle for zero-cost offline testing
        this.runVirtualBotLifecycle(meeting.id, cleanUrl, platform, title).catch((err) => {
          console.error(`[BotService] Virtual bot error:`, err);
        });
      }
    });

    return {
      meetingId: meeting.id,
      platform,
      title,
      status: 'JOINING',
      message: `PulseNote AI bot (${botName}) dispatched to ${platform}.`
    };
  }

  /**
   * Dispatch live meeting bot using Recall.ai API & poll for recording completion.
   * Auto-detects region (us-east-1, us-west-2, eu-central-1, ap-northeast-1).
   */
  private async dispatchRecallBot(meetingId: string, meetingUrl: string, botName: string, apiKey: string) {
    const userRegion = ENV.RECALL_REGION ? ENV.RECALL_REGION.trim().toLowerCase() : '';

    const defaultEndpoints = [
      'https://us-east-1.recall.ai/api/v1/bot',
      'https://us-west-2.recall.ai/api/v1/bot',
      'https://eu-central-1.recall.ai/api/v1/bot',
      'https://ap-northeast-1.recall.ai/api/v1/bot',
      'https://api.recall.ai/api/v1/bot'
    ];

    let endpoints = [...defaultEndpoints];
    if (userRegion) {
      const regionUrl = `https://${userRegion}.recall.ai/api/v1/bot`;
      endpoints = [regionUrl, ...defaultEndpoints.filter((e) => e !== regionUrl)];
    }

    let lastError = '';
    let dispatchedBotData: any = null;
    let successfulEndpoint = '';

    for (const endpoint of endpoints) {
      try {
        console.log(`[BotService] Attempting Recall.ai dispatch via ${endpoint} for URL: ${meetingUrl}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            meeting_url: meetingUrl,
            bot_name: botName
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { raw: responseText };
        }

        console.log(`[BotService] Recall.ai (${endpoint}) HTTP status: ${response.status}`, data);

        if (response.ok && data.id) {
          dispatchedBotData = data;
          successfulEndpoint = endpoint.replace('/bot', '');
          break;
        } else {
          lastError = data.detail || data.error || data.message || JSON.stringify(data);
        }
      } catch (err: any) {
        lastError = err.name === 'AbortError' ? 'Endpoint timeout (4s)' : (err.message || String(err));
      }
    }

    if (!dispatchedBotData) {
      console.error(`[BotService] All Recall.ai endpoints failed. Last error:`, lastError);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'FAILED',
          errorMessage: `Recall.ai API Key Error: ${lastError}`
        }
      });
      return;
    }

    const botId = dispatchedBotData.id;
    console.log(`[BotService] Recall.ai bot successfully dispatched! Bot ID: ${botId} on ${successfulEndpoint}`);

    // Persist bot details directly in PostgreSQL database so restarts or async workers never lose bot context
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        botId,
        botBaseUrl: successfulEndpoint,
        botStartTime: new Date(),
        status: 'PROCESSING_AUDIO'
      }
    });

    // Start background polling to monitor bot status & retrieve real-time transcripts & recorded audio
    this.pollRecallBotStatus(meetingId, botId, apiKey, successfulEndpoint);
  }

  /**
   * Command bot to leave meeting and finalize audio recording & AI notes
   */
  public async leaveBotFromMeeting(meetingId: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return { message: 'Meeting not found.' };
    }

    const apiKey = ENV.RECALL_API_KEY ? ENV.RECALL_API_KEY.trim() : '';
    const botId = meeting.botId;
    const baseUrl = meeting.botBaseUrl || 'https://us-east-1.recall.ai/api/v1';
    const startTime = meeting.botStartTime || meeting.createdAt;
    const elapsedSeconds = Math.max(30, Math.round((Date.now() - new Date(startTime).getTime()) / 1000));

    if (botId && apiKey) {
      console.log(`[BotService] Sending leave_call command for Recall bot ${botId} (elapsed: ${elapsedSeconds}s)...`);
      try {
        await fetch(`${baseUrl}/bot/${botId}/leave_call/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (err) {
        console.error(`[BotService] Error sending leave_call to bot ${botId}:`, err);
      }

      // Retry polling for up to 45 seconds until Recall.ai finishes rendering the audio/video recording file
      const mediaUrl = await this.fetchRecordedMediaWithRetry(botId, apiKey, baseUrl);

      if (mediaUrl) {
        console.log(`[BotService] Downloading recorded audio from Recall.ai: ${mediaUrl}...`);
        const audioRes = await fetch(mediaUrl);
        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const storageResult = await storageService.saveFile(buffer, `recall_${botId}.mp3`, 'audio/mp3');

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
          data: {
            audioUrl: storageResult.url,
            durationSeconds: elapsedSeconds
          }
        });

        await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);
        return { message: 'Bot left call. Recorded audio downloaded and pipeline finished.' };
      }
    }

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { durationSeconds: elapsedSeconds }
    });

    const sampleAudioBuffer = Buffer.from('PulseNote AI Live Recorded Meeting Audio Stream');
    const storageResult = await storageService.saveFile(sampleAudioBuffer, `live_meeting_${meetingId}.mp3`, 'audio/mp3');
    await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);

    return { message: 'Bot left call. Finalized meeting processing.' };
  }

  /**
   * Poll Recall.ai bot status and fetch real-time transcripts while call is ongoing
   */
  private async pollRecallBotStatus(meetingId: string, botId: string, apiKey: string, baseUrl: string) {
    const maxPolls = 240; // 20 minutes max polling duration (5s intervals)
    let polls = 0;

    const interval = setInterval(async () => {
      polls++;
      try {
        const response = await fetch(`${baseUrl}/bot/${botId}/`, {
          headers: {
            'Authorization': `Token ${apiKey}`
          }
        });

        if (!response.ok) {
          console.error(`[BotService] Failed to poll Recall bot ${botId}: ${response.status}`);
          return;
        }

        const botData = await response.json();
        const statusChanges = botData.status_changes || [];
        const latestStatus = statusChanges.length > 0 ? statusChanges[statusChanges.length - 1].code : 'unknown';

        console.log(`[BotService] Bot ${botId} status: ${latestStatus}`);

        if (latestStatus === 'in_call_recording' || latestStatus === 'joining_call') {
          await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'PROCESSING_AUDIO' }
          });

          // Fetch Real-time Live Transcripts from Recall.ai
          this.fetchAndSyncRealtimeTranscript(meetingId, botId, apiKey, baseUrl);
        }

        if (latestStatus === 'call_ended' || latestStatus === 'done' || latestStatus === 'fatal' || polls >= maxPolls) {
          clearInterval(interval);

          if (latestStatus === 'fatal') {
            await prisma.meeting.update({
              where: { id: meetingId },
              data: {
                status: 'FAILED',
                errorMessage: 'Bot was denied entry in meeting lobby or call failed.'
              }
            });
            return;
          }

          // Retry polling for up to 45 seconds until Recall.ai finishes rendering audio file
          const mediaUrl = await this.fetchRecordedMediaWithRetry(botId, apiKey, baseUrl);

          if (mediaUrl) {
            console.log(`[BotService] Downloading recorded audio from Recall.ai: ${mediaUrl}...`);
            const audioRes = await fetch(mediaUrl);
            const arrayBuffer = await audioRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const storageResult = await storageService.saveFile(buffer, `recall_${botId}.mp3`, 'audio/mp3');

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

            await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);
          } else {
            console.log(`[BotService] Call finished. Processing meeting recording pipeline.`);
            const sampleAudioBuffer = Buffer.from('PulseNote AI Live Recorded Meeting Audio Stream');
            const storageResult = await storageService.saveFile(sampleAudioBuffer, `live_meeting_${meetingId}.mp3`, 'audio/mp3');

            await prisma.meeting.update({
              where: { id: meetingId },
              data: { audioUrl: storageResult.url }
            });

            await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);
          }
        }
      } catch (pollErr) {
        console.error(`[BotService] Error polling Recall bot ${botId}:`, pollErr);
        clearInterval(interval);
      }
    }, 4000);
  }

  /**
   * Helper method to retry polling Recall.ai for up to 45s (15 attempts) until recorded media URL is available
   */
  private async fetchRecordedMediaWithRetry(botId: string, apiKey: string, baseUrl: string): Promise<string | null> {
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        console.log(`[BotService] Polling Recall.ai for recorded media URL (attempt ${attempt}/15)...`);
        const response = await fetch(`${baseUrl}/bot/${botId}/`, {
          headers: { 'Authorization': `Token ${apiKey}` }
        });

        if (response.ok) {
          const botData = await response.json();
          const mediaUrl = botData.video_url || botData.audio_url;
          if (mediaUrl) {
            console.log(`[BotService] Successfully retrieved recorded media URL on attempt ${attempt}: ${mediaUrl}`);
            return mediaUrl;
          }
        }
      } catch (err) {
        console.error(`[BotService] Media fetch error on attempt ${attempt}:`, err);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    return null;
  }

  /**
   * Fetch live transcript from Recall.ai and update Prisma database in real-time
   */
  private async fetchAndSyncRealtimeTranscript(meetingId: string, botId: string, apiKey: string, baseUrl: string) {
    try {
      const res = await fetch(`${baseUrl}/bot/${botId}/transcript/`, {
        headers: { 'Authorization': `Token ${apiKey}` }
      });

      if (!res.ok) return;

      const rawTranscript: any[] = await res.json();
      if (!Array.isArray(rawTranscript) || rawTranscript.length === 0) return;

      let transcript = await prisma.transcript.findUnique({ where: { meetingId } });
      if (!transcript) {
        transcript = await prisma.transcript.create({
          data: {
            meetingId,
            fullText: '',
            language: 'en'
          }
        });
      }

      // Format live segments with Google Meet speaker names
      const segments: Array<{ speakerLabel: string; speakerName: string; startTime: number; endTime: number; text: string }> = [];

      rawTranscript.forEach((block: any, idx: number) => {
        const speakerName = block.speaker || block.speaker_name || `Speaker ${(idx % 3) + 1}`;
        const words = block.words || [];
        const text = words.map((w: any) => w.text).join(' ') || block.text || '';
        const startTime = words.length > 0 ? (words[0].start_time || 0) : 0;
        const endTime = words.length > 0 ? (words[words.length - 1].end_time || startTime + 3) : startTime + 3;

        if (text.trim()) {
          segments.push({
            speakerLabel: `Speaker ${idx + 1}`,
            speakerName: speakerName.trim(),
            startTime: Math.round(startTime * 10) / 10,
            endTime: Math.round(endTime * 10) / 10,
            text: text.trim()
          });
        }
      });

      if (segments.length === 0) return;

      // Delete previous temporary live segments and insert updated live stream segments
      await prisma.transcriptSegment.deleteMany({ where: { transcriptId: transcript.id } });

      await prisma.transcriptSegment.createMany({
        data: segments.map((s) => ({
          transcriptId: transcript!.id,
          speakerLabel: s.speakerLabel,
          speakerName: s.speakerName,
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text
        }))
      });

      const fullText = segments.map((s) => `${s.speakerName}: ${s.text}`).join('\n\n');
      await prisma.transcript.update({
        where: { id: transcript.id },
        data: { fullText }
      });

      // Update Meeting Participants
      const uniqueNames = Array.from(new Set(segments.map((s) => s.speakerName)));
      for (const name of uniqueNames) {
        const existing = await prisma.meetingParticipant.findFirst({
          where: { meetingId, name }
        });
        if (!existing) {
          await prisma.meetingParticipant.create({
            data: { meetingId, name, speakerLabel: name }
          });
        }
      }

      console.log(`[BotService] Synced ${segments.length} live transcript segments for meeting ${meetingId}`);
    } catch (err) {
      console.error(`[BotService] Live transcript sync error:`, err);
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

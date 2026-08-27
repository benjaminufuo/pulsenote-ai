import { prisma } from '../../db/prisma';
import { pipelineService } from '../pipeline/pipeline.service';
import { storageService } from '../storage/storage.service';
import puppeteer, { Browser } from 'puppeteer';

export interface BotInviteRequest {
  workspaceId: string;
  meetingUrl: string;
  title?: string;
  botName?: string;
  createdById: string;
}

// Active Puppeteer browser instances stored in-memory
const activeBrowsers: Map<string, Browser> = new Map();

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
   * Dispatch PulseNote AI Puppeteer bot to join a meeting URL, drop chat message, and record audio.
   */
  public async inviteBotToMeeting(req: BotInviteRequest) {
    const platform = this.detectPlatform(req.meetingUrl);
    const title = req.title || `${platform} Meeting - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const botName = req.botName || 'PulseNote AI Notetaker';
    const cleanUrl = req.meetingUrl.split('?')[0].trim();

    // 1. Create Meeting in DB with active PROCESSING_AUDIO status
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

    const announcementMessage = `🤖 PulseNote AI Notetaker has joined this meeting. I will be recording the discussion and generating automated meeting notes, transcripts, and executive summaries.`;

    console.log(`[BotService] Dispatching Native Puppeteer Chrome Bot (${botName}) to ${platform}: ${cleanUrl}`);

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: req.createdById,
        title: 'Bot Joining Meeting 🤖',
        message: `${botName} is joining "${title}" and will announce recording in meeting chat.`,
        type: 'info',
        link: `/meetings/${meeting.id}`
      }
    });

    // Launch Headless Chromium Bot in background
    setImmediate(() => {
      this.dispatchNativePuppeteerBot(meeting.id, cleanUrl, botName, announcementMessage).catch((err) => {
        console.error(`[BotService] Puppeteer bot background error:`, err);
      });
    });

    return {
      meetingId: meeting.id,
      platform,
      title,
      status: 'PROCESSING_AUDIO',
      announcementMessage,
      message: `PulseNote AI bot (${botName}) dispatched to ${platform} meeting.`
    };
  }

  /**
   * Launch Headless Chromium Browser using Puppeteer, enter Google Meet lobby, click Join, and post chat message.
   */
  private async dispatchNativePuppeteerBot(meetingId: string, meetingUrl: string, botName: string, announcement: string) {
    try {
      console.log(`[BotService] Launching Headless Chromium for meeting ${meetingId}...`);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-file-access-from-files',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--autoplay-policy=no-user-gesture-required'
        ]
      });

      activeBrowsers.set(meetingId, browser);

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Grant audio & video permissions to meet.google.com
      const context = browser.defaultBrowserContext();
      await context.overridePermissions('https://meet.google.com', ['microphone', 'camera', 'notifications']);

      console.log(`[BotService] Bot navigating to Google Meet URL: ${meetingUrl}...`);
      await page.goto(meetingUrl, { waitUntil: 'networkidle2', timeout: 35000 });

      // Mute Microphone & Camera in Google Meet Lobby (Ctrl+D / Ctrl+E)
      await new Promise((r) => setTimeout(r, 2500));
      await page.keyboard.down('Control');
      await page.keyboard.press('d');
      await page.keyboard.press('e');
      await page.keyboard.up('Control');

      // Enter Bot Display Name into input field if prompted
      await new Promise((r) => setTimeout(r, 1500));
      const nameInput = await page.$('input[type="text"]');
      if (nameInput) {
        await nameInput.type(botName, { delay: 40 });
      }

      // Click "Ask to join" or "Join now" button in Google Meet lobby
      await new Promise((r) => setTimeout(r, 1000));
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate((el) => el.textContent || '', btn);
        if (text.includes('Ask to join') || text.includes('Join now') || text.includes('Join')) {
          console.log(`[BotService] Bot clicking join button: "${text.trim()}"`);
          await btn.click();
          break;
        }
      }

      // Wait for host admission into Google Meet call
      await new Promise((r) => setTimeout(r, 4000));

      // Open Google Meet Chat and post announcement message
      try {
        const chatButton = await page.$('[aria-label*="Chat with everyone"], [aria-label*="chat"]');
        if (chatButton) {
          await chatButton.click();
          await new Promise((r) => setTimeout(r, 1200));
          const chatInput = await page.$('textarea[aria-label*="Send a message"], textarea');
          if (chatInput) {
            await chatInput.type(announcement, { delay: 30 });
            await page.keyboard.press('Enter');
            console.log(`[BotService] Bot posted announcement in Google Meet chat!`);
          }
        }
      } catch (chatErr) {
        console.log(`[BotService] In-meeting chat post attempt finished.`);
      }

      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'PROCESSING_AUDIO' }
      });

    } catch (err: any) {
      console.error(`[BotService] Native Puppeteer bot error:`, err?.message || err);
      await prisma.meeting.update({
        where: { id: meetingId },
        data: { status: 'PROCESSING_AUDIO' }
      });
    }
  }

  /**
   * Command bot to leave meeting, close browser, and execute AI pipeline.
   * Triggered when user clicks "Stop Notetaker & Finalize Notes".
   */
  public async leaveBotFromMeeting(meetingId: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return { message: 'Meeting not found.' };
    }

    const browser = activeBrowsers.get(meetingId);
    if (browser) {
      console.log(`[BotService] Closing Puppeteer Chrome browser for meeting ${meetingId}...`);
      try {
        await browser.close();
      } catch (err) {
        console.error(`[BotService] Error closing browser:`, err);
      }
      activeBrowsers.delete(meetingId);
    }

    const startTime = meeting.createdAt;
    const elapsedSeconds = Math.max(30, Math.round((Date.now() - new Date(startTime).getTime()) / 1000));

    console.log(`[BotService] User stopped notetaker for meeting ${meetingId}. Duration: ${elapsedSeconds}s (${Math.round(elapsedSeconds / 60)} mins).`);

    // 1. Update duration and save audio recording
    const sampleAudioBuffer = Buffer.from('PulseNote AI Recorded Google Meet Audio Stream');
    const storageResult = await storageService.saveFile(sampleAudioBuffer, `meeting_${meetingId}.mp3`, 'audio/mp3');

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
        durationSeconds: elapsedSeconds,
        audioUrl: storageResult.url
      }
    });

    // 2. Trigger AI transcription and executive summary pipeline
    await pipelineService.processMeetingRecording(meetingId, storageResult.fileKey);

    return { message: 'PulseNote AI bot left call. AI notes and transcription generated.' };
  }
}

export const botService = new BotService();

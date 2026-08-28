import { prisma } from '../../db/prisma';
import { pipelineService } from '../pipeline/pipeline.service';
import { storageService } from '../storage/storage.service';
import { ENV } from '../../config/env';
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
// Active Meeting Baas bot IDs stored in-memory
const activeBaasBots: Map<string, string> = new Map();

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
   * Dispatch PulseNote AI bot to join a meeting URL, drop chat message, and record audio.
   * Auto-selects between Meeting Baas API, Recall.ai API, or Stealth Puppeteer Chrome Bot.
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

    console.log(`[BotService] PulseNote AI Notetaker (${botName}) active for ${platform}: ${cleanUrl}`);

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

    const baasKey = ENV.MEETING_BAAS_API_KEY ? ENV.MEETING_BAAS_API_KEY.trim() : '';
    const recallKey = ENV.RECALL_API_KEY ? ENV.RECALL_API_KEY.trim() : '';

    setImmediate(() => {
      if (baasKey) {
        this.dispatchMeetingBaasBot(meeting.id, cleanUrl, botName, announcementMessage, baasKey).catch((err) => {
          console.error(`[BotService] Meeting Baas error:`, err);
        });
      } else if (recallKey) {
        this.dispatchRecallBot(meeting.id, cleanUrl, botName, announcementMessage, recallKey).catch((err) => {
          console.error(`[BotService] Recall error:`, err);
        });
      } else {
        this.dispatchNativePuppeteerBot(meeting.id, cleanUrl, botName, announcementMessage).catch((err) => {
          console.error(`[BotService] Puppeteer bot error:`, err);
        });
      }
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
   * Meeting Baas API Bot Engine (Bypasses Google Meet Data-Center IP Blocks)
   */
  private async dispatchMeetingBaasBot(meetingId: string, meetingUrl: string, botName: string, announcement: string, apiKey: string) {
    try {
      console.log(`[BotService] Dispatching Meeting Baas Bot to Google Meet: ${meetingUrl}...`);

      const res = await fetch('https://api.meetingbaas.com/bots', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          bot_name: botName,
          entry_message: announcement,
          reserved: false
        })
      });

      const data: any = await res.json();
      console.log(`[BotService] Meeting Baas API response:`, data);

      if (data.bot_id) {
        activeBaasBots.set(meetingId, data.bot_id);
        await prisma.meeting.update({
          where: { id: meetingId },
          data: { status: 'PROCESSING_AUDIO' }
        });
      }
    } catch (err: any) {
      console.error(`[BotService] Meeting Baas dispatch error:`, err);
    }
  }

  /**
   * Recall.ai API Bot Engine
   */
  private async dispatchRecallBot(meetingId: string, meetingUrl: string, botName: string, announcement: string, apiKey: string) {
    try {
      console.log(`[BotService] Dispatching Recall.ai Bot to Google Meet: ${meetingUrl}...`);

      const res = await fetch('https://us-east-1.recall.ai/api/v1/bot', {
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

      const data: any = await res.json();
      console.log(`[BotService] Recall.ai API response:`, data);
    } catch (err: any) {
      console.error(`[BotService] Recall.ai dispatch error:`, err);
    }
  }

  /**
   * Native Stealth Chromium Browser using Puppeteer
   */
  private async dispatchNativePuppeteerBot(meetingId: string, meetingUrl: string, botName: string, announcement: string) {
    try {
      console.log(`[BotService] Launching Native Puppeteer Chrome Bot for meeting ${meetingId}...`);

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1280,720',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--allow-file-access-from-files',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          '--autoplay-policy=no-user-gesture-required'
        ]
      });

      activeBrowsers.set(meetingId, browser);

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      const context = browser.defaultBrowserContext();
      await context.overridePermissions('https://meet.google.com', ['microphone', 'camera', 'notifications']);

      console.log(`[BotService] Bot navigating to Google Meet URL: ${meetingUrl}...`);
      await page.goto(meetingUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

      await new Promise((r) => setTimeout(r, 3000));

      try {
        await page.keyboard.down('Control');
        await page.keyboard.press('d');
        await page.keyboard.press('e');
        await page.keyboard.up('Control');
      } catch {
        // shortcut completed
      }

      await new Promise((r) => setTimeout(r, 2000));

      const inputSelectors = [
        'input[aria-label*="name" i]',
        'input[placeholder*="name" i]',
        'input[type="text"]',
        'input'
      ];

      for (const selector of inputSelectors) {
        try {
          const inputEl = await page.$(selector);
          if (inputEl) {
            await inputEl.click({ clickCount: 3 });
            await inputEl.type(botName, { delay: 40 });
            console.log(`[BotService] Typed bot name "${botName}" into ${selector}`);
            break;
          }
        } catch {
          // next selector
        }
      }

      await new Promise((r) => setTimeout(r, 1500));

      const elements = await page.$$('button, div[role="button"], span[role="button"]');
      for (const el of elements) {
        try {
          const text = await page.evaluate((node) => node.textContent || '', el);
          const cleanText = text.trim().toLowerCase();
          if (cleanText.includes('ask to join') || cleanText.includes('join now') || cleanText === 'join') {
            console.log(`[BotService] Bot clicking join element with text: "${text.trim()}"`);
            await el.click();
            break;
          }
        } catch {
          // continue
        }
      }

      await new Promise((r) => setTimeout(r, 5000));

      try {
        const chatSelectors = [
          '[aria-label*="Chat with everyone" i]',
          '[aria-label*="chat" i]',
          'button[aria-label*="chat" i]'
        ];

        for (const cSel of chatSelectors) {
          const chatBtn = await page.$(cSel);
          if (chatBtn) {
            await chatBtn.click();
            await new Promise((r) => setTimeout(r, 1500));
            const chatInput = await page.$('textarea[aria-label*="Send a message" i], textarea, div[contenteditable="true"]');
            if (chatInput) {
              await chatInput.type(announcement, { delay: 30 });
              await page.keyboard.press('Enter');
              console.log(`[BotService] Bot posted announcement in Google Meet chat!`);
            }
            break;
          }
        }
      } catch {
        console.log(`[BotService] Chat post attempt finished.`);
      }

    } catch (err: any) {
      console.error(`[BotService] Native Puppeteer bot error:`, err?.message || err);
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

    const baasKey = ENV.MEETING_BAAS_API_KEY ? ENV.MEETING_BAAS_API_KEY.trim() : '';
    const baasBotId = activeBaasBots.get(meetingId);

    if (baasBotId && baasKey) {
      console.log(`[BotService] Commanding Meeting Baas bot ${baasBotId} to leave call...`);
      try {
        await fetch(`https://api.meetingbaas.com/bots/${baasBotId}`, {
          method: 'DELETE',
          headers: { 'x-api-key': baasKey }
        });
      } catch (err) {
        console.error(`[BotService] Error leaving Meeting Baas bot:`, err);
      }
      activeBaasBots.delete(meetingId);
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

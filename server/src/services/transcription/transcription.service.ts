export interface DiarizedSegment {
  speakerLabel: string;
  speakerName: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface TranscriptionResult {
  fullText: string;
  language: string;
  segments: DiarizedSegment[];
  durationSeconds: number;
}

export class TranscriptionService {
  /**
   * Transcribe an audio/video recording file.
   * Abstracted so third-party APIs (Whisper API / Deepgram) can easily replace this implementation.
   */
  public async transcribeAudio(filePath: string, meetingTitle: string): Promise<TranscriptionResult> {
    // Simulating intelligent transcription processing with high fidelity diarized output
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const isTechMeeting = meetingTitle.toLowerCase().includes('product') || meetingTitle.toLowerCase().includes('strategy') || meetingTitle.toLowerCase().includes('api') || meetingTitle.toLowerCase().includes('sprint');
    
    let segments: DiarizedSegment[] = [];

    if (isTechMeeting) {
      segments = [
        {
          speakerLabel: "Speaker 1",
          speakerName: "Benjamin",
          startTime: 0,
          endTime: 14.5,
          text: "Welcome everyone. Today we need to finalize our Q4 product strategy and complete the MVP backend API architecture."
        },
        {
          speakerLabel: "Speaker 2",
          speakerName: "David",
          startTime: 15.2,
          endTime: 32.0,
          text: "I've completed the authentication middleware and database Prisma models. We have full support for SQLite locally and PostgreSQL in production."
        },
        {
          speakerLabel: "Speaker 3",
          speakerName: "Sarah",
          startTime: 33.1,
          endTime: 48.4,
          text: "That sounds great David. On the frontend design side, we have created a dark/light mode CSS design system with brand colors purple #804BF2 and gold #f2ae30."
        },
        {
          speakerLabel: "Speaker 1",
          speakerName: "Benjamin",
          startTime: 49.0,
          endTime: 68.2,
          text: "Excellent. Let's make sure the audio player synchronizes directly with the transcript timestamps when clicked so users can seek instantly."
        },
        {
          speakerLabel: "Speaker 2",
          speakerName: "David",
          startTime: 69.1,
          endTime: 85.6,
          text: "Agreed. I'll deploy the staging server environment by Friday so the internal QA team can start testing action item creation."
        },
        {
          speakerLabel: "Speaker 3",
          speakerName: "Sarah",
          startTime: 86.5,
          endTime: 104.0,
          text: "I will review the mobile onboarding experience and ensure touch targets on mobile devices meet the 44px standard."
        }
      ];
    } else {
      segments = [
        {
          speakerLabel: "Speaker 1",
          speakerName: "Alex",
          startTime: 0,
          endTime: 18.2,
          text: "Thanks for joining the meeting. Let's review the customer feedback from last week's beta release and outline our next steps."
        },
        {
          speakerLabel: "Speaker 2",
          speakerName: "Elena",
          startTime: 19.0,
          endTime: 38.5,
          text: "Users love the AI meeting summary quality! They specifically requested faster transcript search and custom due dates for action items."
        },
        {
          speakerLabel: "Speaker 1",
          speakerName: "Alex",
          startTime: 39.2,
          endTime: 56.0,
          text: "Great feedback. Let's add global search across all transcript text and meeting summaries right away."
        }
      ];
    }

    const fullText = segments.map((s) => `${s.speakerName}: ${s.text}`).join('\n\n');
    const durationSeconds = Math.max(...segments.map((s) => s.endTime)) + 5;

    return {
      fullText,
      language: 'en',
      segments,
      durationSeconds
    };
  }
}

export const transcriptionService = new TranscriptionService();

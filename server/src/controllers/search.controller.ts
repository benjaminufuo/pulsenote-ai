import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export class SearchController {
  public async searchAll(req: AuthenticatedRequest, res: Response) {
    try {
      const { workspaceId, q } = req.query;

      if (!workspaceId || !q) {
        return res.status(400).json({ error: 'workspaceId and query parameter q are required' });
      }

      const query = String(q).trim();
      if (!query) {
        return res.json({ meetings: [], transcripts: [], actionItems: [] });
      }

      // 1. Search Meetings by title
      const meetings = await prisma.meeting.findMany({
        where: {
          workspaceId: String(workspaceId),
          title: { contains: query }
        },
        include: {
          summary: true,
          participants: true
        },
        take: 10
      });

      // 2. Search Transcript Segments
      const transcriptSegments = await prisma.transcriptSegment.findMany({
        where: {
          text: { contains: query },
          transcript: {
            meeting: { workspaceId: String(workspaceId) }
          }
        },
        include: {
          transcript: {
            include: {
              meeting: {
                select: { id: true, title: true, date: true }
              }
            }
          }
        },
        take: 15
      });

      // 3. Search Action Items
      const actionItems = await prisma.actionItem.findMany({
        where: {
          task: { contains: query },
          meeting: { workspaceId: String(workspaceId) }
        },
        include: {
          meeting: {
            select: { id: true, title: true, date: true }
          }
        },
        take: 10
      });

      return res.json({
        query,
        meetings,
        transcriptSegments,
        actionItems
      });
    } catch (error: any) {
      console.error('Search error:', error);
      return res.status(500).json({ error: 'Failed to execute search query' });
    }
  }
}

export const searchController = new SearchController();

import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export class ActionItemController {
  public async getActionItems(req: AuthenticatedRequest, res: Response) {
    try {
      const { workspaceId, filter } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId query parameter is required' });
      }

      const meetings = await prisma.meeting.findMany({
        where: { workspaceId: String(workspaceId) },
        select: { id: true }
      });

      const meetingIds = meetings.map((m) => m.id);

      const whereClause: any = {
        meetingId: { in: meetingIds }
      };

      if (filter === 'pending') {
        whereClause.completed = false;
      } else if (filter === 'completed') {
        whereClause.completed = true;
      }

      const tasks = await prisma.actionItem.findMany({
        where: whereClause,
        orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
        include: {
          meeting: {
            select: { id: true, title: true, date: true }
          }
        }
      });

      return res.json(tasks);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch action items' });
    }
  }

  public async updateActionItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { completed, task, assigneeName, dueDate } = req.body;

      const updated = await prisma.actionItem.update({
        where: { id },
        data: {
          ...(completed !== undefined && { completed: Boolean(completed) }),
          ...(task !== undefined && { task }),
          ...(assigneeName !== undefined && { assigneeName }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
        }
      });

      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update action item' });
    }
  }
}

export const actionItemController = new ActionItemController();

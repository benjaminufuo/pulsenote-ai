import { Response } from 'express';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

export class WorkspaceController {
  public async getWorkspaces(req: AuthenticatedRequest, res: Response) {
    try {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.user!.id },
        include: { workspace: true }
      });

      return res.json(memberships.map((m) => ({ ...m.workspace, role: m.role })));
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
  }

  public async getWorkspaceMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { workspaceId } = req.params;

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true }
          }
        }
      });

      return res.json(members);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch workspace members' });
    }
  }
}

export const workspaceController = new WorkspaceController();

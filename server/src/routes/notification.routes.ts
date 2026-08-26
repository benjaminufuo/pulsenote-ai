import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;

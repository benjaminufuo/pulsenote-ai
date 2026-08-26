import { Router } from 'express';
import { workspaceController } from '../controllers/workspace.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', workspaceController.getWorkspaces);
router.get('/:workspaceId/members', workspaceController.getWorkspaceMembers);

export default router;

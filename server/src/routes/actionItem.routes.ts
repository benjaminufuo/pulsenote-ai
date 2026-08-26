import { Router } from 'express';
import { actionItemController } from '../controllers/actionItem.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', actionItemController.getActionItems);
router.patch('/:id', actionItemController.updateActionItem);

export default router;

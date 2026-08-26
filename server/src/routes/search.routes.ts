import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', searchController.searchAll);

export default router;

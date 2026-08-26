import { Router } from 'express';
import { meetingController } from '../controllers/meeting.controller';
import { authenticateToken } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/', meetingController.getMeetings);
router.post('/', meetingController.createMeeting);
router.post('/invite-bot', meetingController.inviteBot);
router.get('/:id', meetingController.getMeetingById);
router.delete('/:id', meetingController.deleteMeeting);

router.post('/:id/upload', uploadMiddleware.single('file'), meetingController.uploadRecording);
router.get('/:id/status-stream', meetingController.streamStatus);
router.patch('/:id/speakers', meetingController.updateSpeakerName);

export default router;

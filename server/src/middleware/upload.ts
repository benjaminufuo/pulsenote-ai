import multer from 'multer';

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/webm'
];

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|mp4|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload MP3, WAV, M4A, MP4, or WebM audio/video files.'));
    }
  }
});

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'pulsenote-secret-key-production-change-me',
  UPLOADS_DIR: path.join(__dirname, '../../uploads'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  RECALL_API_KEY: process.env.RECALL_API_KEY || '',
  RECALL_REGION: process.env.RECALL_REGION || '',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';
import { AuthenticatedRequest } from '../middleware/auth';

export class AuthController {
  public async register(req: Request, res: Response) {
    try {
      const { email, password, name, workspaceName } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
        }
      });

      // Create initial workspace
      const wsName = workspaceName || `${name}'s Workspace`;
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ws-${Date.now()}`;

      const workspace = await prisma.workspace.create({
        data: {
          name: wsName,
          slug,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, ENV.JWT_SECRET, {
        expiresIn: '7d'
      });

      return res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        workspace,
        token
      });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Failed to register user' });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { workspace: true }
          }
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, ENV.JWT_SECRET, {
        expiresIn: '7d'
      });

      const defaultWorkspace = user.memberships[0]?.workspace || null;

      return res.json({
        user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
        workspace: defaultWorkspace,
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Failed to log in' });
    }
  }

  public async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true }
      });

      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.user.id },
        include: { workspace: true }
      });

      return res.json({
        user,
        workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role }))
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch current user' });
    }
  }
}

export const authController = new AuthController();

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser, UserRole } from '../types';
import { db } from './db.service';

export class AuthService {
  // Simple deterministic hash for development/demo (in production bcrypt is used)
  private hashPassword(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hashed_${Math.abs(hash)}_${password.length}`;
  }

  generateToken(user: AuthUser): string {
    return jwt.sign(
      {
        sub: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    department?: string;
  }): Promise<{ user: AuthUser; token: string }> {
    const existing = await db.getUserByEmail(data.email);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = this.hashPassword(data.password);
    const user = await db.createUser({
      email: data.email,
      name: data.name,
      role: data.role || 'student',
      department: data.department,
      passwordHash,
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: AuthUser; token: string }> {
    const user = await db.getUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const expectedHash = this.hashPassword(data.password);
    if (user.passwordHash && user.passwordHash !== expectedHash) {
      throw new Error('Invalid email or password');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };

    const token = this.generateToken(authUser);
    return { user: authUser, token };
  }

  async getProfile(userId: string): Promise<AuthUser | null> {
    const user = await db.getUserById(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };
  }
}

export const authService = new AuthService();

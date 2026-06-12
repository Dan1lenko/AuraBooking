import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async register(data: any) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.createUser({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role as Role,
    });
    const { password, ...result } = user;
    return result;
  }

  async login(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: rawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const { password, ...userResult } = user;
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: userResult,
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      // Security Alert: Potential token theft/reuse
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Token compromise suspected. Sessions revoked.');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Create new token pair
    const user = tokenRecord.user;
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: newRawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't leak user existence
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.usersService.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expires,
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(data: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: data.token,
        resetTokenExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    await this.usersService.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    return { message: 'Password updated successfully' };
  }
}

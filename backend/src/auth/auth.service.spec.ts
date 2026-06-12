import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test',
  password: 'hashedpassword',
  role: 'CLIENT',
  resetToken: null,
  resetTokenExpires: null,
};

const mockUsersService = {
  findByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockPrismaService = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.createUser.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
        role: 'CLIENT',
      });

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login and return tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate valid refresh tokens', async () => {
      const mockTokenRecord = {
        id: 1,
        token: 'old-refresh-token',
        userId: 1,
        expiresAt: new Date(Date.now() + 100000),
        isRevoked: false,
        user: mockUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);

      const result = await service.refresh('old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isRevoked: true },
      });
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });

    it('should revoke all tokens and throw if token is already revoked (compromised)', async () => {
      const mockTokenRecord = {
        id: 1,
        token: 'stolen-token',
        userId: 1,
        expiresAt: new Date(Date.now() + 100000),
        isRevoked: true,
        user: mockUser,
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);

      await expect(service.refresh('stolen-token')).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { isRevoked: true },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

const mockPrismaUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  role: 'CLIENT',
  resetToken: null,
  resetTokenExpires: null,
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockPrismaUser),
    create: jest.fn().mockResolvedValue(mockPrismaUser),
    update: jest.fn().mockResolvedValue(mockPrismaUser),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should find user by email', async () => {
    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockPrismaUser);
  });
});

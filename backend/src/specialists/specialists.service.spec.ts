import { Test, TestingModule } from '@nestjs/testing';
import { SpecialistsService } from './specialists.service';
import { PrismaService } from '../prisma.service';

const mockProfile = {
  id: 1,
  userId: 2,
  bio: 'A great specialist',
  category: 'Massage',
  price: 50.0,
  experience: 5,
  avatarUrl: null,
  rating: 4.5,
  reviewsCount: 10,
};

const mockWorkingHours = {
  id: 1,
  specialistProfileId: 1,
  dayOfWeek: 1, // Monday
  startTime: '09:00',
  endTime: '11:00',
  isAvailable: true,
};

const mockPrismaService = {
  specialistProfile: {
    findMany: jest.fn().mockResolvedValue([mockProfile]),
    findUnique: jest.fn().mockResolvedValue(mockProfile),
    upsert: jest.fn().mockResolvedValue(mockProfile),
  },
  workingHours: {
    findMany: jest.fn().mockResolvedValue([mockWorkingHours]),
    findUnique: jest.fn().mockResolvedValue(mockWorkingHours),
    upsert: jest.fn().mockResolvedValue(mockWorkingHours),
  },
  booking: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 1, ...args.data })),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

describe('SpecialistsService', () => {
  let service: SpecialistsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialistsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SpecialistsService>(SpecialistsService);
  });

  it('should find all with filter', async () => {
    const result = await service.findAll({ category: 'Massage' });
    expect(result).toEqual([mockProfile]);
  });

  it('should find working hours', async () => {
    const result = await service.findWorkingHours(2);
    expect(result).toEqual([mockWorkingHours]);
    expect(mockPrismaService.specialistProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 2 },
    });
  });

  it('should update working hours', async () => {
    const schedule = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },
    ];
    const result = await service.updateWorkingHours(2, schedule);
    expect(result).toEqual([mockWorkingHours]);
    expect(mockPrismaService.workingHours.upsert).toHaveBeenCalled();
  });

  it('should generate empty slots if not available or no hours set', async () => {
    mockPrismaService.workingHours.findUnique.mockResolvedValueOnce(null);
    const result = await service.generateSlots(1, '2026-06-15'); // Monday
    expect(result).toEqual([]);
  });

  it('should generate slots and mark booked ones correctly', async () => {
    // Mock working hours to be Monday 09:00 - 11:00
    mockPrismaService.workingHours.findUnique.mockResolvedValueOnce(mockWorkingHours);
    // Mock active booking from 09:30 to 10:00
    const activeBooking = {
      id: 1,
      clientId: 3,
      specialistProfileId: 1,
      startTime: new Date('2026-06-15T09:30:00.000Z'),
      endTime: new Date('2026-06-15T10:00:00.000Z'),
      status: 'CONFIRMED',
    };
    mockPrismaService.booking.findMany.mockResolvedValueOnce([activeBooking]);

    const result = await service.generateSlots(1, '2026-06-15');

    expect(result).toHaveLength(4);
    // Slot 1: 09:00 - 09:30 should not be booked
    expect(result[0]).toEqual({
      time: '09:00',
      startTime: '2026-06-15T09:00:00.000Z',
      endTime: '2026-06-15T09:30:00.000Z',
      isBooked: false,
    });
    // Slot 2: 09:30 - 10:00 should be booked
    expect(result[1]).toEqual({
      time: '09:30',
      startTime: '2026-06-15T09:30:00.000Z',
      endTime: '2026-06-15T10:00:00.000Z',
      isBooked: true,
    });
    // Slot 3: 10:00 - 10:30 should not be booked
    expect(result[2]).toEqual({
      time: '10:00',
      startTime: '2026-06-15T10:00:00.000Z',
      endTime: '2026-06-15T10:30:00.000Z',
      isBooked: false,
    });
  });
});


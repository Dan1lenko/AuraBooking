import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SpecialistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  }) {
    const where: any = {
      user: {
        role: 'SPECIALIST',
      },
    };

    if (filters.category) {
      where.category = {
        equals: filters.category,
        mode: 'insensitive',
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.minRating !== undefined) {
      where.rating = {
        gte: filters.minRating,
      };
    }

    return this.prisma.specialistProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }
    return profile;
  }

  async findByUserId(userId: number) {
    return this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
  }

  async updateOrCreateProfile(userId: number, data: any) {
    return this.prisma.specialistProfile.upsert({
      where: { userId },
      update: {
        bio: data.bio,
        category: data.category,
        price: parseFloat(data.price),
        experience: parseInt(data.experience, 10),
        avatarUrl: data.avatarUrl,
      },
      create: {
        userId,
        bio: data.bio,
        category: data.category,
        price: parseFloat(data.price),
        experience: parseInt(data.experience, 10),
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async findWorkingHours(userId: number) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }
    return this.prisma.workingHours.findMany({
      where: { specialistProfileId: profile.id },
    });
  }

  async updateWorkingHours(userId: number, schedule: any[]) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }

    const operations = schedule.map((day) =>
      this.prisma.workingHours.upsert({
        where: {
          specialistProfileId_dayOfWeek: {
            specialistProfileId: profile.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
        create: {
          specialistProfileId: profile.id,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async generateSlots(specialistProfileId: number, dateStr: string) {
    const queryDate = new Date(dateStr);
    const dayOfWeek = queryDate.getUTCDay();

    // 1. Get working hours for this day of week
    const hours = await this.prisma.workingHours.findUnique({
      where: {
        specialistProfileId_dayOfWeek: {
          specialistProfileId,
          dayOfWeek,
        },
      },
    });

    if (!hours || !hours.isAvailable) {
      return [];
    }

    // 2. Fetch existing bookings on this day
    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        specialistProfileId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 3. Generate 30min slots
    const slots: any[] = [];
    const [startH, startM] = hours.startTime.split(':').map(Number);
    const [endH, endM] = hours.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + 30 <= endMinutes) {
      const sh = Math.floor(currentMinutes / 60);
      const sm = currentMinutes % 60;
      const eh = Math.floor((currentMinutes + 30) / 60);
      const em = (currentMinutes + 30) % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(sh)}:${pad(sm)}`;

      const slotStart = new Date(dateStr);
      slotStart.setUTCHours(sh, sm, 0, 0);

      const slotEnd = new Date(dateStr);
      slotEnd.setUTCHours(eh, em, 0, 0);

      // Check if slot overlaps with any active bookings
      const isBooked = bookings.some(
        (b) =>
          slotStart.getTime() < new Date(b.endTime).getTime() &&
          slotEnd.getTime() > new Date(b.startTime).getTime(),
      );

      slots.push({
        time: timeStr,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isBooked,
      });

      currentMinutes += 30;
    }

    return slots;
  }
}


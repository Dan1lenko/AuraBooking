import { Module } from '@nestjs/common';
import { SpecialistsService } from './specialists.service';
import { SpecialistsController } from './specialists.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [SpecialistsController],
  providers: [SpecialistsService, PrismaService],
})
export class SpecialistsModule {}

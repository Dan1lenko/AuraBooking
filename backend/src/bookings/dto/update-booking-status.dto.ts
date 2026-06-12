import { IsIn, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsString({ message: 'Статус має бути рядком' })
  @IsIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], { message: 'Некоректний статус бронювання' })
  status: string;
}

import { IsISO8601, IsInt, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsInt({ message: 'ID профілю спеціаліста має бути цілим числом' })
  @IsNotEmpty({ message: 'ID профілю спеціаліста обов’язковий' })
  specialistProfileId: number;

  @IsISO8601({}, { message: 'Некоректний формат дати початку (очікується ISO8601)' })
  @IsNotEmpty({ message: 'Час початку обов’язковий' })
  startTime: string;

  @IsISO8601({}, { message: 'Некоректний формат дати завершення (очікується ISO8601)' })
  @IsNotEmpty({ message: 'Час завершення обов’язковий' })
  endTime: string;
}

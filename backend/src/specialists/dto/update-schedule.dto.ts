import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ScheduleItemDto {
  @IsInt({ message: 'День тижня має бути цілим числом' })
  @Min(0, { message: 'День тижня має бути від 0 до 6' })
  @Max(6, { message: 'День тижня має бути від 0 до 6' })
  dayOfWeek: number;

  @IsString({ message: 'Час початку має бути рядком' })
  @IsNotEmpty({ message: 'Час початку обов’язковий' })
  startTime: string;

  @IsString({ message: 'Час завершення має бути рядком' })
  @IsNotEmpty({ message: 'Час завершення обов’язковий' })
  endTime: string;

  @IsBoolean({ message: 'Доступність має бути логічним значенням' })
  @IsOptional()
  isAvailable?: boolean;
}

export class UpdateScheduleDto {
  @IsArray({ message: 'Розклад має бути масивом' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedule: ScheduleItemDto[];
}

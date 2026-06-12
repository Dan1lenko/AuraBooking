import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt({ message: 'ID бронювання має бути цілим числом' })
  @IsNotEmpty({ message: 'ID бронювання обов’язковий' })
  bookingId: number;

  @IsInt({ message: 'Рейтинг має бути цілим числом' })
  @Min(1, { message: 'Рейтинг має бути не менше 1' })
  @Max(5, { message: 'Рейтинг має бути не більше 5' })
  rating: number;

  @IsString({ message: 'Коментар має бути рядком' })
  @IsNotEmpty({ message: 'Коментар обов’язковий' })
  comment: string;
}

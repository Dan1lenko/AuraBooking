import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'Токен оновлення має бути рядком' })
  @IsNotEmpty({ message: 'Токен оновлення обов’язковий' })
  refreshToken: string;
}

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Токен має бути рядком' })
  @IsNotEmpty({ message: 'Токен обов’язковий' })
  token: string;

  @IsString({ message: 'Пароль має бути рядком' })
  @IsNotEmpty({ message: 'Пароль обов’язковий' })
  @MinLength(6, { message: 'Пароль має містити щонайменше 6 символів' })
  password: string;
}

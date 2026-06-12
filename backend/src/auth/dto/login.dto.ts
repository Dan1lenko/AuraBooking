import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некоректний формат email' })
  @IsNotEmpty({ message: 'Email обов’язковий' })
  email: string;

  @IsString({ message: 'Пароль має бути рядком' })
  @IsNotEmpty({ message: 'Пароль обов’язковий' })
  password: string;
}

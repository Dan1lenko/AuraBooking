import { IsEmail, IsNotEmpty, IsString, IsEnum, MinLength, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Некоректний формат email' })
  @IsNotEmpty({ message: 'Email обов’язковий' })
  email: string;

  @IsString({ message: 'Пароль має бути рядком' })
  @IsNotEmpty({ message: 'Пароль обов’язковий' })
  @MinLength(6, { message: 'Пароль має містити щонайменше 6 символів' })
  password: string;

  @IsString({ message: 'Ім’я має бути рядком' })
  @IsOptional()
  name?: string;

  @IsEnum(Role, { message: 'Некоректна роль' })
  @IsNotEmpty({ message: 'Роль обов’язкова' })
  role: Role;
}

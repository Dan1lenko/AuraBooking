import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Некоректний формат email' })
  @IsNotEmpty({ message: 'Email обов’язковий' })
  email: string;
}

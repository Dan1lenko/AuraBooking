import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Біографія має бути рядком' })
  @IsNotEmpty({ message: 'Біографія обов’язкова' })
  bio: string;

  @IsString({ message: 'Категорія має бути рядком' })
  @IsNotEmpty({ message: 'Категорія обов’язкова' })
  category: string;

  @IsNotEmpty({ message: 'Ціна обов’язкова' })
  price: any;

  @IsNotEmpty({ message: 'Досвід обов’язковий' })
  experience: any;

  @IsString({ message: 'Посилання на аватар має бути рядком' })
  @IsOptional()
  avatarUrl?: string;
}

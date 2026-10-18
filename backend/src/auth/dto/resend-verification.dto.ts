import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  email!: string;
}

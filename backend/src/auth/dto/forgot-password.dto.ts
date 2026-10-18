import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  email!: string;
}

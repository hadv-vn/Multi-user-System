import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;
}

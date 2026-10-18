import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_REGEX,
  PASSWORD_WEAK_MESSAGE,
} from './password-rules.js';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_WEAK_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: PASSWORD_WEAK_MESSAGE })
  password!: string;
}

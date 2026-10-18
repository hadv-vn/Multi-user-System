import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_REGEX,
  PASSWORD_WEAK_MESSAGE,
} from '../../auth/dto/password-rules.js';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại.' })
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: PASSWORD_WEAK_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: PASSWORD_WEAK_MESSAGE })
  newPassword!: string;
}

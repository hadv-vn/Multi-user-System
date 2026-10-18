import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu.' })
  @MaxLength(128)
  password!: string;
}

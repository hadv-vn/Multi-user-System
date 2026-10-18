import { IsNotEmpty, IsString } from 'class-validator';

export class DeactivateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu để xác nhận.' })
  password!: string;
}

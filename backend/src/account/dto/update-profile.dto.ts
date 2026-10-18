import { IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @Length(1, 100, { message: 'Tên phải có độ dài 1-100 ký tự.' })
  name!: string;
}

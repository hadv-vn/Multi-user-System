import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề task.' })
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

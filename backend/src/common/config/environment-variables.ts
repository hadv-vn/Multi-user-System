import { IsIn, IsInt, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT!: number;

  @IsString()
  CORS_ORIGIN!: string;

  @IsInt()
  @Min(4)
  @Max(15)
  BCRYPT_SALT_ROUNDS!: number;

  @IsString()
  SESSION_COOKIE_NAME!: string;

  @IsIn(['lax', 'strict', 'none'])
  SESSION_COOKIE_SAME_SITE!: 'lax' | 'strict' | 'none';

  @IsString()
  SMTP_HOST!: string;

  @IsInt()
  SMTP_PORT!: number;

  @IsString()
  SMTP_USER!: string;

  @IsString()
  SMTP_PASSWORD!: string;

  @IsString()
  SMTP_FROM_ADDRESS!: string;

  @IsUrl({ require_tld: false })
  APP_BASE_URL!: string;

  // CSRF (C-14) — HMAC secret dùng để ký/verify CSRF token (double-submit
  // cookie stateless). >= 32 ký tự để đủ entropy cho HMAC-SHA256 key.
  @IsString()
  @MinLength(32)
  CSRF_SECRET!: string;
}

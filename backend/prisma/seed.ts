import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_STRENGTH_REGEX,
} from '../src/auth/dto/password-rules.js';
import { USER_STATUS } from '../src/auth/repositories/user-record.interface.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ROLE_NAME } from '../src/rbac/role.constants.js';

const DEFAULT_BCRYPT_SALT_ROUNDS = 12;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing required env var: DATABASE_URL');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function seedRoles(): Promise<void> {
  await prisma.role.upsert({
    where: { name: ROLE_NAME.USER },
    update: {},
    create: { name: ROLE_NAME.USER, description: 'Người dùng thông thường' },
  });

  await prisma.role.upsert({
    where: { name: ROLE_NAME.ADMIN },
    update: {},
    create: { name: ROLE_NAME.ADMIN, description: 'Quản trị hệ thống' },
  });
}

function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    PASSWORD_STRENGTH_REGEX.test(password)
  );
}

// Tài khoản ADMIN mặc định, lấy từ SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
// (không hardcode trong repo). Chỉ tạo khi email chưa tồn tại — seed chạy
// lại (mỗi lần run-all.sh) không ghi đè mật khẩu admin đã đổi sau đó.
async function seedDefaultAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Bỏ qua tạo admin mặc định: chưa đặt SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD.');
    return;
  }
  if (!isPasswordStrongEnough(password)) {
    throw new Error(
      `SEED_ADMIN_PASSWORD không đạt quy tắc mật khẩu (>= ${PASSWORD_MIN_LENGTH} ký tự, có chữ cái và chữ số).`,
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser !== null) {
    console.log(`Admin mặc định ${email} đã tồn tại, giữ nguyên.`);
    return;
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || DEFAULT_BCRYPT_SALT_ROUNDS;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await prisma.$transaction(async (tx) => {
    const adminRole = await tx.role.findUniqueOrThrow({ where: { name: ROLE_NAME.ADMIN } });
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        status: USER_STATUS.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: adminRole.id } });
  });
  console.log(`Đã tạo admin mặc định ${email}.`);
}

async function main(): Promise<void> {
  await seedRoles();
  await seedDefaultAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });

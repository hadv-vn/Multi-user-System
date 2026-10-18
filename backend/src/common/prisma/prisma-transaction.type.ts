import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Alias dùng chung cho tham số transaction client của Prisma — tránh mỗi
 * module tự import lại `Prisma` namespace đầy đủ chỉ để lấy 1 type.
 */
export type PrismaTx = Prisma.TransactionClient;

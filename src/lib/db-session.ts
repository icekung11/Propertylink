import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Execute Prisma queries inside an interactive transaction with RLS user context (app.user_id) set.
 * As per Handbook Rule 1: Set Session Variable for RLS
 */
export async function withUserContext<T>(
  userId: string | undefined | null,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    if (userId) {
      // SET LOCAL scoped to the current transaction
      await tx.$queryRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    }
    return fn(tx);
  });
}

import { prisma } from "../config/prisma.js";

export interface NeonUserRecord {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt?: Date | null;
}

export const findNeonUser = async (filter: {
  id?: string;
  email?: string;
}): Promise<NeonUserRecord | null> => {
  try {
    if (filter.id) {
      const rows = await prisma.$queryRaw<NeonUserRecord[]>`
            SELECT id,name,email,role,"createdAt" as "createdAt"
            FROM neon_auth.user
            WHERE id = ${filter.id}::uuid
            LIMIT 1
            `;

      return rows[0] || null;
    }

    if (filter.email) {
      const rows = await prisma.$queryRaw<NeonUserRecord[]>`
            SELECT id,name,email,role,"createdAt" as "createdAt"
            FROM neon_auth.user
            WHERE id = ${filter.email.trim().toLowerCase()}
            LIMIT 1
            `;

      return rows[0] || null;
    }
  } catch (e) {
    console.error(e);
  }
  return null;
};

export const updateNeonUserRole = async (
  userId: string,
  role: string,
): Promise<void> => {
  try {
    await prisma.$executeRaw`
    UPDATE neon_auth.user 
    SET role = ${role}, "updatedAt" = NOW() 
    WHERE id = ${userId}::uuid AND (role IS NULL OR role != "admin")`;
  } catch (error) {
    console.error(error);
  }
};

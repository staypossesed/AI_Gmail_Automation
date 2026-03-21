import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/database";

/**
 * Get or create user from Clerk session.
 */
export async function getOrCreateUser() {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;

  const email = (sessionClaims?.email as string) || "";

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: email || `user-${userId}@placeholder.local`,
      },
    });
  }

  return user;
}

/**
 * Require auth - throws if not authenticated.
 */
export async function requireAuth() {
  const user = await getOrCreateUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

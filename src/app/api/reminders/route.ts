import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/database";

/**
 * GET /api/reminders
 * Returns upcoming reminders/deadlines.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const completed = searchParams.get("completed");

    const where: { userId: string; completed?: boolean } = { userId: user.id };
    if (completed === "true") where.completed = true;
    else if (completed === "false") where.completed = false;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        sourceEmail: {
          select: { subject: true, sender: true },
        },
      },
    });

    return NextResponse.json(reminders);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

/**
 * PATCH /api/reminders
 * Mark reminder as completed.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing reminder id" }, { status: 400 });
    }

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: user.id },
    });

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    await prisma.reminder.update({
      where: { id },
      data: { completed: completed ?? true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unauthorized" },
      { status: 401 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/infrastructure/auth/auth-options";
import { handlers } from "@/shared/infrastructure/di/container";
import { GetAllUsersQuery } from "@/features/auth/application/get-all-users-query";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await handlers.getAllUsers.execute(new GetAllUsersQuery());
  return NextResponse.json(users);
}

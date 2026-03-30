import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/shared/infrastructure/di/container";
import { RegisterCommand } from "@/features/auth/application/register-command";
import { registerSchema } from "@/shared/validation/auth-schemas";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const userId = await handlers.register.execute(
      new RegisterCommand(parsed.data.email, parsed.data.name, parsed.data.password),
    );
    return NextResponse.json({ userId }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message === "Email already registered") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

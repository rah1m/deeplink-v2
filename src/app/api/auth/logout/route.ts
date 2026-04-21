import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, destroySession } from "@/lib/auth";

export async function POST() {
  const token = cookies().get("dl_session")?.value;
  if (token) await destroySession(token);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

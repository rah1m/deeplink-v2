import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { expireLink, getLinkById, getLinkMetrics } from "@/lib/links";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(params.id);
  const link = getLinkById(id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ link, metrics: getLinkMetrics(id) });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  expireLink(Number(params.id));
  return NextResponse.json({ ok: true });
}

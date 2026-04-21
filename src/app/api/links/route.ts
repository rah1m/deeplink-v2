import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { createLink, listLinksWithMetrics } from "@/lib/links";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  destinationPath: z.string().min(1).max(2000),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  useBitly: z.boolean().optional(),
});

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ links: await listLinksWithMetrics() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const link = await createLink({ ...parsed.data, createdBy: user.id });
  return NextResponse.json({ link }, { status: 201 });
}

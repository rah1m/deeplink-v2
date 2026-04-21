import { notFound } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import ExpireButton from "./ExpireButton";
import { getLinkById, getLinkMetrics, isExpired } from "@/lib/links";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function publicUrl(slug: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/l/${slug}`;
}

export default async function LinkDetailPage({ params }: Params) {
  const id = Number(params.id);
  const link = await getLinkById(id);
  if (!link) notFound();

  const metrics = await getLinkMetrics(id);
  const url = link.short_url ?? publicUrl(link.slug);
  const expired = isExpired(link);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/links" className="text-sm text-zinc-400 hover:underline">
            ← All links
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{link.name}</h1>
          <p className="text-sm text-zinc-500">{link.destination_path}</p>
        </div>
        {!expired && <ExpireButton id={link.id} />}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-2 text-xs uppercase tracking-wider text-zinc-400">
          Share URL
        </div>
        <div className="flex items-center gap-3">
          <code className="truncate text-sm">{url}</code>
          <CopyButton value={url} />
        </div>
        {link.short_url && (
          <div className="mt-3 text-xs text-zinc-500">
            Original: <code>{publicUrl(link.slug)}</code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Clicks" value={metrics.totals.clicks} />
        <Stat label="Opens" value={metrics.totals.opens} />
        <Stat label="Installs" value={metrics.totals.installs} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          By platform
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800 text-sm">
          <table className="w-full">
            <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-2">Platform</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {metrics.byPlatform.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-zinc-500">
                    No events yet.
                  </td>
                </tr>
              ) : (
                metrics.byPlatform.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{r.platform ?? "—"}</td>
                    <td className="px-4 py-2">{r.kind}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.n}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          UTM parameters
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Row k="utm_source" v={link.utm_source} />
          <Row k="utm_medium" v={link.utm_medium} />
          <Row k="utm_campaign" v={link.utm_campaign} />
          <Row k="utm_term" v={link.utm_term} />
          <Row k="utm_content" v={link.utm_content} />
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Recent events
        </h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800 text-sm">
          <table className="w-full">
            <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Platform</th>
                <th className="px-4 py-2">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {metrics.recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-zinc-500">
                    Nothing yet.
                  </td>
                </tr>
              ) : (
                metrics.recent.map((e: any) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-xs text-zinc-400">{e.created_at}</td>
                    <td className="px-4 py-2">{e.kind}</td>
                    <td className="px-4 py-2">{e.platform ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {e.referrer ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <span className="text-zinc-400">{k}</span>
      <span className="font-mono text-zinc-200">{v ?? "—"}</span>
    </div>
  );
}

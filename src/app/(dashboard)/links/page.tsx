import Link from "next/link";
import { listLinksWithMetrics } from "@/lib/links";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

function publicUrl(slug: string) {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return `${base}/l/${slug}`;
}

export default function LinksPage() {
  const links = listLinksWithMetrics();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Links</h1>
        <Link
          href="/links/new"
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-900"
        >
          New link
        </Link>
      </div>

      {links.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No links yet. Create your first marketing link.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-900/60 text-left text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Short URL</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Opens</th>
                <th className="px-4 py-3 text-right">Installs</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {links.map((l) => {
                const expired = l.expires_at
                  ? new Date(l.expires_at).getTime() <= Date.now()
                  : false;
                const url = l.short_url ?? publicUrl(l.slug);
                return (
                  <tr key={l.id} className={expired ? "opacity-50" : undefined}>
                    <td className="px-4 py-3">
                      <Link href={`/links/${l.id}`} className="font-medium hover:underline">
                        {l.name}
                      </Link>
                      <div className="text-xs text-zinc-500">{l.destination_path}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="truncate text-xs text-zinc-300">{url}</code>
                        <CopyButton value={url} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.clicks}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.opens}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{l.installs}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {l.expires_at
                        ? new Date(l.expires_at).toLocaleDateString()
                        : "—"}
                      {expired && (
                        <span className="ml-2 rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] text-red-300">
                          expired
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

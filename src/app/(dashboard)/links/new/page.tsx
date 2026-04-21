"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none";
const label = "block text-sm text-zinc-300";

export default function NewLinkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const expiresRaw = fd.get("expiresAt")?.toString();
    const payload = {
      name: fd.get("name")?.toString() ?? "",
      destinationPath: fd.get("destinationPath")?.toString() ?? "",
      utmSource: str(fd.get("utmSource")),
      utmMedium: str(fd.get("utmMedium")),
      utmCampaign: str(fd.get("utmCampaign")),
      utmTerm: str(fd.get("utmTerm")),
      utmContent: str(fd.get("utmContent")),
      expiresAt: expiresRaw ? new Date(expiresRaw).toISOString() : null,
      useBitly: fd.get("useBitly") === "on",
    };

    setLoading(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create link");
      return;
    }
    const data = await res.json();
    router.push(`/links/${data.link.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New link</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6"
      >
        <div className="space-y-2">
          <label className={label}>Name</label>
          <input name="name" required className={field} placeholder="Spring campaign hero" />
        </div>

        <div className="space-y-2">
          <label className={label}>Destination path or URL</label>
          <input
            name="destinationPath"
            required
            className={field}
            placeholder="/promo/spring  or  https://nar.az/promo/spring"
          />
          <p className="text-xs text-zinc-500">
            On iOS this is used as the Universal Link. On Android it powers the App Link
            with a Play Store fallback.
          </p>
        </div>

        <fieldset className="space-y-3 rounded-md border border-zinc-800 p-4">
          <legend className="px-1 text-xs uppercase tracking-wider text-zinc-400">
            UTM parameters
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <Input name="utmSource" label="utm_source" />
            <Input name="utmMedium" label="utm_medium" />
            <Input name="utmCampaign" label="utm_campaign" />
            <Input name="utmTerm" label="utm_term" />
            <div className="col-span-2">
              <Input name="utmContent" label="utm_content" />
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={label}>Expires</label>
            <input type="datetime-local" name="expiresAt" className={field} />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" name="useBitly" />
              Shorten with Bitly
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create link"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-zinc-400">{label}</span>
      <input name={name} className={field} />
    </div>
  );
}

function str(v: FormDataEntryValue | null): string | undefined {
  const s = v?.toString().trim();
  return s ? s : undefined;
}

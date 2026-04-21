"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ExpireButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function expire() {
    if (!confirm("Expire this link now? It will stop working immediately.")) return;
    setLoading(true);
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={expire}
      disabled={loading}
      className="rounded-md border border-red-800 px-3 py-2 text-sm text-red-300 hover:border-red-600 disabled:opacity-60"
    >
      {loading ? "Expiring…" : "Expire now"}
    </button>
  );
}

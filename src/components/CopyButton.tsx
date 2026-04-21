"use client";

import { useState } from "react";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button
      onClick={copy}
      className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:border-zinc-500"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

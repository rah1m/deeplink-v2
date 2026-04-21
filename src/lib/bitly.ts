export async function shortenWithBitly(longUrl: string): Promise<string | null> {
  const token = process.env.BITLY_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch("https://api-ssl.bitly.com/v4/shorten", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        long_url: longUrl,
        domain: process.env.BITLY_DOMAIN ?? "bit.ly",
      }),
    });
    if (!res.ok) {
      console.error("Bitly error", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { link?: string };
    return data.link ?? null;
  } catch (err) {
    console.error("Bitly fetch failed", err);
    return null;
  }
}

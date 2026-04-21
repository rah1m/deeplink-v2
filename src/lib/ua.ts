import { UAParser } from "ua-parser-js";

export type Platform = "ios" | "android" | "desktop" | "other";

export function detectPlatform(userAgent: string | null): Platform {
  if (!userAgent) return "other";
  const os = new UAParser(userAgent).getOS().name?.toLowerCase() ?? "";
  if (os.includes("ios") || /iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (os.includes("android")) return "android";
  if (/(mac os|windows|linux)/i.test(userAgent)) return "desktop";
  return "other";
}

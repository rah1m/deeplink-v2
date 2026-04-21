import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = currentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/links" className="text-lg font-semibold">
            Deeplink Platform
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

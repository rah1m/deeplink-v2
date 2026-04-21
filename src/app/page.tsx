import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  if (await currentUser()) redirect("/links");
  redirect("/login");
}

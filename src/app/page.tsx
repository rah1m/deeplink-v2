import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default function Home() {
  if (currentUser()) redirect("/links");
  redirect("/login");
}

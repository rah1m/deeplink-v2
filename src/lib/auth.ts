import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { getDb } from "./db";

const SESSION_COOKIE = "dl_session";
const SESSION_DAYS = 14;

export type SessionUser = { id: number; email: string; name: string };

export function verifyLogin(email: string, password: string): SessionUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as
    | { id: number; email: string; name: string; password_hash: string }
    | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export function createSession(userId: number): string {
  const token = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);
  return token;
}

export function destroySession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function readSessionUser(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as
    | { id: number; email: string; name: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export function currentUser(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return readSessionUser(token);
}

export function requireUser(): SessionUser {
  const user = currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

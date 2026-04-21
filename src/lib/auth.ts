import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { ensureSchema, sql } from "./db";

const SESSION_COOKIE = "dl_session";
const SESSION_DAYS = 14;

export type SessionUser = { id: number; email: string; name: string };

type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
};

export async function verifyLogin(
  email: string,
  password: string
): Promise<SessionUser | null> {
  await ensureSchema();
  const rows = (await sql`
    SELECT id, email, name, password_hash FROM users
    WHERE email = ${email.toLowerCase().trim()}
  `) as UserRow[];
  const row = rows[0];
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.id, email: row.email, name: row.name };
}

export async function createSession(userId: number): Promise<string> {
  await ensureSchema();
  const token = nanoid(40);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await sql`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt})
  `;
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await ensureSchema();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function readSessionUser(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) return null;
  await ensureSchema();
  const rows = (await sql`
    SELECT u.id, u.email, u.name, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `) as { id: number; email: string; name: string; expires_at: string }[];
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(token);
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

export async function currentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return readSessionUser(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

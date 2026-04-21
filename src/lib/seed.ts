import bcrypt from "bcryptjs";
import { getDb } from "./db";

function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email) as { id: number } | undefined;

  if (existing) {
    console.log(`User ${email} already exists (id=${existing.id}). Skipping.`);
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email, hash, "Admin");

  console.log(`Seeded admin ${email} (id=${info.lastInsertRowid}).`);
  console.log(`Password: ${password}`);
}

main();

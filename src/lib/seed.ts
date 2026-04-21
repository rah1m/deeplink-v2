import bcrypt from "bcryptjs";
import { ensureSchema, sql } from "./db";

async function main() {
  await ensureSchema();

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme";

  const existing = (await sql`SELECT id FROM users WHERE email = ${email}`) as {
    id: number;
  }[];
  if (existing.length > 0) {
    console.log(`User ${email} already exists (id=${existing[0].id}). Skipping.`);
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const rows = (await sql`
    INSERT INTO users (email, password_hash, name)
    VALUES (${email}, ${hash}, 'Admin')
    RETURNING id
  `) as { id: number }[];

  console.log(`Seeded admin ${email} (id=${rows[0].id}).`);
  console.log(`Password: ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

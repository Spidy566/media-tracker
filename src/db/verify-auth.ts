import { compare } from "bcrypt-ts";
import { Pool } from "pg";

async function verifyAuth() {
  const databaseUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const client = await pool.connect();
    try {
      console.log("🔍 Running auth verification queries...");

      // 1. Check user counts and null emails
      const userRes = await client.query(
        `SELECT 
          COUNT(*)::int as total,
          COUNT(password_hash)::int as with_password,
          COUNT(*) FILTER (WHERE email IS NULL)::int as null_email,
          COUNT(*) FILTER (WHERE email_verified = true)::int as verified_email
        FROM users;`,
      );
      const userRow = userRes.rows[0];

      // 2. Check account table counts
      const accountRes = await client.query(
        `SELECT 
          COUNT(*)::int as total_accounts,
          COUNT(*) FILTER (WHERE provider_id = 'credential')::int as credential_accounts
        FROM account;`,
      );
      const accountRow = accountRes.rows[0];

      console.log(`📊 Users Total: ${userRow.total}`);
      console.log(`📊 Users with password: ${userRow.with_password}`);
      console.log(`📊 Users with null email: ${userRow.null_email}`);
      console.log(`📊 Users with verified email: ${userRow.verified_email}`);
      console.log(`📊 Total accounts: ${accountRow.total_accounts}`);
      console.log(`📊 Credential accounts: ${accountRow.credential_accounts}`);

      if (userRow.null_email > 0) {
        throw new Error(`Found ${userRow.null_email} users with NULL email!`);
      }

      if (userRow.with_password !== accountRow.credential_accounts) {
        throw new Error(
          `Mismatch: ${userRow.with_password} users with password vs ${accountRow.credential_accounts} credential accounts`,
        );
      }

      // 3. Verify seeded users' bcrypt hashes against 'password123'
      const seededUsernames = ["spidy", "dave", "alex"];
      console.log(`🔐 Verifying bcrypt hashes for seeded users (${seededUsernames.join(", ")})...`);

      for (const username of seededUsernames) {
        const checkRes = await client.query(
          `SELECT u.username, a.password 
           FROM users u
           JOIN account a ON a.user_id = u.id AND a.provider_id = 'credential'
           WHERE u.username = $1;`,
          [username],
        );

        if (checkRes.rows.length === 0) {
          throw new Error(`No credential account found for seeded user '${username}'`);
        }

        const hash = checkRes.rows[0].password;
        if (!hash) {
          throw new Error(`Missing password hash in account for '${username}'`);
        }

        const isValid = await compare("password123", hash);
        if (!isValid) {
          throw new Error(
            `Bcrypt verification FAILED for user '${username}' with password 'password123'`,
          );
        }

        console.log(`  ✅ User '${username}': bcrypt hash verified against 'password123'`);
      }

      console.log("🎉 All auth verification checks passed successfully!");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Auth verification failed:", error);
    await pool.end();
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

verifyAuth();

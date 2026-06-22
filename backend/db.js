const { Pool } = require("pg");

// Connection settings come from environment variables so the same code works
// locally and on a host like Render. Two ways to configure it:
//
//   1. DATABASE_URL  — a single connection string. Render's managed Postgres
//      sets this automatically (see render.yaml). When present it is used and
//      SSL is enabled (Render requires SSL).
//
//   2. PGHOST / PGUSER / PGPASSWORD / PGDATABASE / PGPORT — individual vars.
//      If none are set, these fall back to local-development defaults so the
//      app still runs out of the box on a local PostgreSQL.
//
const useConnectionString = Boolean(process.env.DATABASE_URL);

const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        // Render's managed Postgres requires SSL; it uses a cert chain that
        // node doesn't bundle, so disable strict verification.
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST || "localhost",
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "Massalai0675#",
        database: process.env.PGDATABASE || "campusuid",
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      }
);

// Test the connection on startup (does not crash the server if it fails).
pool.connect((err, client, release) => {
  if (err) {
    console.error("DB Error:", err.message);
    return;
  }

  console.log("PostgreSQL Connected");
  release();
});

module.exports = pool;

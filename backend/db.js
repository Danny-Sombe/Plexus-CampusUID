const { Pool } = require("pg");

// PostgreSQL connection settings are hardcoded here (change them for your setup).
// Postgres defaults: user "postgres", port 5432.
const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Massalai0675#",
  database: "campusuid",
  port: 5432
});

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

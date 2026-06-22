const { Pool } = require("pg");

// PostgreSQL connection settings are hardcoded here (change them for your setup).
// Postgres defaults: user "postgres", port 5000.
const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Massalai0675#",
  database: "campusuid",
  // Use the HTTP server port (process.env.PORT) to match server.js default (5000).
  // This makes the DB port follow the server port when not otherwise specified.
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000
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

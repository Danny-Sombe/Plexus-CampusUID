const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Massalai0675#",
  database: "campusuid",
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.error("DB Error:", err);
    return;
  }

  console.log("MySQL Connected");
});

module.exports = db;
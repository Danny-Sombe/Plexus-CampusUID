CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    UNIQUE(student_id)
);

CREATE TABLE financial_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(100),
    amount_paid DECIMAL(10,2),
    payment_date DATE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100),
    studentid VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT
    students.student_id,
    students.first_name,
    students.last_name,
    financial_records.amount_paid,
    financial_records.payment_date
FROM students
JOIN financial_records
    ON students.student_id = financial_records.student_id;
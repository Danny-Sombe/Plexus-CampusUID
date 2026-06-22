const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require("cors");
const os = require("os");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const db = require("./db");

const app = express();

// Log incoming requests for easier debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Enable CORS and JSON parsing before serving static files or handling routes
app.use(cors());
app.use(express.json());

// Serve static files (HTML/CSS/JS) from the frontend folder (one level up)
app.use(express.static(path.join(__dirname, "..", "frontend")));

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
const emailPort = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587;

let transporter;
let emailConfigured = false;

async function setupTransporter() {
    if (emailUser && emailPass) {
        transporter = nodemailer.createTransport({
            host: emailHost,
            port: emailPort,
            secure: false,
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        try {
            await transporter.verify();
            emailConfigured = true;
            console.log("Email transporter verified — ready to send emails.");
            return;
        } catch (err) {
            emailConfigured = false;
            console.error("Email transporter verification failed:", err && err.message ? err.message : err);
            console.error("If you use Gmail, create an App Password (if 2FA is enabled) or configure OAuth2. See: https://support.google.com/mail/?p=BadCredentials");
            console.error("Falling back to a local test account (Ethereal) for development/testing.");
        }
    } else {
        console.warn("EMAIL_USER and EMAIL_PASS are not configured. Falling back to a test SMTP account for development.");
    }

    try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        emailConfigured = true;
        console.log("Using Ethereal test SMTP account — emails will not be delivered to real inboxes.");
        console.log(`Ethereal account: ${testAccount.user} / ${testAccount.pass}`);
    } catch (err) {
        emailConfigured = false;
        console.error("Failed to create test SMTP account:", err && err.message ? err.message : err);
    }
}

setupTransporter().catch(err => console.error("setupTransporter error:", err));


// Collect non-internal IPv4 LAN addresses (used for startup log and /server-info)
function getLanAddresses() {
    const nets = os.networkInterfaces();
    const addresses = [];
    Object.keys(nets).forEach((name) => {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                addresses.push({ name, address: net.address });
            }
        }
    });
    return addresses;
}

// Home Route
app.get("/", (req, res) => {
    res.send("Plexus CampusUID Backend Running");
});

// Server info Route — lets the QR generator auto-fill a phone-reachable host
app.get("/server-info", (req, res) => {
    res.json({
        success: true,
        port: LISTEN_PORT,
        addresses: getLanAddresses()
    });
});

// Sign Up Route
app.post("/signup", async (req, res) => {
    console.log("Signup request received");
    console.log(req.body);

    const { fullname, email, password, studentid } = req.body;

    if (!fullname || !email || !password || !studentid) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    const studentIdInt = parseInt(studentid, 10);
    if (Number.isNaN(studentIdInt)) {
        return res.status(400).json({
            message: "Student ID must be a number"
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Parse fullname into first_name and last_name
        const nameParts = fullname.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        // 1. Insert into users table
        const userSql = `
            INSERT INTO users
            (fullname, studentid, email, password)
            VALUES ($1, $2, $3, $4)
        `;

        db.query(
            userSql,
            [fullname, studentid, email, hashedPassword],
            (err, userResult) => {
                if (err) {
                    return res.status(500).json({
                        message: "User creation failed: " + err.message
                    });
                }

                // 2. Insert into students table using the same student ID
                const studentSql = `
                    INSERT INTO students
                    (student_id, first_name, last_name, email)
                    VALUES ($1, $2, $3, $4)
                `;

                db.query(
                    studentSql,
                    [studentid, firstName, lastName, email],
                    (err, studentResult) => {
                        if (err) {
                            console.error("Student insert error:", err);
                            return res.status(500).json({
                                message: "Failed to create student record: " + err.message
                            });
                        }

                        // 3. Insert into financial_records table with default amount
                        const financialSql = `
                            INSERT INTO financial_records
                            (student_id, amount_paid, payment_date)
                            VALUES ($1, $2, CURRENT_DATE)
                        `;

                        db.query(
                            financialSql,
                            [studentid, 0.00],
                            (err, financialResult) => {
                                if (err) {
                                    console.error("Financial record insert error:", err);
                                    return res.status(500).json({
                                        message: "Failed to create financial record: " + err.message
                                    });
                                }

                                res.status(201).json({
                                    success: true,
                                    message: "Account created successfully"
                                });
                            }
                        );
                    }
                );
            }
        );

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

});

// Get Students Route
app.get("/students", (req, res) => {

    const query = `
    SELECT
        students.student_id,
        students.first_name,
        students.last_name,
        financial_records.amount_paid
    FROM students
    JOIN financial_records
    ON students.student_id = financial_records.student_id
    `;

    db.query(query, (err, result) => {

        if (err) {
            return res.status(500).json({
                message: err.message
            });
        }

        res.json(result.rows);

    });

});

// login route
app.post("/login", (req, res) => {

    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = $1";

    db.query(sql, [email], async (err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const user = result.rows[0];

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }

            res.json({
               success: true,
               message: "Login successful"
            });
    });
});

// Forgot Password Route
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    const sql = "SELECT * FROM users WHERE email = $1";

    db.query(sql, [email], async (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Email not found"
            });
        }

        // Check email is usable BEFORE touching the password, so a failed/
        // unconfigured send never locks the user out of their account.
        if (!emailConfigured || !transporter) {
            return res.status(500).json({
                success: false,
                message: "Email service is not configured. Set EMAIL_USER and EMAIL_PASS in your environment."
            });
        }

        const tempPassword = crypto.randomBytes(5).toString("hex");
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const mailOptions = {
            from: emailUser,
            to: email,
            subject: "CampusUID Password Reset",
            text: `Your temporary password is: ${tempPassword}\nPlease sign in and change it immediately.`
        };

        // Send the email FIRST; only persist the new password if it actually went out.
        transporter.sendMail(mailOptions, (mailErr, info) => {
            if (mailErr) {
                console.error('Reset email send error:', mailErr);

                // Detect common Gmail auth failure and give actionable message
                const isAuthError = mailErr && (mailErr.responseCode === 535 || /Username and Password not accepted|BadCredentials|Invalid login/i.test(mailErr.message));

                const userMessage = isAuthError
                    ? 'Email provider rejected SMTP credentials. If you use Gmail, generate an App Password (if using 2FA) or configure OAuth2. See: https://support.google.com/mail/?p=BadCredentials'
                    : 'Failed to send reset email. Check server logs for details.';

                // Password was NOT changed, so the user can still log in with their existing one.
                return res.status(500).json({
                    success: false,
                    message: userMessage
                });
            }

            // Email sent — log preview URL for test accounts, then persist the temporary password.
            try {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                if (previewUrl) console.log(`Password reset email preview URL: ${previewUrl}`);
            } catch (e) {
                // ignore if not a test account
            }

            const updateSql = "UPDATE users SET password = $1 WHERE email = $2";
            db.query(updateSql, [hashedPassword, email], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({
                        success: false,
                        message: updateErr.message
                    });
                }

                res.json({
                    success: true,
                    message: "Reset email sent. Check your inbox."
                });
            });
        });
    });
});

// Profile Route
app.get("/profile", (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    const sql = "SELECT fullname, email, studentid FROM users WHERE email = $1";

    db.query(sql, [email], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    });
});

// Financial Records Route
app.get("/financial-records", (req, res) => {
    const { studentid } = req.query;

    if (!studentid) {
        return res.status(400).json({
            success: false,
            message: "Student ID is required"
        });
    }

    const sql = `
        SELECT
            financial_records.record_id,
            financial_records.amount_paid,
            financial_records.payment_date
        FROM financial_records
        WHERE financial_records.student_id = $1
        ORDER BY financial_records.payment_date DESC
    `;

    db.query(sql, [studentid], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            records: result.rows || []
        });
    });
});

// Test Route
app.get("/test", (req, res) => {
    res.json({
        message: "API is working"
    });
});

app.get("/student-info", (req, res) => {
    const studentId = parseInt(req.query.studentid, 10);

    if (Number.isNaN(studentId)) {
        return res.status(400).json({
            success: false,
            message: "Student ID is required and must be a number"
        });
    }

    const sql = `
        SELECT
            s.student_id,
            s.first_name,
            s.last_name,
            s.email,
            fr.amount_paid,
            fr.payment_date
        FROM students s
        LEFT JOIN financial_records fr
        ON s.student_id = fr.student_id
        WHERE s.student_id = $1
        ORDER BY fr.payment_date DESC
    `;

    db.query(sql, [String(studentId)], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        const student = {
            student_id: result.rows[0].student_id,
            first_name: result.rows[0].first_name,
            last_name: result.rows[0].last_name,
            email: result.rows[0].email
        };

        const records = result.rows
            .filter(row => row.payment_date !== null)
            .map(row => ({
                amount_paid: row.amount_paid,
                payment_date: row.payment_date
            }));

        res.json({
            success: true,
            student,
            records
        });
    });
});

app.post("/generateQR", async (req, res) => {
    try {
        const data = String(req.body.data || "").trim();

        if (!data) {
            return res.status(400).json({
                success: false,
                message: "Please provide text or a student ID to encode."
            });
        }

        const qr = await QRCode.toDataURL(data, {
            errorCorrectionLevel: "H",
            type: "image/png",
            width: 600,
            margin: 4,
            color: {
                dark: "#000000",
                light: "#FFFFFF"
            }
        });

        res.json({
            success: true,
            qr
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

const LISTEN_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
app.listen(LISTEN_PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${LISTEN_PORT} (listening on 0.0.0.0)`);

    // Log local LAN IP addresses to help mobile testing
    getLanAddresses().forEach(({ name, address }) => {
        console.log(`LAN address (${name}): http://${address}:${LISTEN_PORT}`);
    });
});

# Plexus CampusUID

A student-ID / campus portal web app. Students register, log in, view their
profile and financial records, and get a **QR code** for their student ID that,
when scanned, opens a page showing their information.

This README walks through the project from the very beginning to the finished
app — what was built, in what order, and how to run it yourself.

---

## What the app does

- **Sign up** — a student creates an account (full name, student ID, email, password).
- **Log in** — the student signs in with email + password.
- **Dashboard** — shows the student's profile and financial records.
- **QR code** — generate a QR code for a student ID; scanning it opens a page
  with that student's info (great for an ID card or phone check-in).
- **Forgot password** — sends a reset email over SMTP.

---

## Tech stack

| Layer     | Choice                                                      |
|-----------|-------------------------------------------------------------|
| Backend   | Node.js + Express (a single `server.js`)                    |
| Database  | MySQL (database `campusuid`)                                |
| Frontend  | Plain HTML, CSS, and JavaScript — **no framework, no build step** |
| Passwords | `bcrypt` hashing                                            |
| QR codes  | `qrcode` library                                            |
| Email     | `nodemailer` over SMTP                                      |
| QR scanner| Python companion tool (`opencv-python` + `requests`)        |

The frontend pages are served directly by Express as static files, so there is
nothing to compile or bundle.

---

## How the project was built — step by step

### 1. Project setup
- Initialized a Node.js project (`npm init`) which created `package.json`.
- Installed the dependencies: `express`, `mysql2`, `bcrypt`, `cors`,
  `qrcode`, and `nodemailer`.
- Added a start script: `npm start` runs `node server.js`.

### 2. The database
- Designed the schema in `schema.sql` with three tables:
  - **`users`** — login/auth data: `fullname`, `studentid`, `email`, hashed `password`.
  - **`students`** — profile data: `student_id`, `first_name`, `last_name`, `email`.
  - **`financial_records`** — `student_id`, `amount_paid`, `payment_date`.
- Created the MySQL connection in `db.js` (host, user, password, database, port).

### 3. The backend (`server.js`)
- Built an Express server that:
  - Serves all the static HTML/CSS/JS pages from the project folder.
  - Binds to port `5000` and prints the LAN IP addresses on startup (so a phone
    can reach it for QR testing).
- Added the API routes:
  - `POST /signup` — hashes the password with bcrypt and writes the new student
    into **all three tables** (`users`, `students`, and a starter
    `financial_records` row) so the data stays consistent.
  - `POST /login` — checks the email + bcrypt password and returns success.
  - `POST /forgot-password` — emails a reset link via nodemailer.
  - `GET /profile`, `/financial-records`, `/student-info`, `/students` — read data.
  - `POST /generateQR` — turns a student-ID URL into a QR-code image.
  - `/` and `/test` — simple health checks.

### 4. The frontend pages
Each page is a small HTML file with its own JavaScript:

| Page             | Script        | Purpose                                |
|------------------|---------------|----------------------------------------|
| `index.html`     | `script.js`   | Login                                  |
| `signup.html`    | `signup.js`   | Registration                           |
| `pass.html`      | `pass.js`     | Forgot password                        |
| `dashboard.html` | `dashboard.js`| Profile + financial records            |
| `code.html`      | (inline)      | QR-code generator                      |
| `student.html`   | (inline)      | Landing page shown after scanning a QR |
| `style.css`      | —             | Shared styling for the pages           |

- Styled the pages with `style.css` (shared login/signup/dashboard look,
  including a background image in the `images/` folder).
- Login is kept simple: after a successful login the email is stored in the
  browser's `localStorage`, and its presence means "logged in".

### 5. The QR feature (the highlight)
- `code.html` takes a student ID and builds a URL like
  `http://<host>/student.html?studentid=<id>`, then asks the backend to turn it
  into a QR image.
- Scanning the QR opens `student.html`, which reads the student ID from the URL
  and fetches that student's info from the backend.
- Because phones can't reach `localhost`, `code.html` asks for a
  phone-reachable address (your computer's LAN IP, or an ngrok URL).

---

## Running the project

### Prerequisites
- [Node.js](https://nodejs.org/) installed
- [MySQL](https://www.mysql.com/) installed and running

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
1. Make sure MySQL is running.
2. Create a database named `campusuid`.
3. Run the table definitions from `schema.sql`.
4. Open `db.js` and set your MySQL `user`, `password`, `host`, and `port`.

### 3. (Optional) Set up email for password reset
Set these environment variables before starting the server:
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password      # Gmail requires an "App Password"
# optional: EMAIL_HOST, EMAIL_PORT
```
If these aren't set the app still runs — only the forgot-password feature is disabled.

### 4. Start the server
```bash
npm start
```
The server runs on **http://localhost:5000**. Open that address in your browser,
or use the LAN IP printed in the console to test the QR codes from your phone.

---

## Python QR scanner (companion tool)

`qr_scanner.py` is a standalone Python helper that **scans** the QR codes the
web app generates. It reads a QR code (from your webcam or a saved image),
pulls the student ID out of it, and looks the student up through the running
backend's `/student-info` route — then prints their name, email, and financial
records in the terminal. It does not change the web app; it just calls the same API.

```bash
# 1. install the Python dependencies
pip install -r requirements.txt

# 2. make sure the Node server is running (npm start), then:
python qr_scanner.py                    # scan live with the webcam
python qr_scanner.py --image qr.png     # scan a saved QR image
python qr_scanner.py --api http://192.168.1.10:5000   # point at a LAN host
```

It understands every QR format the app produces: a full
`.../student.html?studentid=123` URL, a `"Student ID: 123"` text, or a bare number.

## Project structure

```
Plexus-CampusUID/
├── server.js          # Express backend (all routes)
├── db.js              # MySQL connection
├── schema.sql         # Database tables
├── qr_scanner.py      # Python QR-scanner companion tool
├── requirements.txt   # Python dependencies
├── package.json       # Dependencies and scripts
├── index.html         # Login page
├── signup.html        # Registration page
├── pass.html          # Forgot-password page
├── dashboard.html     # Profile + financial records
├── code.html          # QR-code generator
├── student.html       # QR scan landing page
├── style.css          # Shared styles
├── script.js          # Login logic
├── signup.js          # Signup logic
├── pass.js            # Forgot-password logic
├── dashboard.js       # Dashboard logic
└── images/            # Background image
```

---

## Notes & possible next steps

- **Authentication is client-side only** — there are no sessions, cookies, or
  tokens yet, so the data routes are open to anyone who knows an email or
  student ID. Adding real server-side sessions/JWT would be a good next step.
- The `users` and `students` tables both store a student ID but are linked only
  by application code (no database foreign key) — keep them in sync when editing.
- Database credentials are stored in `db.js`. For a real deployment, move them
  into environment variables and never commit real passwords.

> Built as a learning project: a full sign-up → login → dashboard → QR-code flow
> using Node.js, Express, and MySQL.

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbPath = process.env.DATABASE_PATH || 'ambers_healthcare.db';

// If running in production with a separate DATABASE_PATH, copy the initial seed database if the destination does not exist yet
if (process.env.DATABASE_PATH && !fs.existsSync(dbPath)) {
  const seedPath = path.join(process.cwd(), 'ambers_healthcare.db');
  if (fs.existsSync(seedPath)) {
    try {
      // Ensure destination directory exists
      const destDir = path.dirname(dbPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(seedPath, dbPath);
      console.log(`Copied seed database from ${seedPath} to ${dbPath}`);
    } catch (err: any) {
      console.error(`Failed to copy seed database to ${dbPath}: ${err.message}. Falling back to local database.`);
      dbPath = 'ambers_healthcare.db';
    }
  }
}

let db: any;
try {
  db = new Database(dbPath);
} catch (err: any) {
  console.error(`Failed to initialize database at ${dbPath}: ${err.message}. Falling back to default 'ambers_healthcare.db'`);
  dbPath = 'ambers_healthcare.db';
  db = new Database(dbPath);
}
console.log(`Database initialized at: ${dbPath}`);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('candidate', 'employer', 'admin')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    parish TEXT NOT NULL,
    role_specialties TEXT NOT NULL, -- JSON array
    experience_summary TEXT,
    resume_url TEXT,
    status TEXT DEFAULT 'active',
    accepted_terms_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS employers (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    parish TEXT NOT NULL,
    website TEXT,
    stripe_customer_id TEXT,
    accepted_agreement_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    parish TEXT NOT NULL,
    role_category TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES employers(id)
  );

  CREATE TABLE IF NOT EXISTS introductions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    introduced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    UNIQUE(job_id, candidate_id),
    FOREIGN KEY (job_id) REFERENCES job_postings(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
  );

  CREATE TABLE IF NOT EXISTS hire_confirmations (
    id TEXT PRIMARY KEY,
    introduction_id TEXT UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (introduction_id) REFERENCES introductions(id)
  );

  CREATE TABLE IF NOT EXISTS placement_invoices (
    id TEXT PRIMARY KEY,
    employer_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    introduction_id TEXT NOT NULL,
    amount_cents INTEGER DEFAULT 450000,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK(status IN ('draft', 'sent', 'due', 'paid', 'void')) DEFAULT 'draft',
    stripe_invoice_id TEXT,
    stripe_payment_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (employer_id) REFERENCES employers(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (job_id) REFERENCES job_postings(id),
    FOREIGN KEY (introduction_id) REFERENCES introductions(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrer_name TEXT NOT NULL,
    referrer_email TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    candidate_email TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'hired_waiting_pay_periods', 'paid_completed', 'rejected')) DEFAULT 'pending',
    employer_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE candidates ADD COLUMN accepted_terms_at DATETIME;");
  console.log("Successfully ran migration: Added accepted_terms_at to candidates");
} catch (e) {}

try {
  db.exec("ALTER TABLE candidates ADD COLUMN contact_preference TEXT;");
  console.log("Successfully ran migration: Added contact_preference to candidates");
} catch (e) {}

try {
  db.exec("ALTER TABLE candidates ADD COLUMN interview_preference TEXT;");
  console.log("Successfully ran migration: Added interview_preference to candidates");
} catch (e) {}

export default db;

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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
    interview_formats TEXT DEFAULT '["Virtual Video Call", "Phone-Only Interview", "Written Questionnaire / Email Interview", "Virtual Video Call (Questions provided 48h in advance)"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES employers(id)
  );

  CREATE TABLE IF NOT EXISTS introductions (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    introduced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    status TEXT DEFAULT 'confirmed_match',
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

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_email TEXT,
    recipient_phone TEXT,
    type TEXT CHECK(type IN ('email', 'sms', 'both')) NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT CHECK(status IN ('sent', 'failed')) DEFAULT 'sent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

try {
  db.exec("ALTER TABLE job_postings ADD COLUMN interview_formats TEXT DEFAULT '[\"Virtual Video Call\", \"Phone-Only Interview\", \"Written Questionnaire / Email Interview\", \"Virtual Video Call (Questions provided 48h in advance)\"]';");
  console.log("Successfully ran migration: Added interview_formats to job_postings");
} catch (e) {}

try {
  db.exec("ALTER TABLE introductions ADD COLUMN status TEXT DEFAULT 'confirmed_match';");
  console.log("Successfully ran migration: Added status to introductions");
} catch (e) {}

// --- Workspace JSON Backup & Restore System ---
const backupPath = path.join(process.cwd(), 'db_backup.json');

export function backupDatabase() {
  try {
    const backupData = {
      users: db.prepare("SELECT * FROM users").all(),
      candidates: db.prepare("SELECT * FROM candidates").all(),
      employers: db.prepare("SELECT * FROM employers").all(),
      job_postings: db.prepare("SELECT * FROM job_postings").all(),
      referrals: db.prepare("SELECT * FROM referrals").all(),
      introductions: db.prepare("SELECT * FROM introductions").all(),
      hire_confirmations: db.prepare("SELECT * FROM hire_confirmations").all(),
      placement_invoices: db.prepare("SELECT * FROM placement_invoices").all(),
      notifications: db.prepare("SELECT * FROM notifications").all()
    };
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log("Database successfully backed up to db_backup.json");
  } catch (err: any) {
    console.error("Failed to back up database:", err.message);
  }
}

export function restoreDatabase() {
  if (!fs.existsSync(backupPath)) {
    console.log("No backup file found at", backupPath);
    return false;
  }
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    
    db.exec("PRAGMA foreign_keys = OFF;");
    
    // Restore users
    if (backupData.users) {
      db.prepare("DELETE FROM users").run();
      const insertUser = db.prepare("INSERT INTO users (id, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)");
      for (const u of backupData.users) {
        insertUser.run(u.id, u.email, u.password, u.role, u.created_at);
      }
    }
    
    // Restore candidates
    if (backupData.candidates) {
      db.prepare("DELETE FROM candidates").run();
      const insertCandidate = db.prepare(`
        INSERT INTO candidates (id, user_id, full_name, phone, parish, role_specialties, experience_summary, resume_url, status, accepted_terms_at, contact_preference, interview_preference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of backupData.candidates) {
        insertCandidate.run(
          c.id, c.user_id, c.full_name, c.phone, c.parish, c.role_specialties,
          c.experience_summary, c.resume_url, c.status, c.accepted_terms_at,
          c.contact_preference, c.interview_preference
        );
      }
    }
    
    // Restore employers
    if (backupData.employers) {
      db.prepare("DELETE FROM employers").run();
      const insertEmployer = db.prepare(`
        INSERT INTO employers (id, user_id, company_name, contact_name, phone, parish, website, stripe_customer_id, accepted_agreement_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const e of backupData.employers) {
        insertEmployer.run(
          e.id, e.user_id, e.company_name, e.contact_name, e.phone, e.parish,
          e.website, e.stripe_customer_id, e.accepted_agreement_at
        );
      }
    }
    
    // Restore job_postings
    if (backupData.job_postings) {
      db.prepare("DELETE FROM job_postings").run();
      const insertJob = db.prepare(`
        INSERT INTO job_postings (id, employer_id, title, description, parish, role_category, status, interview_formats, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const j of backupData.job_postings) {
        const interviewFormats = j.interview_formats || '["Virtual Video Call", "Phone-Only Interview", "Written Questionnaire / Email Interview", "Virtual Video Call (Questions provided 48h in advance)"]';
        insertJob.run(j.id, j.employer_id, j.title, j.description, j.parish, j.role_category, j.status, interviewFormats, j.created_at);
      }
    }
    
    // Restore referrals
    if (backupData.referrals) {
      db.prepare("DELETE FROM referrals").run();
      const insertReferral = db.prepare(`
        INSERT INTO referrals (id, referrer_name, referrer_email, candidate_name, candidate_email, status, employer_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of backupData.referrals) {
        insertReferral.run(r.id, r.referrer_name, r.referrer_email, r.candidate_name, r.candidate_email, r.status, r.employer_notes, r.created_at, r.updated_at);
      }
    }

    // Restore introductions
    if (backupData.introductions) {
      db.prepare("DELETE FROM introductions").run();
      const insertIntro = db.prepare(`
        INSERT INTO introductions (id, job_id, candidate_id, introduced_at, note, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const i of backupData.introductions) {
        insertIntro.run(i.id, i.job_id, i.candidate_id, i.introduced_at, i.note, i.status || 'confirmed_match');
      }
    }

    // Restore hire_confirmations
    if (backupData.hire_confirmations) {
      db.prepare("DELETE FROM hire_confirmations").run();
      const insertHire = db.prepare(`
        INSERT INTO hire_confirmations (id, introduction_id, start_date, confirmed_at)
        VALUES (?, ?, ?, ?)
      `);
      for (const h of backupData.hire_confirmations) {
        insertHire.run(h.id, h.introduction_id, h.start_date, h.confirmed_at);
      }
    }

    // Restore placement_invoices
    if (backupData.placement_invoices) {
      db.prepare("DELETE FROM placement_invoices").run();
      const insertInvoice = db.prepare(`
        INSERT INTO placement_invoices (id, employer_id, candidate_id, job_id, introduction_id, amount_cents, currency, status, stripe_invoice_id, stripe_payment_status, created_at, paid_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of backupData.placement_invoices) {
        insertInvoice.run(p.id, p.employer_id, p.candidate_id, p.job_id, p.introduction_id, p.amount_cents, p.currency, p.status, p.stripe_invoice_id, p.stripe_payment_status, p.created_at, p.paid_at);
      }
    }

    // Restore notifications
    if (backupData.notifications) {
      db.prepare("DELETE FROM notifications").run();
      const insertNotification = db.prepare(`
        INSERT INTO notifications (id, recipient_email, recipient_phone, type, subject, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const n of backupData.notifications) {
        insertNotification.run(n.id, n.recipient_email, n.recipient_phone, n.type, n.subject, n.message, n.status, n.created_at);
      }
    }
    
    db.exec("PRAGMA foreign_keys = ON;");
    console.log("Database successfully restored from db_backup.json");
    return true;
  } catch (err: any) {
    console.error("Failed to restore database:", err.message);
    db.exec("PRAGMA foreign_keys = ON;");
    return false;
  }
}

// Try restoring from backup first
const didRestore = restoreDatabase();

// If database has no job postings after restore attempt, seed the requested Marketing Associate job posting
const jobCount = db.prepare("SELECT COUNT(*) as count FROM job_postings").get().count;
if (jobCount === 0) {
  try {
    const employerEmail = "contact@ambershealthcare.com";
    let employerUser = db.prepare("SELECT * FROM users WHERE email = ?").get(employerEmail);
    
    // Create employer user if it doesn't exist
    if (!employerUser) {
      const hashedPassword = bcrypt.hashSync("employer123", 10);
      const userId = uuidv4();
      db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(userId, employerEmail, hashedPassword, "employer");
      employerUser = { id: userId, email: employerEmail, role: "employer" };
    }
    
    // Create employer profile if it doesn't exist
    let employerProfile = db.prepare("SELECT * FROM employers WHERE user_id = ?").get(employerUser.id);
    if (!employerProfile) {
      const profileId = uuidv4();
      db.prepare(`
        INSERT INTO employers (id, user_id, company_name, contact_name, phone, parish, website, accepted_agreement_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        profileId,
        employerUser.id,
        "Amber's Healthcare Services",
        "Amber Samantha Yaghi",
        "225-555-0199",
        "East Baton Rouge",
        "https://ambershealthcare.com"
      );
      employerProfile = { id: profileId };
    }
    
    // Insert Marketing Associate job posting
    const jobId = uuidv4();
    db.prepare(`
      INSERT INTO job_postings (id, employer_id, title, description, parish, role_category, status)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `).run(
      jobId,
      employerProfile.id,
      "Marketing Associate",
      "We are seeking a creative, professional, and compassionate Marketing Associate to join Amber's Healthcare Services in East Baton Rouge. The candidate will manage digital marketing campaigns, handle referral partner outreach, and coordinate healthcare educational activities. Prior experience in professional services or healthcare marketing is a plus.",
      "East Baton Rouge",
      "Marketing Associate"
    );
    
    console.log("Successfully seeded Marketing Associate job posting for Amber's Healthcare Services.");
    
    // Save to backup file
    backupDatabase();
  } catch (err: any) {
    console.error("Failed to seed initial Marketing Associate job:", err.message);
  }
}

export default db;

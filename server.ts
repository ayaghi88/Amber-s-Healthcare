/**
 * CHANGES COMMITTED:
 * - Added `/api/admin/employers` and `/api/admin/jobs` admin-only secure REST API endpoints.
 * - Joined candidates and employers tables with the users table to expose user emails securely.
 * - Created database-backed backend services for admin monitoring.
 */
import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db, { backupDatabase } from "./db.ts";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";

// Simple persistent logging for debugging
function logDebug(message: string) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_debug.log"), line);
  } catch (err) {
    console.error("Failed to write to server_debug.log", err);
  }
  console.log(message);
}

// Helper to dispatch email/SMS notifications and save them to SQLite table
function dispatchNotification(recipientEmail: string | null, recipientPhone: string | null, type: 'email' | 'sms' | 'both', subject: string | null, message: string) {
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO notifications (id, recipient_email, recipient_phone, type, subject, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sent')
    `).run(id, recipientEmail, recipientPhone, type, subject, message);
    logDebug(`[NOTIFICATION] SENT | Type: ${type} | To Email: ${recipientEmail || 'N/A'} | To Phone: ${recipientPhone || 'N/A'} | Subject: ${subject || 'N/A'} | Message: ${message.replace(/\n/g, ' ')}`);
    backupDatabase();
  } catch (err: any) {
    logDebug(`[NOTIFICATION] FAILED to save notification: ${err.message}`);
  }
}

// PayPal Access Token Generator
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error("PayPal Client ID or Client Secret is not configured.");
  }

  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get PayPal token: ${text}`);
  }

  const data = await response.json() as any;
  return data.access_token;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);

  app.use(express.json());
  app.use(cookieParser());

  // Auto-backup Database on any successful state modification (POST, PUT, PATCH, DELETE)
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            backupDatabase();
          } catch (err: any) {
            console.error("Auto-backup failed:", err.message);
          }
        }
      });
    }
    next();
  });

  // Global request logging for debugging
  app.use((req, res, next) => {
    logDebug(`${req.method} ${req.url}`);
    next();
  });

  // Seed Admin
  const adminEmail = "amber@ambershealthcare.com";
  const existingAdmin = db.prepare("SELECT * FROM users WHERE email = ?").get(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(uuidv4(), adminEmail, hashedPassword, "admin");
    logDebug("Admin user seeded: amber@ambershealthcare.com / admin123");
  }

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err: any) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res, next) => {
    const { email, password, role } = req.body;
    logDebug(`Register attempt: ${email} as ${role}`);
    if (!['candidate', 'employer'].includes(role)) {
      logDebug(`Register failed: Invalid role - ${role}`);
      return res.status(400).json({ error: "Invalid role" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(userId, email, hashedPassword, role);
      
      const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      logDebug(`Register success: ${email}`);
      res.json({ token, user: { id: userId, email, role } });
    } catch (err: any) {
      logDebug(`Register error: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body;
    logDebug(`Login attempt: ${email}`);
    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        logDebug(`Login failed: User not found - ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logDebug(`Login failed: Password mismatch - ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, { httpOnly: true, secure: true, sameSite: 'none' });
      logDebug(`Login success: ${email} (${user.role})`);
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err: any) {
      logDebug(`Login error: ${err.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res, next) => {
    const { email, newPassword } = req.body;
    logDebug(`Reset password attempt: ${email}`);
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: "Please enter a valid new password (at least 6 characters)." });
    }

    try {
      const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (!user) {
        logDebug(`Reset password failed: User not found - ${email}`);
        return res.status(404).json({ error: "No account found with this email address." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, email);
      logDebug(`Reset password success: ${email}`);
      res.json({ success: true, message: "Your password has been successfully reset. You can now log in with your new password!" });
    } catch (err: any) {
      logDebug(`Reset password error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/me", authenticate, (req: any, res) => {
    const user: any = db.prepare("SELECT id, email, role FROM users WHERE id = ?").get(req.user.id);
    res.json({ user });
  });

  app.get("/api/candidates/me", authenticate, (req: any, res) => {
    const candidate = db.prepare("SELECT * FROM candidates WHERE user_id = ?").get(req.user.id);
    res.json(candidate || null);
  });

  app.get("/api/employers/me", authenticate, (req: any, res) => {
    const employer = db.prepare("SELECT * FROM employers WHERE user_id = ?").get(req.user.id);
    res.json(employer || null);
  });

  app.get("/api/employers/jobs", authenticate, (req: any, res) => {
    const employer: any = db.prepare("SELECT id FROM employers WHERE user_id = ?").get(req.user.id);
    if (!employer) return res.json([]);
    const jobs = db.prepare("SELECT * FROM job_postings WHERE employer_id = ?").all(employer.id);
    res.json(jobs);
  });

  app.get("/api/employers/introductions", authenticate, (req: any, res) => {
    const employer: any = db.prepare("SELECT id FROM employers WHERE user_id = ?").get(req.user.id);
    if (!employer) return res.json([]);
    const intros = db.prepare(`
      SELECT i.*, c.full_name as candidate_name, c.experience_summary, c.contact_preference, c.interview_preference, j.title as job_title, h.id as hire_id
      FROM introductions i
      JOIN candidates c ON i.candidate_id = c.id
      JOIN job_postings j ON i.job_id = j.id
      LEFT JOIN hire_confirmations h ON i.id = h.introduction_id
      WHERE j.employer_id = ?
    `).all(employer.id);
    res.json(intros);
  });

  app.get("/api/employers/invoices", authenticate, (req: any, res) => {
    const employer: any = db.prepare("SELECT id FROM employers WHERE user_id = ?").get(req.user.id);
    if (!employer) return res.json([]);
    const invoices = db.prepare(`
      SELECT p.*, c.full_name as candidate_name, j.title as job_title
      FROM placement_invoices p
      JOIN candidates c ON p.candidate_id = c.id
      JOIN job_postings j ON p.job_id = j.id
      WHERE p.employer_id = ?
    `).all(employer.id);
    res.json(invoices);
  });

  // --- Admin Data ---
  app.get("/api/admin/stats", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const totalHires = db.prepare("SELECT COUNT(*) as count FROM hire_confirmations").get() as any;
    const activeJobs = db.prepare("SELECT COUNT(*) as count FROM job_postings WHERE status = 'open'").get() as any;
    const totalRevenue = db.prepare("SELECT SUM(amount_cents) as total FROM placement_invoices WHERE status = 'paid'").get() as any;
    res.json({
      totalHires: totalHires.count,
      activeJobs: activeJobs.count,
      totalRevenue: totalRevenue.total || 0
    });
  });

  // Admin Candidates API: Fetches candidates joined with users table to retrieve their email address
  app.get("/api/admin/candidates", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const candidates = db.prepare(`
        SELECT c.*, u.email 
        FROM candidates c 
        JOIN users u ON c.user_id = u.id
      `).all();
      res.json(candidates);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Employers API: Fetches all registered employers with their emails from users table
  app.get("/api/admin/employers", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const employers = db.prepare(`
        SELECT e.*, u.email 
        FROM employers e 
        JOIN users u ON e.user_id = u.id
      `).all();
      res.json(employers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Jobs API: Fetches all jobs with employer company names, regardless of status
  app.get("/api/admin/jobs", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const jobs = db.prepare(`
        SELECT j.*, e.company_name 
        FROM job_postings j 
        JOIN employers e ON j.employer_id = e.id
      `).all();
      res.json(jobs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Notifications API: Fetches all outbound notification dispatch logs
  app.get("/api/admin/notifications", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const notifications = db.prepare("SELECT * FROM notifications ORDER BY created_at DESC").all();
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Notifications API: Fetches notifications received by the logged in candidate or employer
  app.get("/api/notifications", authenticate, (req: any, res) => {
    try {
      const email = req.user.email;
      const notifications = db.prepare("SELECT * FROM notifications WHERE recipient_email = ? ORDER BY created_at DESC").all(email);
      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/candidates/:id", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const candidate = db.prepare("SELECT * FROM candidates WHERE id = ?").get(req.params.id);
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json(candidate);
  });

  app.get("/api/jobs/:id/matches", authenticate, (req: any, res) => {
    // Both employers (for their own jobs) and admins can see matches
    const job: any = db.prepare("SELECT * FROM job_postings WHERE id = ?").get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Simple matching: candidate has the job's role_category in their specialties
    // role_specialties is stored as a JSON string array
    const candidates = db.prepare("SELECT * FROM candidates WHERE status = 'active'").all() as any[];
    
    const matches = candidates.filter(c => {
      try {
        const specialties = JSON.parse(c.role_specialties);
        return Array.isArray(specialties) && specialties.includes(job.role_category);
      } catch (e) {
        return false;
      }
    });

    res.json(matches);
  });

  // --- Profile Routes ---
  app.post("/api/candidates/profile", authenticate, (req: any, res) => {
    if (req.user.role !== 'candidate') return res.status(403).json({ error: "Forbidden" });
    const { full_name, phone, parish, role_specialties, experience_summary, contact_preference, interview_preference } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO candidates (id, user_id, full_name, phone, parish, role_specialties, experience_summary, contact_preference, interview_preference)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          full_name=excluded.full_name,
          phone=excluded.phone,
          parish=excluded.parish,
          role_specialties=excluded.role_specialties,
          experience_summary=excluded.experience_summary,
          contact_preference=excluded.contact_preference,
          interview_preference=excluded.interview_preference
      `).run(id, req.user.id, full_name, phone, parish, JSON.stringify(role_specialties), experience_summary, contact_preference, interview_preference);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/employers/profile", authenticate, (req: any, res) => {
    if (req.user.role !== 'employer') return res.status(403).json({ error: "Forbidden" });
    const { company_name, contact_name, phone, parish, website } = req.body;
    
    if (!website || typeof website !== 'string' || !website.trim()) {
      return res.status(400).json({ error: "Website is required to verify legit employer accounts." });
    }
    const trimmedWebsite = website.trim();
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmedWebsite)) {
      return res.status(400).json({ error: "Please enter a valid website URL starting with http:// or https://" });
    }

    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO employers (id, user_id, company_name, contact_name, phone, parish, website)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          company_name=excluded.company_name,
          contact_name=excluded.contact_name,
          phone=excluded.phone,
          parish=excluded.parish,
          website=excluded.website
      `).run(id, req.user.id, company_name, contact_name, phone, parish, trimmedWebsite);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/employers/accept-agreement", authenticate, (req: any, res) => {
    if (req.user.role !== 'employer') return res.status(403).json({ error: "Forbidden" });
    
    // Check if employer record exists
    const existing = db.prepare("SELECT * FROM employers WHERE user_id = ?").get(req.user.id);
    if (existing) {
      db.prepare("UPDATE employers SET accepted_agreement_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(req.user.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO employers (id, user_id, company_name, contact_name, phone, parish, website, accepted_agreement_at)
        VALUES (?, ?, 'Pending Setup', 'Pending Setup', '', 'East Baton Rouge', '', CURRENT_TIMESTAMP)
      `).run(id, req.user.id);
    }
    res.json({ success: true });
  });

  app.post("/api/candidates/accept-terms", authenticate, (req: any, res) => {
    if (req.user.role !== 'candidate') return res.status(403).json({ error: "Forbidden" });
    
    // Check if candidate record exists
    const existing = db.prepare("SELECT * FROM candidates WHERE user_id = ?").get(req.user.id);
    if (existing) {
      db.prepare("UPDATE candidates SET accepted_terms_at = CURRENT_TIMESTAMP WHERE user_id = ?").run(req.user.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO candidates (id, user_id, full_name, phone, parish, role_specialties, experience_summary, accepted_terms_at)
        VALUES (?, ?, 'Pending Setup', '', 'East Baton Rouge', '[]', '', CURRENT_TIMESTAMP)
      `).run(id, req.user.id);
    }
    res.json({ success: true });
  });

  // --- Payment Config & Integrations ---
  app.get("/api/config", (req, res) => {
    res.json({
      paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
      paypalBusinessEmail: process.env.PAYPAL_BUSINESS_EMAIL || null,
      isPayPalConfigured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
    });
  });

  app.post("/api/paypal/create-order", authenticate, async (req: any, res) => {
    const { invoiceId } = req.body;
    try {
      const invoice: any = db.prepare("SELECT * FROM placement_invoices WHERE id = ?").get(invoiceId);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      const accessToken = await getPayPalAccessToken();
      const mode = process.env.PAYPAL_MODE || "sandbox";
      const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

      const response = await fetch(`${base}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            reference_id: invoiceId,
            amount: {
              currency_code: "USD",
              value: (invoice.amount_cents / 100).toFixed(2)
            },
            description: `Placement fee invoice ${invoiceId}`
          }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(400).json({ error: `PayPal Order Creation failed: ${errText}` });
      }

      const order = await response.json() as any;
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/paypal/capture-order", authenticate, async (req: any, res) => {
    const { orderID, invoiceId } = req.body;
    try {
      const accessToken = await getPayPalAccessToken();
      const mode = process.env.PAYPAL_MODE || "sandbox";
      const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

      const response = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(400).json({ error: `PayPal Order Capture failed: ${errText}` });
      }

      const captureData = await response.json() as any;
      
      if (captureData.status === "COMPLETED") {
        db.prepare(`
          UPDATE placement_invoices 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP, stripe_invoice_id = ?, stripe_payment_status = 'paid'
          WHERE id = ?
        `).run(`paypal_${orderID}`, invoiceId);
      }

      res.json(captureData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/invoices/:id/simulate-pay", authenticate, (req: any, res) => {
    const { id } = req.params;
    try {
      db.prepare(`
        UPDATE placement_invoices 
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP, stripe_invoice_id = ?, stripe_payment_status = 'paid'
        WHERE id = ?
      `).run(`sim_${uuidv4().substring(0, 8)}`, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Job Routes ---
  app.post("/api/jobs", authenticate, (req: any, res) => {
    if (req.user.role !== 'employer') return res.status(403).json({ error: "Forbidden" });
    const employer: any = db.prepare("SELECT id, accepted_agreement_at FROM employers WHERE user_id = ?").get(req.user.id);
    if (!employer || !employer.accepted_agreement_at) return res.status(403).json({ error: "Agreement not accepted" });

    const { title, description, parish, role_category } = req.body;
    const id = uuidv4();
    db.prepare("INSERT INTO job_postings (id, employer_id, title, description, parish, role_category) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, employer.id, title, description, parish, role_category
    );
    res.json({ id });
  });

  app.get("/api/jobs", (req, res) => {
    const jobs = db.prepare("SELECT j.*, e.company_name FROM job_postings j JOIN employers e ON j.employer_id = e.id WHERE j.status = 'open'").all();
    res.json(jobs);
  });

  app.post("/api/jobs/:id/interest", authenticate, (req: any, res) => {
    if (req.user.role !== 'candidate') {
      return res.status(403).json({ error: "Only candidates can express interest in jobs." });
    }
    const candidate = db.prepare("SELECT * FROM candidates WHERE user_id = ?").get(req.user.id) as any;
    if (!candidate) {
      return res.status(400).json({ error: "Please complete your Candidate Profile first before applying." });
    }
    
    const { note, phone, contact_preference, interview_preference } = req.body;
    const jobId = req.params.id;
    const id = uuidv4();
    try {
      // If candidate updates or confirms their details, let's update their profile
      if (phone || contact_preference || interview_preference) {
        db.prepare(`
          UPDATE candidates
          SET 
            phone = COALESCE(?, phone),
            contact_preference = COALESCE(?, contact_preference),
            interview_preference = COALESCE(?, interview_preference)
          WHERE id = ?
        `).run(phone || null, contact_preference || null, interview_preference || null, candidate.id);
      }

      const appNote = note && note.trim() ? note.trim() : 'Candidate expressed interest directly via the job board.';

      db.prepare(`
        INSERT INTO introductions (id, job_id, candidate_id, note)
        VALUES (?, ?, ?, ?)
      `).run(id, jobId, candidate.id, appNote);

      // Send match notifications when candidate applies directly
      try {
        const job = db.prepare(`
          SELECT j.*, e.company_name, e.contact_name, u.email as employer_email, e.phone as employer_phone 
          FROM job_postings j 
          JOIN employers e ON j.employer_id = e.id 
          JOIN users u ON e.user_id = u.id 
          WHERE j.id = ?
        `).get(jobId) as any;

        const candUser = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id) as any;

        if (job) {
          // 1. Notify Employer via Email
          const empSubject = `New Applicant for ${job.title}: ${candidate.full_name}`;
          const empMsg = `Hello ${job.contact_name},\n\nA local candidate, ${candidate.full_name}, has expressed direct interest in your job posting: **${job.title}**.\n\nCover Note: "${appNote}"\n\nPlease log in to Amber's Healthcare to review their complete candidate profile and schedule an interview!`;
          dispatchNotification(job.employer_email, job.employer_phone, 'email', empSubject, empMsg);

          // 2. Notify Admin via Email
          const adminUsers = db.prepare("SELECT email FROM users WHERE role = 'admin'").all() as any[];
          for (const admin of adminUsers) {
            const adminSubject = `Candidate Direct Application: ${candidate.full_name} applied to ${job.title}`;
            const adminMsg = `Admin Alert:\nCandidate **${candidate.full_name}** has applied directly to job posting **${job.title}** at **${job.company_name}**.\n\nCover Note: "${appNote}"`;
            dispatchNotification(admin.email, null, 'email', adminSubject, adminMsg);
          }
        }
      } catch (notifyErr: any) {
        logDebug(`Error sending application notifications: ${notifyErr.message}`);
      }

      res.json({ success: true, message: "Interest expressed successfully!" });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.json({ success: true, message: "You have already expressed interest in this job." });
      }
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/candidates/applications", authenticate, (req: any, res) => {
    if (req.user.role !== 'candidate') return res.status(403).json({ error: "Forbidden" });
    const candidate = db.prepare("SELECT id FROM candidates WHERE user_id = ?").get(req.user.id) as any;
    if (!candidate) return res.json([]);
    const applications = db.prepare("SELECT job_id FROM introductions WHERE candidate_id = ?").all(candidate.id) as any[];
    res.json(applications.map(app => app.job_id));
  });

  // --- Referral Routes ---
  app.post("/api/referrals", (req, res) => {
    const { referrer_name, referrer_email, candidate_name, candidate_email } = req.body;
    if (!referrer_name || !referrer_email || !candidate_name || !candidate_email) {
      return res.status(400).json({ error: "All fields are required (your name & email, and the candidate's name & email)." });
    }
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO referrals (id, referrer_name, referrer_email, candidate_name, candidate_email, status, employer_notes)
        VALUES (?, ?, ?, ?, ?, 'pending', '')
      `).run(id, referrer_name.trim(), referrer_email.trim(), candidate_name.trim(), candidate_email.trim());
      res.json({ success: true, message: "Referral submitted successfully! Thank you for referring healthcare talent to our Baton Rouge community." });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/referrals", authenticate, (req: any, res) => {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const referrals = db.prepare("SELECT * FROM referrals ORDER BY created_at DESC").all();
      res.json(referrals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/referrals/:id/status", authenticate, (req: any, res) => {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { status, employer_notes } = req.body;
    const allowedStatuses = ['pending', 'hired_waiting_pay_periods', 'paid_completed', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid referral status." });
    }
    try {
      db.prepare(`
        UPDATE referrals
        SET status = ?, employer_notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, employer_notes || "", req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Admin Routes ---
  app.post("/api/introductions", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const { job_id, candidate_id, note } = req.body;
    if (!job_id || !candidate_id) {
      return res.status(400).json({ error: "Please select both a job posting and a candidate." });
    }
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO introductions (id, job_id, candidate_id, note) VALUES (?, ?, ?, ?)").run(id, job_id, candidate_id, note);
      
      // Send match notifications to both candidate and employer
      try {
        const candidate = db.prepare(`
          SELECT c.*, u.email as candidate_email 
          FROM candidates c 
          JOIN users u ON c.user_id = u.id 
          WHERE c.id = ?
        `).get(candidate_id) as any;

        const job = db.prepare(`
          SELECT j.*, e.company_name, e.contact_name, u.email as employer_email, e.phone as employer_phone 
          FROM job_postings j 
          JOIN employers e ON j.employer_id = e.id 
          JOIN users u ON e.user_id = u.id 
          WHERE j.id = ?
        `).get(job_id) as any;

        if (candidate && job) {
          const formattedNote = note && note.trim() ? note.trim() : 'Our placement team identified you as a great fit!';
          
          // 1. Notify Candidate via Email and SMS
          const candEmailSubject = `Matched! You've been introduced to ${job.company_name} - ${job.title}`;
          const candEmailMsg = `Hi ${candidate.full_name},\n\nWe have exciting news! You have been matched and introduced to the position of ${job.title} at ${job.company_name} in ${job.parish} Parish.\n\nMatching Note: "${formattedNote}"\n\nPlease log in to your dashboard to confirm your interest and schedule next steps!`;
          dispatchNotification(candidate.candidate_email, candidate.phone, 'both', candEmailSubject, candEmailMsg);

          // 2. Notify Employer via Email
          const empEmailSubject = `Qualified Match: ${candidate.full_name} introduced for ${job.title}`;
          const empEmailMsg = `Hello ${job.contact_name},\n\nWe have found a qualified local match for your position of ${job.title}!\n\nCandidate Name: ${candidate.full_name}\nParish: ${candidate.parish}\nPreferred Contact: ${candidate.contact_preference || 'Email'}\n\nMatching Note: "${formattedNote}"\n\nPlease log in to your employer dashboard to review their specialties and coordinate an interview!`;
          dispatchNotification(job.employer_email, job.employer_phone, 'email', empEmailSubject, empEmailMsg);
        }
      } catch (notifyErr: any) {
        logDebug(`Error sending match notifications: ${notifyErr.message}`);
      }

      res.json({ id });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "This candidate has already been matched/introduced to this job posting." });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // --- Hire & Invoice ---
  app.post("/api/introductions/:id/hire-confirm", authenticate, async (req: any, res) => {
    if (req.user.role !== 'employer') return res.status(403).json({ error: "Forbidden" });
    const { start_date } = req.body;
    const introId = req.params.id;

    const intro: any = db.prepare(`
      SELECT i.*, j.employer_id, e.user_id as employer_user_id, e.company_name, e.contact_name, u.email as employer_email, c.full_name as candidate_name, c.id as candidate_id
      FROM introductions i
      JOIN job_postings j ON i.job_id = j.id
      JOIN employers e ON j.employer_id = e.id
      JOIN users u ON e.user_id = u.id
      JOIN candidates c ON i.candidate_id = c.id
      WHERE i.id = ?
    `).get(introId);

    if (!intro || intro.employer_user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    try {
      const hireId = uuidv4();
      db.prepare("INSERT INTO hire_confirmations (id, introduction_id, start_date) VALUES (?, ?, ?)").run(hireId, introId, start_date);

      const invoiceId = uuidv4();
      
      db.prepare(`
        INSERT INTO placement_invoices (id, employer_id, candidate_id, job_id, introduction_id, stripe_invoice_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'sent')
      `).run(invoiceId, intro.employer_id, intro.candidate_id, intro.job_id, introId, `paypal_draft_${invoiceId}`);

      res.json({ success: true, invoiceId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

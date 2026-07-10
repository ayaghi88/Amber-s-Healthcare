import nodemailer from "nodemailer";
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

function getLevenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function findUserByEmail(email: string) {
  const norm = (email || "").trim().toLowerCase();
  if (!norm) return null;
  
  // Try exact match first
  const users = db.prepare("SELECT * FROM users").all() as any[];
  const exact = users.find(u => (u.email || "").toLowerCase().trim() === norm);
  if (exact) return exact;

  // Try fuzzy match for typing mistakes (Levenshtein distance <= 2)
  let bestMatch: any = null;
  let bestDistance = Infinity;
  for (const u of users) {
    const uEmail = (u.email || "").toLowerCase().trim();
    if (!uEmail) continue;
    const distance = getLevenshteinDistance(norm, uEmail);
    if (distance <= 2 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = u;
    }
  }

  if (bestMatch) {
    logDebug(`[FUZZY MATCH] Resolved input "${email}" to registered user "${bestMatch.email}" (Distance: ${bestDistance})`);
    return bestMatch;
  }

  return null;
}

// Email transport using nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper to dispatch email/SMS notifications and save them to SQLite table
function dispatchNotification(recipientEmail: string | null, recipientPhone: string | null, type: 'email' | 'sms' | 'both', subject: string | null, message: string) {
  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO notifications (id, recipient_email, recipient_phone, type, subject, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'sent')
    `).run(id, recipientEmail, recipientPhone, type, subject, message);
    logDebug(`[NOTIFICATION] LOGGED | Type: ${type} | To Email: ${recipientEmail || 'N/A'} | To Phone: ${recipientPhone || 'N/A'}`);
    backupDatabase();
    
    // Actually send email if required
    if ((type === 'email' || type === 'both') && recipientEmail) {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        transporter.sendMail({
          from: '"Ambers Healthcare" <contact@ambershealthcare.com>',
          to: recipientEmail,
          subject: subject || "Notification from Amber's Healthcare",
          text: message
        }).then(info => {
          logDebug(`[EMAIL] Successfully sent to ${recipientEmail}: ${info.messageId}`);
        }).catch(err => {
          logDebug(`[EMAIL] Failed to send to ${recipientEmail}: ${err.message}`);
        });
      } else {
        logDebug(`[EMAIL] SMTP credentials not fully configured. Email was logged but not sent over SMTP.`);
      }
    }
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
    const normalizedEmail = (email || "").trim().toLowerCase();
    logDebug(`Register attempt: ${normalizedEmail} as ${role}`);
    if (!['candidate', 'employer'].includes(role)) {
      logDebug(`Register rejected: Invalid role - ${role}`);
      return res.status(400).json({ error: "Invalid role" });
    }

    try {
      const existing = db.prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = ?").get(normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: "An account with this email address already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();
      db.prepare("INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)").run(userId, normalizedEmail, hashedPassword, role);
      
      const token = jwt.sign({ id: userId, email: normalizedEmail, role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: 'lax' 
      });
      logDebug(`Register success: ${normalizedEmail}`);
      res.json({ token, user: { id: userId, email: normalizedEmail, role } });
    } catch (err: any) {
      logDebug(`Register err: ${err.message}`);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body;
    logDebug(`Login attempt: ${email}`);
    try {
      const user = findUserByEmail(email);
      if (!user) {
        logDebug(`Login rejected: User not found - ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        logDebug(`Login rejected: Password mismatch - ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: 'lax' 
      });
      logDebug(`Login success: ${email} (resolved to: ${user.email}, role: ${user.role})`);
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (err: any) {
      logDebug(`Login err: ${err.message}`);
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
      const user = findUserByEmail(email);
      if (!user) {
        logDebug(`Reset password rejected: User not found - ${email}`);
        return res.status(404).json({ error: "No account found with this email address." });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
      logDebug(`Reset password success: ${email} (resolved to: ${user.email})`);
      res.json({ success: true, message: "Your password has been successfully reset. You can now log in with your new password!" });
    } catch (err: any) {
      logDebug(`Reset password err: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  // Secure endpoint to let any user update their login credentials (email, password)
  app.post("/api/auth/update-account", authenticate, async (req: any, res) => {
    const { email, currentPassword, newPassword } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      // Check if email is already taken by another user
      if (email.toLowerCase().trim() !== user.email.toLowerCase()) {
        const emailTaken = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? AND id != ?").get(email.toLowerCase().trim(), req.user.id);
        if (emailTaken) {
          return res.status(400).json({ error: "This email address is already registered to another account." });
        }
      }

      // If they want to change password, verify current password first
      let hashedPassword = user.password;
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "Current password is required to set a new password." });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: "Incorrect current password." });
        }
        hashedPassword = await bcrypt.hash(newPassword, 10);
      }

      // Update users table
      db.prepare(`
        UPDATE users
        SET email = ?, password = ?
        WHERE id = ?
      `).run(email.toLowerCase().trim(), hashedPassword, req.user.id);

      // Back up database immediately to persist the change
      backupDatabase();

      res.json({ success: true, message: "Account login details updated successfully!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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
      WHERE j.employer_id = ? AND i.status = 'confirmed_match'
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

  // Admin Potential Matches API: Fetches all unapproved applications (potential_matches)
  app.get("/api/admin/potential-matches", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    try {
      const potentials = db.prepare(`
        SELECT i.*, j.title as job_title, j.parish as job_parish, e.company_name, c.full_name as candidate_name, c.parish as candidate_parish
        FROM introductions i
        JOIN job_postings j ON i.job_id = j.id
        JOIN employers e ON j.employer_id = e.id
        JOIN candidates c ON i.candidate_id = c.id
        WHERE i.status = 'potential_match'
        ORDER BY i.introduced_at DESC
      `).all();
      res.json(potentials);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin endpoint to CONFIRM a potential match and send confirmed notifications to both parties
  app.post("/api/introductions/:id/confirm", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const introId = req.params.id;
    try {
      db.prepare(`
        UPDATE introductions
        SET status = 'introduced'
        WHERE id = ?
      `).run(introId);

      const intro = db.prepare(`
        SELECT i.*, j.title as job_title, j.parish as job_parish, e.company_name, e.contact_name, eu.email as employer_email, e.phone as employer_phone, c.full_name as candidate_name, cu.email as candidate_email, c.phone as candidate_phone, c.contact_preference, c.interview_preference
        FROM introductions i
        JOIN job_postings j ON i.job_id = j.id
        JOIN employers e ON j.employer_id = e.id
        JOIN users eu ON e.user_id = eu.id
        JOIN candidates c ON i.candidate_id = c.id
        JOIN users cu ON c.user_id = cu.id
        WHERE i.id = ?
      `).get(introId) as any;

      if (intro) {
        const formattedNote = intro.note && intro.note.trim() ? intro.note.trim() : 'Our placement team reviewed and confirmed you are a perfect fit!';

        // 1. Notify Candidate via Email and SMS
        const candEmailSubject = `Potential Match Found! We've introduced you for ${intro.job_title}`;
        const candEmailMsg = `Hi ${intro.candidate_name},\n\nWe have exciting news! A potential match has been identified and you have been introduced to the position of **${intro.job_title}** with **${intro.company_name}** in **${intro.job_parish} Parish**!\n\nDetails:\n- Interview Preference: ${intro.interview_preference || 'Standard Formats'}\n- Matching Note: "${formattedNote}"\n\nPlease log in to your Candidate Dashboard to review details. The employer will review your profile to schedule an interview!\n\nBest regards,\nAmber's Healthcare Team`;
        dispatchNotification(intro.candidate_email, intro.candidate_phone, 'both', candEmailSubject, candEmailMsg);

        // 2. Notify Employer via Email
        const empEmailSubject = `Potential Match Found: ${intro.candidate_name} introduced for ${intro.job_title}`;
        const empEmailMsg = `Hello ${intro.contact_name},\n\nOur placement team has identified a potential match for your job opening: **${intro.job_title}**!\n\nCandidate details:\n- Name: ${intro.candidate_name}\n- Parish: ${intro.candidate_parish || intro.job_parish}\n- Contact Preference: ${intro.contact_preference || 'Email'}\n- Pre-selected Interview format preference: ${intro.interview_preference || 'Standard Formats'}\n- Cover Note: "${formattedNote}"\n\nPlease log in to your Employer Dashboard under 'Candidate Introductions' to review their profile and either Accept, Pend, or Deny an interview!\n\nThank you,\nAmber's Healthcare Team`;
        dispatchNotification(intro.employer_email, intro.employer_phone, 'email', empEmailSubject, empEmailMsg);
      }

      // Back up database immediately to persist status change
      backupDatabase();

      res.json({ success: true, message: "Match successfully confirmed and notifications sent!" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin endpoint to REJECT/DECLINE a potential match
  app.post("/api/introductions/:id/reject", authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    const introId = req.params.id;
    try {
      db.prepare(`
        UPDATE introductions
        SET status = 'declined'
        WHERE id = ?
      `).run(introId);

      // Back up database immediately to persist status change
      backupDatabase();

      res.json({ success: true, message: "Match declined successfully." });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Employer/Admin endpoint to update introduction / interview status and trigger notifications
  app.post("/api/introductions/:id/status", authenticate, (req: any, res) => {
    const introId = req.params.id;
    const { status } = req.body;
    const allowedStatuses = ['introduced', 'interview_accepted', 'interview_pending', 'interview_declined', 'confirmed_match', 'declined'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid introduction status." });
    }

    try {
      // If user is employer, verify they own the job posting for this introduction
      if (req.user.role === 'employer') {
        const employer = db.prepare("SELECT id FROM employers WHERE user_id = ?").get(req.user.id) as any;
        if (!employer) return res.status(403).json({ error: "Employer profile not found" });
        
        const intro = db.prepare(`
          SELECT i.id 
          FROM introductions i
          JOIN job_postings j ON i.job_id = j.id
          WHERE i.id = ? AND j.employer_id = ?
        `).get(introId, employer.id);
        
        if (!intro) return res.status(403).json({ error: "You do not have permission to manage this introduction." });
      }

      db.prepare("UPDATE introductions SET status = ? WHERE id = ?").run(status, introId);

      // Back up database immediately to persist status change
      backupDatabase();

      // Send notifications upon status changes
      try {
        const intro = db.prepare(`
          SELECT i.*, j.title as job_title, j.parish as job_parish, e.company_name, e.contact_name, eu.email as employer_email, e.phone as employer_phone, c.full_name as candidate_name, cu.email as candidate_email, c.phone as candidate_phone, c.contact_preference, c.interview_preference
          FROM introductions i
          JOIN job_postings j ON i.job_id = j.id
          JOIN employers e ON j.employer_id = e.id
          JOIN users eu ON e.user_id = eu.id
          JOIN candidates c ON i.candidate_id = c.id
          JOIN users cu ON c.user_id = cu.id
          WHERE i.id = ?
        `).get(introId) as any;

        if (intro) {
          let candMsg = "";
          let candSubject = "";
          let adminMsg = "";
          let adminSubject = "";

          if (status === 'interview_accepted') {
            candSubject = `Interview Accepted: ${intro.job_title} at ${intro.company_name}`;
            candMsg = `Hi ${intro.candidate_name},\n\nWe have great news! **${intro.company_name}** has accepted your introduction and would like to proceed with an interview for the position of **${intro.job_title}**!\n\nYour selected interview preference: ${intro.interview_preference || 'Virtual Video Call'}.\n\nAn employer representative will reach out to you directly via your preferred contact method: ${intro.contact_preference || 'Email'}.\n\nGood luck with your interview!\nAmber's Healthcare Team`;
            
            adminSubject = `Interview Accepted: ${intro.company_name} & ${intro.candidate_name}`;
            adminMsg = `Admin Notice:\n\nEmployer **${intro.company_name}** has accepted to interview candidate **${intro.candidate_name}** for **${intro.job_title}**.\n\nPlease monitor progress and coordinate if necessary.`;
          } else if (status === 'interview_pending') {
            candSubject = `Application Status Update: ${intro.job_title} at ${intro.company_name}`;
            candMsg = `Hi ${intro.candidate_name},\n\nYour introduction for **${intro.job_title}** at **${intro.company_name}** has been marked as **Pending Review**.\n\nThe employer is currently reviewing candidate profiles and will update your status soon.\n\nBest regards,\nAmber's Healthcare Team`;
            
            adminSubject = `Interview Pending: ${intro.company_name} & ${intro.candidate_name}`;
            adminMsg = `Admin Notice:\n\nEmployer **${intro.company_name}** has set candidate **${intro.candidate_name}**'s introduction to **Pending Review** for **${intro.job_title}**.`;
          } else if (status === 'interview_declined') {
            candSubject = `Application Update: ${intro.job_title} at ${intro.company_name}`;
            candMsg = `Hi ${intro.candidate_name},\n\nThank you for your interest in the **${intro.job_title}** position at **${intro.company_name}**.\n\nAfter reviewing your candidate profile, the employer has decided not to move forward with an interview for this role at this time.\n\nWe will keep actively matching you with other outstanding Baton Rouge healthcare practices!\n\nWarm regards,\nAmber's Healthcare Team`;
            
            adminSubject = `Interview Declined: ${intro.company_name} & ${intro.candidate_name}`;
            adminMsg = `Admin Notice:\n\nEmployer **${intro.company_name}** has declined to interview candidate **${intro.candidate_name}** for **${intro.job_title}**.`;
          }

          if (candSubject && candMsg) {
            dispatchNotification(intro.candidate_email, intro.candidate_phone, 'email', candSubject, candMsg);
          }
          if (adminSubject && adminMsg) {
            const adminUsers = db.prepare("SELECT email FROM users WHERE role = 'admin'").all() as any[];
            for (const admin of adminUsers) {
              dispatchNotification(admin.email, null, 'email', adminSubject, adminMsg);
            }
          }
        }
      } catch (notifyErr: any) {
        logDebug(`Issue sending status change notifications: ${notifyErr.message}`);
      }

      res.json({ success: true, message: `Introduction status successfully updated to ${status}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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
    const employer: any = db.prepare("SELECT id, company_name, contact_name, phone, accepted_agreement_at FROM employers WHERE user_id = ?").get(req.user.id);
    if (!employer || !employer.accepted_agreement_at) return res.status(403).json({ error: "Agreement not accepted" });

    const { title, description, parish, role_category, interview_formats } = req.body;
    const formatsStr = JSON.stringify(interview_formats && Array.isArray(interview_formats) && interview_formats.length > 0
      ? interview_formats
      : ["Virtual Video Call", "Phone-Only Interview", "Written Questionnaire / Email Interview", "Virtual Video Call (Questions provided 48h in advance)"]
    );
    const id = uuidv4();
    db.prepare("INSERT INTO job_postings (id, employer_id, title, description, parish, role_category, interview_formats) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      id, employer.id, title, description, parish, role_category, formatsStr
    );

    // Back up database immediately to persist new job
    backupDatabase();

    // Send confirmation email to employer who posted the job and alerts to admins
    try {
      const empUser = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id) as any;
      if (empUser) {
        const subject = `Job Posting Published: ${title}`;
        const message = `Hello ${employer.contact_name || 'Employer'},\n\nYour new remote job opening for **${title}** has been successfully published!\n\nDetails:\n- Category: ${role_category}\n- Parish: ${parish}\n- Interview formats configured: ${JSON.parse(formatsStr).join(', ')}\n\nWe will notify you immediately once candidate matches are identified or when applications are submitted.\n\nThank you for choosing Amber's Healthcare!`;
        dispatchNotification(empUser.email, employer.phone, 'email', subject, message);
      }

      // Alert Admins that a new job was listed
      const admins = db.prepare("SELECT email FROM users WHERE role = 'admin'").all() as any[];
      for (const admin of admins) {
        const adminSubject = `New Job Posting Alert: ${title} at ${employer.company_name || "Amber's Healthcare Services"}`;
        const adminMessage = `Admin Alert:\n\nA new job posting has been published on Amber's Healthcare.\n\nJob Title: **${title}**\nEmployer: **${employer.company_name || "Amber's Healthcare Services"}**\nCategory: **${role_category}**\nParish: **${parish}**\n\nPlease log in to the admin dashboard to review this job posting and make candidate matches!`;
        dispatchNotification(admin.email, null, 'email', adminSubject, adminMessage);
      }
    } catch (notifyErr: any) {
      logDebug(`Issue sending job post notifications: ${notifyErr.message}`);
    }

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

      // Insert as a potential_match
      db.prepare(`
        INSERT INTO introductions (id, job_id, candidate_id, note, status)
        VALUES (?, ?, ?, ?, 'potential_match')
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
          // 1. Notify Admin via Email about potential match
          const adminUsers = db.prepare("SELECT email FROM users WHERE role = 'admin'").all() as any[];
          for (const admin of adminUsers) {
            const adminSubject = `Potential Match Alert: ${candidate.full_name} applied to ${job.title}`;
            const adminMsg = `Admin Alert:\nCandidate **${candidate.full_name}** has expressed interest in job posting **${job.title}** at **${job.company_name}**.\n\nThis is a potential match. Please log into the Admin Dashboard under 'Potential Matches' to review and confirm or decline this match.\n\nCover Note: "${appNote}"`;
            dispatchNotification(admin.email, null, 'email', adminSubject, adminMsg);
          }
          
          // 2. Notify Candidate via Email
          const candSubject = `Application Received: ${job.title} at ${job.company_name}`;
          const candMsg = `Hi ${candidate.full_name},\n\nYou have successfully expressed interest in the position of **${job.title}** at **${job.company_name}**.\n\nOur placement team is currently reviewing your profile to confirm this match with the employer. We will send you a confirmation email once the match is officially confirmed!\n\nThank you,\nAmber's Healthcare Team`;
          dispatchNotification(candUser.email, candidate.phone, 'email', candSubject, candMsg);
        }
      } catch (notifyErr: any) {
        logDebug(`Issue sending application notifications: ${notifyErr.message}`);
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

  // Get all active matched jobs/introductions for the logged in candidate
  app.get("/api/candidates/matches", authenticate, (req: any, res) => {
    if (req.user.role !== 'candidate') return res.status(403).json({ error: "Forbidden" });
    try {
      const candidate = db.prepare("SELECT id FROM candidates WHERE user_id = ?").get(req.user.id) as any;
      if (!candidate) return res.json([]);
      
      const matches = db.prepare(`
        SELECT i.id as introduction_id, i.status as match_status, i.introduced_at, i.note as match_note,
               j.id as job_id, j.title as job_title, j.description as job_description, j.parish as job_parish, j.role_category,
               e.company_name
        FROM introductions i
        JOIN job_postings j ON i.job_id = j.id
        JOIN employers e ON j.employer_id = e.id
        WHERE i.candidate_id = ? AND i.status != 'declined'
        ORDER BY i.introduced_at DESC
      `).all(candidate.id);
      
      res.json(matches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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

      // Send confirmation email to referrer, referred candidate, and admin
      try {
        // 1. Notify Referrer
        const referrerSubject = `Referral Received: ${candidate_name}`;
        const referrerMsg = `Hi ${referrer_name.trim()},\n\nThank you for referring **${candidate_name.trim()}** to Amber's Healthcare!\n\nYour referral has been successfully registered. We will monitor their matches and keep you updated on their status. If they are placed, we will notify you regarding any referral bonuses!\n\nThank you for supporting our healthcare community in Baton Rouge.`;
        dispatchNotification(referrer_email.trim(), null, 'email', referrerSubject, referrerMsg);

        // 2. Notify Candidate (Referred person)
        const candSubject = `You have been referred to Amber's Healthcare by ${referrer_name.trim()}`;
        const candMsg = `Hi ${candidate_name.trim()},\n\nExciting news! **${referrer_name.trim()}** has referred you for remote administrative or billing positions with Amber's Healthcare in the Baton Rouge region.\n\nWe connect local talent with trusted healthcare employers. To activate your candidate profile and start receiving matches, please complete your registration on our platform.\n\nLooking forward to working with you!`;
        dispatchNotification(candidate_email.trim(), null, 'email', candSubject, candMsg);

        // 3. Notify Admin
        const adminUsers = db.prepare("SELECT email FROM users WHERE role = 'admin'").all() as any[];
        for (const admin of adminUsers) {
          const adminSubject = `New Referral: ${candidate_name} by ${referrer_name}`;
          const adminMsg = `Admin Alert:\nA new referral has been submitted:\n- Referrer: ${referrer_name} (${referrer_email})\n- Candidate: ${candidate_name} (${candidate_email})`;
          dispatchNotification(admin.email, null, 'email', adminSubject, adminMsg);
        }
      } catch (notifyErr: any) {
        logDebug(`Issue sending referral notifications: ${notifyErr.message}`);
      }

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
      // Check if introduction already exists to avoid UNIQUE constraint failed errors
      const existing = db.prepare("SELECT id, status, note FROM introductions WHERE job_id = ? AND candidate_id = ?").get(job_id, candidate_id) as any;
      
      if (existing) {
        db.prepare("UPDATE introductions SET status = 'introduced', note = ?, introduced_at = CURRENT_TIMESTAMP WHERE id = ?").run(note || existing.note, existing.id);
      } else {
        db.prepare("INSERT INTO introductions (id, job_id, candidate_id, note, status) VALUES (?, ?, ?, ?, 'introduced')").run(id, job_id, candidate_id, note);
      }
      
      // Save database backup immediately
      backupDatabase();

      // Send match notifications to both candidate and employer stating potential match was found
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
          const candEmailSubject = `Potential Match Found! We've introduced you for ${job.title}`;
          const candEmailMsg = `Hi ${candidate.full_name},\n\nWe have exciting news! A potential match has been identified and you have been introduced to the position of **${job.title}** with **${job.company_name}** in **${job.parish} Parish**!\n\nDetails:\n- Interview Preference: ${candidate.interview_preference || 'Standard Formats'}\n- Matching Note: "${formattedNote}"\n\nPlease log in to your Candidate Dashboard to review details. The employer will review your profile to schedule an interview!\n\nBest regards,\nAmber's Healthcare Team`;
          dispatchNotification(candidate.candidate_email, candidate.phone, 'both', candEmailSubject, candEmailMsg);

          // 2. Notify Employer via Email
          const empEmailSubject = `Potential Match Found: ${candidate.full_name} introduced for ${job.title}`;
          const empEmailMsg = `Hello ${job.contact_name},\n\nOur placement team has identified a potential match for your job opening: **${job.title}**!\n\nCandidate details:\n- Name: ${candidate.full_name}\n- Parish: ${candidate.parish}\n- Contact Preference: ${candidate.contact_preference || 'Email'}\n- Pre-selected Interview format preference: ${candidate.interview_preference || 'Standard Formats'}\n- Cover Note: "${formattedNote}"\n\nPlease log in to your Employer Dashboard under 'Candidate Introductions' to review their profile and either Accept, Pend, or Deny an interview!\n\nThank you,\nAmber's Healthcare Team`;
          dispatchNotification(job.employer_email, job.employer_phone, 'email', empEmailSubject, empEmailMsg);
        }
      } catch (notifyErr: any) {
        logDebug(`Issue sending match notifications: ${notifyErr.message}`);
      }

      res.json({ id: existing ? existing.id : id });
    } catch (err: any) {
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

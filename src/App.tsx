/**
 * CHANGES COMMITTED:
 * - Implemented Admin Control Center Tabbed UI to display and search Candidates, Employers, Job Postings, and Referrals.
 * - Added a dedicated Referral Management system allowing the administrator (amber@ambershealthcare.com) to view and update statuses.
 * - Created detailed modal popups for viewing employer information, contact persons, and agreement sign times.
 */
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, createContext, useContext, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  MapPin, 
  Briefcase, 
  Users, 
  CheckCircle, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Plus, 
  FileText, 
  DollarSign,
  ChevronRight,
  Stethoscope,
  ShieldCheck,
  Building2,
  Search,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Gift,
  Edit,
  Loader2,
  Bell,
  Smartphone
} from "lucide-react";
import { cn } from "./lib/utils";
import { ALLOWED_PARISHES, ROLE_CATEGORIES, PRICING } from "./constants";

export const INTERVIEW_FORMATS_LIST = [
  "Virtual Video Call",
  "Phone-Only Interview",
  "Written Questionnaire / Email Interview",
  "Virtual Video Call (Questions provided 48h in advance)"
];

// Custom fetch helper to support Bearer token authentication in iframe environments without modifying read-only window.fetch
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem("token");
  let newInit = init ? { ...init } : {};
  if (token) {
    const headers = new Headers(newInit.headers);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    newInit.headers = headers;
  }
  return window.fetch(input, newInit);
};
const fetch = customFetch;

// --- Types ---
interface User {
  id: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white group-hover:bg-emerald-700 transition-colors">
              <Heart className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Amber’s Healthcare</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/jobs" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">Find Jobs</Link>
            <Link to="/pricing" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">Pricing</Link>
            <Link to="/refer" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-emerald-600" /> Refer & Earn $100
            </Link>
            {loading ? (
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/candidate'} 
                  className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link 
                  to="/settings" 
                  className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
                >
                  Account Settings
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-slate-600 hover:text-emerald-600 font-medium transition-colors">Login</Link>
                <Link to="/register" className="px-6 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-medium shadow-sm shadow-emerald-200">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link to="/jobs" className="block text-lg font-medium text-slate-700" onClick={() => setIsOpen(false)}>Find Jobs</Link>
              <Link to="/pricing" className="block text-lg font-medium text-slate-700" onClick={() => setIsOpen(false)}>Pricing</Link>
              <Link to="/refer" className="block text-lg font-medium text-slate-700 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <Gift className="w-5 h-5 text-emerald-600" /> Refer & Earn $100
              </Link>
              {loading ? (
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : user ? (
                <>
                  <Link 
                    to={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/candidate'} 
                    className="block text-lg font-medium text-slate-700" 
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/settings" 
                    className="block text-lg font-medium text-slate-700" 
                    onClick={() => setIsOpen(false)}
                  >
                    Account Settings
                  </Link>
                  <button onClick={handleLogout} className="block w-full text-left text-lg font-medium text-red-600">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block text-lg font-medium text-slate-700" onClick={() => setIsOpen(false)}>Login</Link>
                  <Link to="/register" className="block text-lg font-medium text-emerald-600" onClick={() => setIsOpen(false)}>Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-slate-50 border-t border-slate-200 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-6 h-6 text-emerald-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">Amber’s Healthcare</span>
          </div>
          <p className="text-slate-600 max-w-sm mb-6">
            Connecting Baton Rouge healthcare organizations with top-tier remote administrative talent. Direct-hire recruiting made simple.
          </p>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-emerald-600 transition-colors cursor-pointer">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-slate-900 mb-4">Quick Links</h4>
          <ul className="space-y-2 text-slate-600">
            <li><Link to="/jobs" className="hover:text-emerald-600 transition-colors">Find Jobs</Link></li>
            <li><Link to="/pricing" className="hover:text-emerald-600 transition-colors">Pricing</Link></li>
            <li><Link to="/service-area" className="hover:text-emerald-600 transition-colors">Service Area</Link></li>
            <li><Link to="/refer" className="hover:text-emerald-600 transition-colors font-medium text-emerald-700 flex items-center gap-1">🎁 Refer & Earn $100</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
          <ul className="space-y-2 text-slate-600">
            <li><Link to="/terms" className="hover:text-emerald-600 transition-colors">Candidate Terms</Link></li>
            <li><Link to="/agreement" className="hover:text-emerald-600 transition-colors">Employer Agreement</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-500 text-sm italic">
          “Amber’s Healthcare provides recruitment and placement services only and does not employ or manage candidates.”
        </p>
        <p className="text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} Amber’s Healthcare. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

// --- Pages ---

const Home = () => (
  <div className="pt-20">
    {/* Hero Section */}
    <section className="relative py-24 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold mb-6 border border-emerald-100">
            Baton Rouge & Surrounding Areas Only
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1]">
            Baton Rouge Remote <br />
            <span className="text-emerald-600">Healthcare Admin</span> Placements
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            We specialize exclusively in remote healthcare administrative placements for clinics, practices, and organizations across the Baton Rouge region.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              Hire Talent
            </Link>
            <Link to="/jobs" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-900 font-bold text-lg border border-slate-200 hover:bg-slate-50 transition-all">
              Find a Job
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Roles Section */}
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Specialized Roles We Place</h2>
          <p className="text-slate-600">Exclusively remote, administrative, and local to Baton Rouge.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLE_CATEGORIES.map((role, i) => (
            <motion.div 
              key={role}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-800">{role}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* For Employers / Candidates */}
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-12 bg-slate-900 rounded-[40px] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Building2 className="w-32 h-32" />
            </div>
            <h3 className="text-3xl font-bold mb-6">For Employers</h3>
            <p className="text-slate-400 mb-8 text-lg">
              Find qualified, local administrative talent for your remote roles. No staffing contracts, no percentages—just a flat placement fee.
            </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Direct-hire placements only
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                $4,500 flat fee per hire
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Baton Rouge region specialists
              </li>
            </ul>
            <Link to="/register" className="inline-block px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
              Post a Job
            </Link>
          </div>

          <div className="p-12 bg-emerald-600 rounded-[40px] text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-32 h-32" />
            </div>
            <h3 className="text-3xl font-bold mb-6">For Candidates</h3>
            <p className="text-slate-100/80 mb-8 text-lg">
              Looking for a remote admin role in healthcare? Join our local network and get introduced to top Baton Rouge practices.
            </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-center gap-3 text-emerald-50">
                <CheckCircle className="w-5 h-5 text-emerald-200" />
                Free for all candidates
              </li>
              <li className="flex items-center gap-3 text-emerald-50">
                <CheckCircle className="w-5 h-5 text-emerald-200" />
                Remote-only opportunities
              </li>
              <li className="flex items-center gap-3 text-emerald-50">
                <CheckCircle className="w-5 h-5 text-emerald-200" />
                Direct hire by employers
              </li>
            </ul>
            <Link to="/register" className="inline-block px-8 py-4 rounded-2xl bg-white text-emerald-600 font-bold hover:bg-slate-50 transition-all">
              Create Profile
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* How it Works */}
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-8">How It Works</h2>
            <div className="space-y-8">
              {[
                { title: "Employers post a role", desc: "List your remote administrative needs for the Baton Rouge region." },
                { title: "We introduce local talent", desc: "We shortlist qualified candidates from our local database." },
                { title: "Employer hires directly", desc: "You manage the interviews and make the final hiring decision." },
                { title: "One flat placement fee", desc: "A simple $4,500 fee upon successful hire. No hidden costs." }
              ].map((step, i) => (
                <div key={i} className="flex gap-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-emerald-100 overflow-hidden shadow-2xl">
              <img 
                src="https://picsum.photos/seed/healthcare/800/800" 
                alt="Healthcare Professional" 
                className="w-full h-full object-cover mix-blend-multiply opacity-80"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-xs">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Flat Placement Fee</p>
                  <p className="text-2xl font-bold text-slate-900">$4,500</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 italic">"No percentages. No staffing contracts. Just local talent."</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
);

const Pricing = () => (
  <div className="pt-32 pb-24">
    <div className="max-w-3xl mx-auto px-4 text-center">
      <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Simple, Transparent Pricing</h1>
      <p className="text-xl text-slate-600 mb-12">We believe in straightforward fees that align with your success.</p>
      
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Flat Placement Fee</h2>
          <div className="flex items-baseline justify-center gap-2 mb-8">
            <span className="text-6xl font-extrabold text-emerald-600">$4,500</span>
            <span className="text-slate-500 font-medium">per hire</span>
          </div>
          <ul className="text-left space-y-4 mb-10">
            {[
              "Pay only upon successful hire",
              "12-month candidate introduction protection",
              "Local Baton Rouge area candidates",
              "Remote administrative specialists",
              "Direct-hire placement (no staffing overhead)",
              "Free for all candidates"
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-slate-700">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/register" className="block w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition-all">
            Get Started Today
          </Link>
        </div>
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Invoices are generated automatically upon hire confirmation and are due within 7 days.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const ReferProgram = () => {
  const [referrerName, setReferrerName] = useState("");
  const [referrerEmail, setReferrerEmail] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer_name: referrerName,
          referrer_email: referrerEmail,
          candidate_name: candidateName,
          candidate_email: candidateEmail
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Referral submitted successfully!");
        setReferrerName("");
        setReferrerEmail("");
        setCandidateName("");
        setCandidateEmail("");
      } else {
        setErrorMsg(data.error || "Failed to submit referral.");
      }
    } catch (err) {
      setErrorMsg("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
      <div className="text-center mb-12">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
          🎁 Community Referral Program
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Refer a Colleague & Earn $100</h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Help us connect local healthcare administrative talent with top Baton Rouge region medical practices. You can refer as many people as you want!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 mb-4">How it Works</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">1</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Submit the Referral</h3>
                <p className="text-xs text-slate-500 mt-1">Provide your name and email plus your friend's contact details. No account is required.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">2</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Your Friend Gets Hired</h3>
                <p className="text-xs text-slate-500 mt-1">We match them with remote or local roles in the Baton Rouge region and help them get placed.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">3</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Completes 2 Pay Periods</h3>
                <p className="text-xs text-slate-500 mt-1">Once your friend works successfully for two full pay periods, the employer updates their status in our portal.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">4</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">You Get Paid $100</h3>
                <p className="text-xs text-slate-500 mt-1">We reach out to you directly and send you your $100 cash referral fee reward!</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">Program Rules</h4>
            <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
              <li>Referrers do NOT need to sign up as a candidate or employer.</li>
              <li>There is absolutely NO LIMIT to the number of referrals or rewards you can earn.</li>
              <li>The candidate must complete 2 full pay periods to qualify for payout.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Referral Submission Form</h2>
          
          <form onSubmit={handleReferralSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Jane Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                  value={referrerName}
                  onChange={e => setReferrerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Your Email</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. jane@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                  value={referrerEmail}
                  onChange={e => setReferrerEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 my-6 pt-6">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Who are you referring?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Their Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Smith"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Their Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. john@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                    value={candidateEmail}
                    onChange={e => setCandidateEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {successMsg && (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-100 font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {submitting ? "Submitting..." : <>🎁 Submit Referral & Earn $100</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ServiceArea = () => (
  <div className="pt-32 pb-24">
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-6">Serving the Baton Rouge Region</h1>
        <p className="text-xl text-slate-600">We exclusively serve candidates and employers within these Louisiana parishes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {ALLOWED_PARISHES.map(parish => (
            <div key={parish} className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center gap-4">
              <MapPin className="w-6 h-6 text-emerald-600" />
              <span className="text-lg font-bold text-slate-800">{parish} Parish</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 rounded-3xl p-12 text-white flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-6">Why Local Matters</h2>
          <p className="text-slate-300 leading-relaxed mb-8">
            Even for remote roles, local connections foster better communication, shared community values, and long-term stability for healthcare practices in our region.
          </p>
          <div className="p-6 bg-white/10 rounded-2xl border border-white/10">
            <p className="text-emerald-400 font-bold mb-2">Restriction Notice</p>
            <p className="text-sm text-slate-400">
              Candidates and employers must be physically located within these parishes to use the platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const login = (user: User, token?: string) => {
    if (token) {
      localStorage.setItem("token", token);
    }
    setUser(user);
  };
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Main App ---

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-white flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/service-area" element={<ServiceArea />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/jobs" element={<JobBoard />} />
              <Route path="/candidate" element={<CandidateDashboard />} />
              <Route path="/employer" element={<EmployerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/agreement" element={<EmployerAgreement />} />
              <Route path="/terms" element={<CandidateTerms />} />
              <Route path="/refer" element={<ReferProgram />} />
              <Route path="/settings" element={<AccountSettings />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

const AccountSettings = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Please verify your identity by entering your current password.");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Account information updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to update account information.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="pt-32 text-center text-slate-600 font-medium">
        Please sign in to view account settings.
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 max-w-xl mx-auto px-4">
      <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-slate-900 text-white">
          <h1 className="text-2xl font-extrabold tracking-tight">Account Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your registered email and secure password updates.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-2xl font-semibold">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-2xl font-semibold">
              ✨ {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Registered Email Address</label>
              <input 
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 text-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Update Password (Optional)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">New Password</label>
                  <input 
                    type="password"
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Confirm New Password</label>
                  <input 
                    type="password"
                    placeholder="Leave blank to keep current password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <label className="block text-sm font-bold text-slate-700">
                Confirm Current Password <span className="text-red-500 font-bold">*</span>
              </label>
              <p className="text-xs text-slate-500">For security reasons, you must verify your current password to save changes.</p>
              <input 
                type="password"
                required
                placeholder="Enter current password"
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Saving Changes..." : "Save Account Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Auth Pages ---

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  // Reset Password Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSubmitted, setResetSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/candidate');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(true);

    if (!email.trim() || !password.trim()) {
      setError("Please fill out all mandatory fields.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (res.ok && data.user) {
        login(data.user, data.token);
        navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'employer' ? '/employer' : '/candidate');
      } else {
        setError(data.error || "Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("A network or server error occurred. Please try again.");
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetSubmitted(true);

    if (!resetEmail.trim() || !resetNewPassword.trim() || resetNewPassword.length < 6) {
      setResetError("Please correct the errors in the mandatory fields.");
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data.message || "Your password has been reset successfully!");
        setResetEmail("");
        setResetNewPassword("");
        setResetSubmitted(false);
      } else {
        setResetError(data.error || "Reset failed. Please verify your email.");
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setResetError("A network or server error occurred. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="pt-32 pb-24 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Welcome Back</h2>
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl font-medium mb-4 text-center space-y-2">
            <p>{error}</p>
            <button 
              type="button"
              onClick={() => {
                setResetError("");
                setResetSuccess("");
                setShowResetModal(true);
              }}
              className="text-emerald-700 hover:text-emerald-800 underline font-bold text-xs block mx-auto cursor-pointer"
            >
              Forgot your password? Click here to reset it.
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500 font-bold">*</span>
            </label>
            <input 
              type="email" 
              required 
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                (submitted && !email.trim()) 
                  ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              )}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">
                Password <span className="text-red-500 font-bold">*</span>
              </label>
              <button 
                type="button" 
                onClick={() => {
                  setResetError("");
                  setResetSuccess("");
                  setResetSubmitted(false);
                  setShowResetModal(true);
                }}
                className="text-xs text-emerald-600 hover:underline font-bold"
              >
                Forgot Login Info / Reset Password?
              </button>
            </div>
            <input 
              type="password" 
              required 
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                (submitted && !password.trim()) 
                  ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              )}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer">
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          Don't have an account? <Link to="/register" className="text-emerald-600 font-bold">Register</Link>
        </p>
      </div>

      {/* Forgot Password / Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 relative"
          >
            <button 
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-2xl font-bold text-slate-900 mb-2">Reset Password</h3>
            <p className="text-slate-500 text-sm mb-6">Enter your registered email address and define your new password below to reset your login credentials.</p>

            {resetError && <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl font-medium mb-4">{resetError}</div>}
            {resetSuccess && <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm rounded-xl font-medium mb-4">{resetSuccess}</div>}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="email" 
                  required 
                  placeholder="name@example.com"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                    (resetSubmitted && !resetEmail.trim()) 
                      ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                      : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  )}
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  placeholder="At least 6 characters"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                    (resetSubmitted && (!resetNewPassword.trim() || resetNewPassword.length < 6)) 
                      ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                      : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  )}
                  value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit" 
                disabled={resetLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {resetLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/candidate');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(true);

    if (!email.trim() || !password.trim()) {
      setError("Please fill out all mandatory fields.");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      
      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned status ${res.status}`);
      }

      if (res.ok && data.user) {
        login(data.user, data.token);
        navigate(role === 'employer' ? '/employer' : '/candidate');
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("A network or server error occurred. Please try again.");
    }
  };

  return (
    <div className="pt-32 pb-24 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Create Account</h2>
        {error && <p className="text-red-600 mb-4 text-center text-sm font-semibold">{error}</p>}
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
          <button 
            className={cn("flex-1 py-2 rounded-lg font-bold transition-all", role === 'candidate' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}
            onClick={() => setRole('candidate')}
          >
            Candidate
          </button>
          <button 
            className={cn("flex-1 py-2 rounded-lg font-bold transition-all", role === 'employer' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500")}
            onClick={() => setRole('employer')}
          >
            Employer
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500 font-bold">*</span>
            </label>
            <input 
              type="email" 
              required 
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                (submitted && !email.trim()) 
                  ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              )}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-red-500 font-bold">*</span>
            </label>
            <input 
              type="password" 
              required 
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition-all", 
                (submitted && !password.trim()) 
                  ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              )}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer">
            Register as {role === 'candidate' ? 'Candidate' : 'Employer'}
          </button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          Already have an account? <Link to="/login" className="text-emerald-600 font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
};

// --- Dashboards & Functional Pages ---

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [candidate, setCandidate] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    parish: ALLOWED_PARISHES[0],
    role_specialties: [] as string[],
    experience_summary: "",
    contact_preference: "Email",
    interview_preference: "Virtual Video Call"
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'candidate') {
      fetch("/api/notifications")
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) setNotifications(data);
        })
        .catch(err => console.error("Error fetching notifications", err));

      fetch("/api/candidates/matches")
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) setMatches(data);
        })
        .catch(err => console.error("Error fetching matches", err));

      fetch("/api/candidates/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setCandidate(data);
            let specialties = [];
            try {
              specialties = typeof data.role_specialties === 'string' 
                ? JSON.parse(data.role_specialties) 
                : (data.role_specialties || []);
            } catch (e) {
              specialties = [];
            }
            setProfile({
              full_name: data.full_name === "Pending Setup" ? "" : (data.full_name || ""),
              phone: data.phone || "",
              parish: data.parish || ALLOWED_PARISHES[0],
              role_specialties: Array.isArray(specialties) ? specialties : [],
              experience_summary: data.experience_summary || "",
              contact_preference: data.contact_preference || "Email",
              interview_preference: data.interview_preference || "Virtual Video Call"
            });
          }
        })
        .catch(err => console.error("Failed to fetch candidate profile", err));
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(true);
    
    if (!profile.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!profile.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (profile.role_specialties.length === 0) {
      setError("Please select at least one role specialty.");
      return;
    }
    if (!profile.experience_summary.trim()) {
      setError("Please provide an experience summary.");
      return;
    }

    const res = await fetch("/api/candidates/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      // Re-fetch to get latest state
      fetch("/api/candidates/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) setCandidate(data);
        });
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save profile.");
    }
  };

  const isProfileComplete = candidate && candidate.full_name !== "Pending Setup" && candidate.full_name.trim().length > 0;

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Candidate Profile</h1>
            <p className="opacity-90">
              {isProfileComplete 
                ? "Your profile is active, complete, and matching with local employers!" 
                : "Complete your profile to be matched with local healthcare employers."}
            </p>
          </div>
          {candidate?.accepted_terms_at ? (
            <span className="px-4 py-1.5 bg-emerald-700/50 border border-emerald-400 text-white rounded-full text-xs font-semibold">
              ✓ Terms Accepted
            </span>
          ) : (
            <span className="px-4 py-1.5 bg-amber-500 text-white rounded-full text-xs font-semibold">
              ⚠️ Terms Pending
            </span>
          )}
        </div>

        {!candidate?.accepted_terms_at && (
          <div className="bg-amber-50 border-b border-amber-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-bold text-amber-900 text-sm">Action Required: Accept Candidate Terms</h3>
              <p className="text-xs text-amber-700 mt-1">To ensure compliance with direct-hire regulations, you must review and accept our Candidate Terms.</p>
            </div>
            <Link 
              to="/terms" 
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-amber-200"
            >
              Review & Accept Terms &rarr;
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-2xl border border-red-100 font-medium">
              ⚠️ {error}
            </div>
          )}

          {isProfileComplete && (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-2xl border border-emerald-100 font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Your profile is fully saved and active in our Baton Rouge talent pool. Keep your specialties and summary up to date to get matched!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Full Name <span className="text-red-500 font-bold">*</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="Enter your full name"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                  (submitted && !profile.full_name.trim()) 
                    ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                )}
                value={profile.full_name}
                onChange={e => setProfile({...profile, full_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Phone <span className="text-red-500 font-bold">*</span>
              </label>
              <input 
                type="tel" 
                required
                placeholder="e.g. (225) 555-0199"
                className={cn(
                  "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                  (submitted && !profile.phone.trim()) 
                    ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                    : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                )}
                value={profile.phone}
                onChange={e => setProfile({...profile, phone: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Your Parish (Baton Rouge Region Only)</label>
            <select 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={profile.parish}
              onChange={e => setProfile({...profile, parish: e.target.value})}
            >
              {ALLOWED_PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Specialties <span className="text-red-500 font-bold">*</span>
              {submitted && profile.role_specialties.length === 0 && (
                <span className="text-red-500 text-xs ml-2 font-normal">(Please select at least one specialty)</span>
              )}
            </label>
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl border transition-all",
              (submitted && profile.role_specialties.length === 0)
                ? "border-red-500 bg-red-50/10"
                : "border-slate-100"
            )}>
              {ROLE_CATEGORIES.map(role => (
                <label key={role} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded text-emerald-600"
                    checked={profile.role_specialties.includes(role)}
                    onChange={e => {
                      const roles = e.target.checked 
                        ? [...profile.role_specialties, role]
                        : profile.role_specialties.filter(r => r !== role);
                      setProfile({...profile, role_specialties: roles});
                    }}
                  />
                  <span className="text-sm text-slate-700">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Experience Summary <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea 
              rows={4}
              required
              className={cn(
                "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                (submitted && !profile.experience_summary.trim()) 
                  ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200" 
                  : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
              )}
              value={profile.experience_summary}
              onChange={e => setProfile({...profile, experience_summary: e.target.value})}
              placeholder="Briefly describe your healthcare administrative background..."
            />
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm">✓</span> 
              Inclusivity & Accommodation Preferences
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We want to ensure everyone has a fair chance to succeed. If you struggle with standard interview techniques (such as sensory processing, verbal anxiety, or focus differences), declaring your preferences helps employers structure an inclusive assessment format for you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Contact Method</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  value={profile.contact_preference}
                  onChange={e => setProfile({...profile, contact_preference: e.target.value})}
                >
                  <option value="Email">Email (Recommended)</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Text Message / SMS">Text Message / SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Preferred Interview Format (All Remote)</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  value={profile.interview_preference}
                  onChange={e => setProfile({...profile, interview_preference: e.target.value})}
                >
                  <option value="Virtual Video Call">Virtual Video Call (Standard)</option>
                  <option value="Phone-Only Interview">Phone-Only Interview (No Video)</option>
                  <option value="Written Questionnaire / Email Interview">Written Questionnaire / Email Interview (Inclusive option)</option>
                  <option value="Virtual Video Call (Questions provided 48h in advance)">Virtual Video Call (Questions provided 48h in advance)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-slate-500 italic">"Candidates are never charged for placement."</p>
            <button type="submit" className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer">
              {success ? "Saved!" : "Update Profile"}
            </button>
          </div>
        </form>
      </div>

      {isProfileComplete && (
        <div className="mt-8 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold">My Job Matches ({matches.length})</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {matches.map(m => (
              <div key={m.introduction_id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{m.job_title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{m.company_name} • {m.job_parish} Parish</p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center",
                    m.match_status === 'confirmed_match' 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {m.match_status === 'confirmed_match' ? '✓ Confirmed Match' : '⏳ Potential Match (Under Review)'}
                  </span>
                </div>
                
                {m.match_note && (
                  <div className="text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-100 leading-relaxed italic">
                    " {m.match_note} "
                  </div>
                )}
                
                <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  Matched on {new Date(m.introduced_at).toLocaleDateString()} at {new Date(m.introduced_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm">
                No active job matches yet. As soon as our placement team identifies a match or you express interest, they will appear here!
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold">Matching & Onboarding Alerts ({notifications.length})</h2>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {notifications.map(n => (
            <div key={n.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
              <div className="flex justify-between items-center">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                  n.type === 'both' ? 'bg-indigo-100 text-indigo-800' :
                  n.type === 'sms' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                )}>
                  {n.type === 'both' ? '📧 Email & 📱 SMS' : n.type === 'sms' ? '📱 SMS Match Alert' : '📧 Email Match Alert'}
                </span>
                <span className="text-xs text-slate-400 font-medium">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Subject: {n.subject}</h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">{n.message}</p>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-sm">
              No matching alerts or introduction notifications yet. When you are matched with an employer, alerts will show here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmployerDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    parish: ALLOWED_PARISHES[0],
    website: ""
  });
  const [job, setJob] = useState({
    title: "",
    description: "",
    parish: ALLOWED_PARISHES[0],
    role_category: ROLE_CATEGORIES[0],
    interview_formats: ["Virtual Video Call"] as string[]
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [intros, setIntros] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [updatingReferralId, setUpdatingReferralId] = useState<string | null>(null);
  const [referralStatus, setReferralStatus] = useState("pending");
  const [referralNotes, setReferralNotes] = useState("");
  const [showJobForm, setShowJobForm] = useState(false);
  const [employer, setEmployer] = useState<any>(null);
  const [hiringIntro, setHiringIntro] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [selectedJobMatches, setSelectedJobMatches] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  
  // Profile save feedback states
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [jobSubmitted, setJobSubmitted] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Invoice PayPal payment state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [empRes, jobsRes, introsRes, invRes, refRes, notifRes] = await Promise.all([
        fetch("/api/employers/me"),
        fetch("/api/employers/jobs"),
        fetch("/api/employers/introductions"),
        fetch("/api/employers/invoices"),
        fetch("/api/referrals"),
        fetch("/api/notifications")
      ]);
      
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployer(empData);
        if (empData) {
          setProfile({
            company_name: empData.company_name === "Pending Setup" ? "" : (empData.company_name || ""),
            contact_name: empData.contact_name === "Pending Setup" ? "" : (empData.contact_name || ""),
            phone: empData.phone || "",
            parish: empData.parish || ALLOWED_PARISHES[0],
            website: empData.website || ""
          });
        }
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        if (Array.isArray(data)) setJobs(data);
      }
      if (introsRes.ok) {
        const data = await introsRes.json();
        if (Array.isArray(data)) setIntros(data);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        if (Array.isArray(data)) setInvoices(data);
      }
      if (refRes && refRes.ok) {
        const data = await refRes.json();
        if (Array.isArray(data)) setReferrals(data);
      }
      if (notifRes && notifRes.ok) {
        const data = await notifRes.json();
        if (Array.isArray(data)) setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch employer data", err);
    }
  };

  const fetchMatches = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/matches`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMatches(data);
        setSelectedJobMatches(jobId);
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    }
  };

  useEffect(() => {
    if (user?.role === 'employer') {
      fetchData();
    }
  }, [user]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileSubmitted(true);

    if (!profile.company_name.trim() || profile.company_name === "Pending Setup") {
      setProfileError("Please enter a valid Company Name.");
      return;
    }
    if (!profile.contact_name.trim() || profile.contact_name === "Pending Setup") {
      setProfileError("Please enter a valid Contact Name.");
      return;
    }
    if (!profile.phone || !profile.phone.trim()) {
      setProfileError("Phone Number is required.");
      return;
    }
    const websiteTrimmed = profile.website.trim();
    if (!websiteTrimmed) {
      setProfileError("Website is required to verify legit employer accounts.");
      return;
    }
    if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(websiteTrimmed)) {
      setProfileError("Please enter a valid website URL starting with http:// or https://");
      return;
    }

    try {
      const res = await fetch("/api/employers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (res.ok) {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
        fetchData();
      } else {
        setProfileError(data.error || "Failed to save profile.");
      }
    } catch (err) {
      setProfileError("A network error occurred. Please try again.");
    }
  };

  const handleJobSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setJobSubmitted(true);
    if (!job.title.trim() || !job.description.trim()) {
      return;
    }
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });
    if (res.ok) {
      setShowJobForm(false);
      setJob({ title: "", description: "", parish: ALLOWED_PARISHES[0], role_category: ROLE_CATEGORIES[0], interview_formats: ["Virtual Video Call"] });
      setJobSubmitted(false);
      fetchData();
    }
  };

  const handleHire = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/introductions/${hiringIntro.id}/hire-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: startDate })
    });
    if (res.ok) {
      setHiringIntro(null);
      setStartDate("");
      fetchData();
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold mb-6">Company Profile</h2>
            {employer && employer.company_name !== "Pending Setup" && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100 font-medium flex items-center gap-1.5 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Company Profile Saved & Active</span>
              </div>
            )}
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Company Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="text" 
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border outline-none transition-all",
                    (profileSubmitted && (!profile.company_name.trim() || profile.company_name === "Pending Setup"))
                      ? "border-red-500 bg-red-50/30 focus:ring-1 focus:ring-red-200"
                      : "border-slate-200 focus:border-emerald-500"
                  )}
                  value={profile.company_name}
                  onChange={e => setProfile({...profile, company_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Contact Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="text" 
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border outline-none transition-all",
                    (profileSubmitted && (!profile.contact_name.trim() || profile.contact_name === "Pending Setup"))
                      ? "border-red-500 bg-red-50/30 focus:ring-1 focus:ring-red-200"
                      : "border-slate-200 focus:border-emerald-500"
                  )}
                  value={profile.contact_name}
                  onChange={e => setProfile({...profile, contact_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Phone Number <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="tel" 
                  placeholder="(225) 555-0199"
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border outline-none transition-all",
                    (profileSubmitted && !profile.phone.trim())
                      ? "border-red-500 bg-red-50/30 focus:ring-1 focus:ring-red-200"
                      : "border-slate-200 focus:border-emerald-500"
                  )}
                  value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Company Website <span className="text-red-500 font-bold">*</span>
                </label>
                <input 
                  type="url" 
                  placeholder="https://example.com"
                  className={cn(
                    "w-full px-4 py-2 rounded-lg border outline-none transition-all",
                    (profileSubmitted && (!profile.website.trim() || !/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(profile.website.trim())))
                      ? "border-red-500 bg-red-50/30 focus:ring-1 focus:ring-red-200"
                      : "border-slate-200 focus:border-emerald-500"
                  )}
                  value={profile.website}
                  onChange={e => setProfile({...profile, website: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parish</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 transition-all"
                  value={profile.parish}
                  onChange={e => setProfile({...profile, parish: e.target.value})}
                >
                  {ALLOWED_PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {profileError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 font-medium leading-relaxed">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 font-medium leading-relaxed">
                  Profile Saved Successfully!
                </div>
              )}

              <button 
                type="submit" 
                className={cn(
                  "w-full py-2 rounded-lg font-bold transition-all shadow-sm cursor-pointer text-center block",
                  profileSuccess 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                )}
              >
                {profileSuccess ? "✓ Saved!" : "Save Profile"}
              </button>
            </form>
          </div>

          <div className={cn("p-6 rounded-3xl border", employer?.accepted_agreement_at ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100")}>
            <h3 className={cn("font-bold mb-2", employer?.accepted_agreement_at ? "text-emerald-900" : "text-amber-900")}>
              Agreement Status
            </h3>
            <p className={cn("text-sm mb-4", employer?.accepted_agreement_at ? "text-emerald-700" : "text-amber-700")}>
              {employer?.accepted_agreement_at 
                ? `Accepted on ${new Date(employer.accepted_agreement_at).toLocaleDateString()}`
                : "You must accept the Employer Services Agreement before posting jobs."}
            </p>
            {!employer?.accepted_agreement_at && (
              <Link to="/agreement" className="text-amber-600 font-bold text-sm hover:underline">View Agreement &rarr;</Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-12">
          {/* Job Postings */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Your Job Postings</h2>
              <button 
                onClick={() => setShowJobForm(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Post New Job
              </button>
            </div>

            {showJobForm && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-200 mb-8"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">New Remote Admin Role</h2>
                  <button onClick={() => setShowJobForm(false)}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <form onSubmit={handleJobSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Job Title <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                          (jobSubmitted && !job.title.trim())
                            ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200"
                            : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                        )}
                        value={job.title}
                        onChange={e => setJob({...job, title: e.target.value})}
                        placeholder="e.g. Patient Intake Coordinator"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                      <select 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                        value={job.role_category}
                        onChange={e => setJob({...job, role_category: e.target.value})}
                      >
                        {ROLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Description <span className="text-red-500 font-bold">*</span>
                    </label>
                    <textarea 
                      rows={4}
                      required 
                      className={cn(
                        "w-full px-4 py-3 rounded-xl border outline-none transition-all",
                        (jobSubmitted && !job.description.trim())
                          ? "border-red-500 bg-red-50/30 focus:ring-2 focus:ring-red-200"
                          : "border-slate-200 focus:ring-2 focus:ring-emerald-500"
                      )}
                      value={job.description}
                      onChange={e => setJob({...job, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <label className="block text-sm font-bold text-slate-700">Available Interview Formats</label>
                    <p className="text-xs text-slate-500">Please select which assessment formats your organization can accommodate for this position. Candidates will choose their preference from this list.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {INTERVIEW_FORMATS_LIST.map(format => (
                        <label key={format} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-700 bg-white border border-slate-100">
                          <input 
                            type="checkbox"
                            checked={job.interview_formats?.includes(format)}
                            onChange={e => {
                              const list = job.interview_formats || [];
                              const updated = e.target.checked 
                                ? [...list, format] 
                                : list.filter(f => f !== format);
                              setJob({...job, interview_formats: updated});
                            }}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                          />
                          <span>{format}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500 italic">"Direct-hire recruiting only. We do not provide staffing."</p>
                    <button type="submit" className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
                      Publish Job
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map(j => (
                <div key={j.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900">{j.title}</h3>
                    <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", j.status === 'open' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                      {j.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{j.role_category}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-slate-400">Posted on {new Date(j.created_at).toLocaleDateString()}</div>
                    <button 
                      onClick={() => fetchMatches(j.id)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      View Matched Candidates
                    </button>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-500">No active job postings.</p>
                </div>
              )}
            </div>
          </section>

          {/* Matched Candidates Section */}
          <AnimatePresence>
            {selectedJobMatches && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-emerald-900">Matched Candidates</h2>
                      <p className="text-sm text-emerald-700">AI-suggested local talent for your role.</p>
                    </div>
                    <button onClick={() => setSelectedJobMatches(null)} className="p-2 hover:bg-emerald-100 rounded-full transition-colors">
                      <X className="w-5 h-5 text-emerald-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map(m => (
                      <div key={m.id} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-slate-900">{m.full_name}</h3>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">Match</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{m.parish} Parish</p>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-4 italic">"{m.experience_summary}"</p>
                        
                        {m.contact_preference && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            <span className="text-[10px] px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold">
                              Reach via: {m.contact_preference}
                            </span>
                            <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md font-semibold">
                              Preferred Interview: {m.interview_preference}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                          <ShieldCheck className="w-3 h-3" />
                          VERIFIED LOCAL
                        </div>
                      </div>
                    ))}
                    {matches.length === 0 && (
                      <div className="col-span-full p-8 text-center text-emerald-700 italic">
                        No immediate matches found. Our team is actively sourcing for you.
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 p-4 bg-white/50 rounded-xl border border-emerald-100/50">
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      <strong>Note:</strong> These matches are based on role specialty. To initiate an interview, please contact Amber's Healthcare directly or wait for our formal introduction.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Introductions */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Candidate Introductions</h2>
            <div className="space-y-4">
              {intros.map(i => (
                <div key={i.id} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-slate-900">{i.candidate_name}</h3>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold">INTRODUCED</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 font-medium">For: {i.job_title}</p>
                    <p className="text-sm text-slate-500 mb-4">{i.experience_summary}</p>
                    
                    {i.contact_preference && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold">
                          Preferred Contact: {i.contact_preference}
                        </span>
                        <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-semibold">
                          Preferred Interview Method: {i.interview_preference}
                        </span>
                      </div>
                    )}

                    {i.note && (
                      <div className="mt-3 p-3 bg-emerald-50/50 border border-emerald-100/30 rounded-xl text-sm text-slate-700">
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Candidate Application Cover Note:</p>
                        <p className="italic">"{i.note}"</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center">
                    {i.hire_id ? (
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        <span>Hired</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setHiringIntro(i)}
                        className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
                      >
                        Mark as Hired
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {intros.length === 0 && (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-500">No candidate introductions yet. We'll notify you when we find a match.</p>
                </div>
              )}
            </div>
          </section>

          {/* Invoices */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Placement Invoices</h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Candidate</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Job</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.candidate_name}</td>
                      <td className="px-6 py-4 text-slate-600">{inv.job_title}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">${(inv.amount_cents / 100).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 rounded text-xs font-bold uppercase", 
                          inv.status === 'paid' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        )}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.status !== 'paid' ? (
                          <button 
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Pay with PayPal
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No invoices generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Referral Rewards Tracker */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Referral Rewards Tracker</h2>
                <p className="text-sm text-slate-500 mt-1">Manage submitted community referrals and update payout milestones.</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full">
                $100 Referral Program
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Referrer</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Referred Candidate</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Current Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employer Notes</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 text-sm">{ref.referrer_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{ref.referrer_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 text-sm">{ref.candidate_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{ref.candidate_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider block text-center w-max", 
                          ref.status === 'paid_completed' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          ref.status === 'hired_waiting_pay_periods' ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                          ref.status === 'rejected' ? "bg-red-50 text-red-700 border border-red-100" :
                          "bg-slate-50 text-slate-600 border border-slate-200"
                        )}>
                          {ref.status === 'paid_completed' ? "Paid (2+ Periods)" :
                           ref.status === 'hired_waiting_pay_periods' ? "Hired (Waiting Payout)" :
                           ref.status === 'rejected' ? "Rejected" : "Pending Match"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {updatingReferralId === ref.id ? (
                          <input 
                            type="text" 
                            className="px-3 py-1.5 rounded-lg border border-slate-200 outline-none text-xs w-full focus:border-indigo-500"
                            value={referralNotes}
                            onChange={e => setReferralNotes(e.target.value)}
                          />
                        ) : (
                          <p className="text-xs text-slate-500 italic truncate max-w-[160px]">
                            {ref.notes || "No notes added yet."}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {updatingReferralId === ref.id ? (
                          <div className="flex flex-col gap-1.5">
                            <select 
                              className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs outline-none"
                              value={referralStatus}
                              onChange={e => setReferralStatus(e.target.value)}
                            >
                              <option value="pending">Pending Match</option>
                              <option value="hired_waiting_pay_periods">Hired &amp; Active</option>
                              <option value="paid_completed">Completed 2 Pay Periods (Paid)</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/referrals/${ref.id}/status`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: referralStatus, notes: referralNotes })
                                    });
                                    if (response.ok) {
                                      setUpdatingReferralId(null);
                                      // refresh
                                      const refRes = await fetch("/api/referrals");
                                      if (refRes.ok) {
                                        const rData = await refRes.json();
                                        setReferrals(rData);
                                      }
                                    }
                                  } catch (err) {
                                    console.error("Error updating referral status", err);
                                  }
                                }}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-md transition-all cursor-pointer"
                              >
                                Save
                              </button>
                              <button 
                                onClick={() => setUpdatingReferralId(null)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-md transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setUpdatingReferralId(ref.id);
                              setReferralStatus(ref.status || "pending");
                              setReferralNotes(ref.notes || "");
                            }}
                            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {referrals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No community referrals have been submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Matching Alert Notifications */}
          <section className="bg-white rounded-[30px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h2 className="text-lg font-bold">Matching & Application Alert Logs ({notifications.length})</h2>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                      n.type === 'both' ? 'bg-indigo-100 text-indigo-800' :
                      n.type === 'sms' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    )}>
                      {n.type === 'both' ? '📧 Email & 📱 SMS' : n.type === 'sms' ? '📱 SMS Match Alert' : '📧 Email Match Alert'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Subject: {n.subject}</h3>
                  <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No match alerts have been triggered yet for your organization. When we make an introduction, the details will show here.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {hiringIntro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setHiringIntro(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Hire</h2>
              <p className="text-slate-600 mb-6">Confirming the hire of <span className="font-bold text-slate-900">{hiringIntro.candidate_name}</span> for <span className="font-bold text-slate-900">{hiringIntro.job_title}</span>.</p>
              
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6">
                <p className="text-sm text-amber-800 font-medium">
                  A flat placement fee of <span className="font-bold">$4,500</span> will be invoiced to your company upon confirmation.
                </p>
              </div>

              <form onSubmit={handleHire} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Anticipated Start Date</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setHiringIntro(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
                  >
                    Confirm & Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {selectedInvoiceForPayment && (
          <PayPalPaymentModal 
            invoice={selectedInvoiceForPayment} 
            onClose={() => setSelectedInvoiceForPayment(null)} 
            onSuccess={() => {
              setSelectedInvoiceForPayment(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const getJobFormats = (job: any): string[] => {
  if (!job) return INTERVIEW_FORMATS_LIST;
  let formats = job.interview_formats;
  if (!formats) return INTERVIEW_FORMATS_LIST;
  if (typeof formats === "string") {
    try {
      formats = JSON.parse(formats);
    } catch (e) {
      formats = formats.split(",").map((s: string) => s.trim());
    }
  }
  if (Array.isArray(formats) && formats.length > 0) {
    return formats;
  }
  return INTERVIEW_FORMATS_LIST;
};

const JobBoard = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [interestLoading, setInterestLoading] = useState<string | null>(null);
  const [interestSuccess, setInterestSuccess] = useState<string | null>(null);
  const [interestError, setInterestError] = useState<string | null>(null);

  // Profile data & Modal states
  const [candidateProfile, setCandidateProfile] = useState<any>(null);
  const [applyingJob, setApplyingJob] = useState<any>(null);
  const [selectedJobDetails, setSelectedJobDetails] = useState<any>(null);
  const [appForm, setAppForm] = useState({
    note: "",
    phone: "",
    contact_preference: "Email",
    interview_preference: "Virtual Video Call"
  });

  const fetchJobsAndApplications = async () => {
    try {
      const res = await fetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }

      if (user?.role === 'candidate') {
        const appRes = await fetch("/api/candidates/applications");
        if (appRes.ok) {
          const appData = await appRes.json();
          setAppliedJobIds(appData);
        }

        const profileRes = await fetch("/api/candidates/me");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setCandidateProfile(profileData);
        }
      }
    } catch (err) {
      console.error("Error fetching jobs/applications:", err);
    }
  };

  useEffect(() => {
    fetchJobsAndApplications();
  }, [user]);

  const handleOpenApplicationModal = (job: any) => {
    // If the candidate profile has not been completed, warn them!
    if (!candidateProfile || candidateProfile.full_name === "Pending Setup" || !candidateProfile.full_name.trim()) {
      setInterestError("Please complete your Candidate Profile first under 'Dashboard' before applying.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setApplyingJob(job);
    const availableFormats = getJobFormats(job);
    setAppForm({
      note: "",
      phone: candidateProfile?.phone || "",
      contact_preference: candidateProfile?.contact_preference || "Email",
      interview_preference: availableFormats.includes(candidateProfile?.interview_preference)
        ? candidateProfile.interview_preference
        : (availableFormats[0] || "Virtual Video Call")
    });
  };

  const handleAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;

    setInterestError(null);
    setInterestSuccess(null);
    setInterestLoading(applyingJob.id);

    try {
      const res = await fetch(`/api/jobs/${applyingJob.id}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setInterestSuccess(applyingJob.id);
        setAppliedJobIds([...appliedJobIds, applyingJob.id]);
        setApplyingJob(null);
        setTimeout(() => setInterestSuccess(null), 4000);
      } else {
        setInterestError(data.error || "Failed to submit application.");
      }
    } catch (err) {
      console.error("Application submission error:", err);
      setInterestError("A network error occurred. Please try again.");
    } finally {
      setInterestLoading(null);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-5xl mx-auto px-4">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Remote Admin Jobs</h1>
        <p className="text-xl text-slate-600">Baton Rouge & surrounding areas only.</p>
        
        {interestError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl font-semibold text-sm flex items-center justify-between">
            <span>⚠️ {interestError}</span>
            <button onClick={() => setInterestError(null)} className="text-red-500 font-bold ml-2">Dismiss</button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {jobs.length > 0 ? jobs.map(job => {
          const hasApplied = appliedJobIds.includes(job.id);
          const isOwnRole = user?.role === 'employer' || user?.role === 'admin';

          return (
            <div key={job.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-200 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2 uppercase tracking-wider">
                    {job.role_category}
                  </span>
                  <h2 
                    onClick={() => setSelectedJobDetails(job)}
                    className="text-2xl font-bold text-slate-900 hover:text-emerald-600 hover:underline transition-colors cursor-pointer"
                  >
                    {job.title}
                  </h2>
                  <p className="text-slate-500 font-medium">{job.company_name} • {job.parish} Parish</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Remote</span>
                </div>
              </div>
              <p 
                onClick={() => setSelectedJobDetails(job)}
                className="text-slate-600 mb-6 line-clamp-2 cursor-pointer hover:text-slate-800 transition-colors"
                title="Click to view entire job description"
              >
                {job.description} <span className="text-emerald-600 font-bold hover:underline inline-block text-sm ml-1">Read more &rarr;</span>
              </p>
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>Baton Rouge Region</span>
                  </div>
                  <button 
                    onClick={() => setSelectedJobDetails(job)}
                    className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors cursor-pointer text-sm flex items-center gap-1"
                  >
                    View Details &rarr;
                  </button>
                </div>

                {interestSuccess === job.id ? (
                  <span className="px-6 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Interest Expressed!
                  </span>
                ) : hasApplied ? (
                  <button 
                    disabled
                    className="px-6 py-2 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Applied / Under Matching
                  </button>
                ) : user?.role === 'candidate' ? (
                  <button 
                    onClick={() => handleOpenApplicationModal(job)}
                    className="px-6 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer text-sm"
                  >
                    Apply / Express Interest
                  </button>
                ) : isOwnRole ? (
                  <Link 
                    to={user.role === 'admin' ? '/admin' : '/employer'} 
                    className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm"
                  >
                    Go to Dashboard &rarr;
                  </Link>
                ) : (
                  <Link to="/register" className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm">
                    Apply Now
                  </Link>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500">No active jobs at the moment. Check back soon!</p>
          </div>
        )}
      </div>

      {/* Job Application Modal Form */}
      <AnimatePresence>
        {applyingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setApplyingJob(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 overflow-y-auto max-h-[90vh] z-10"
            >
              <button 
                onClick={() => setApplyingJob(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-6">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2 uppercase tracking-wider">
                  Direct Job Application
                </span>
                <h2 className="text-2xl font-bold text-slate-900">{applyingJob.title}</h2>
                <p className="text-slate-500 font-medium">{applyingJob.company_name} • {applyingJob.parish} Parish</p>
              </div>

              <form onSubmit={handleAppSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Why are you interested in this position? (Cover Note) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea 
                    rows={4}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Briefly explain why you are interested in this remote role and what healthcare administrative or billing skills you offer..."
                    value={appForm.note}
                    onChange={e => setAppForm({...appForm, note: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Confirm Phone Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="e.g. (225) 555-0199"
                    value={appForm.phone}
                    onChange={e => setAppForm({...appForm, phone: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Preferred Contact Method
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      value={appForm.contact_preference}
                      onChange={e => setAppForm({...appForm, contact_preference: e.target.value})}
                    >
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Text">Text</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Interview Preference
                    </label>
                    <select 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                      value={appForm.interview_preference}
                      onChange={e => setAppForm({...appForm, interview_preference: e.target.value})}
                    >
                      {getJobFormats(applyingJob).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700">Submitting Profile Attachments:</p>
                  <p>• Your saved Experience Summary and Specialties will automatically accompany this message.</p>
                  <p>• Preferred preferences will update your permanent Candidate Profile.</p>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setApplyingJob(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={interestLoading !== null}
                    className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {interestLoading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Details Modal */}
      <AnimatePresence>
        {selectedJobDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedJobDetails(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl p-8 overflow-y-auto max-h-[90vh] z-10"
            >
              <button 
                onClick={() => setSelectedJobDetails(null)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-6 border-b border-slate-100 pb-6">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2 uppercase tracking-wider">
                  {selectedJobDetails.role_category}
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 mt-1 mb-2">{selectedJobDetails.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium text-sm">
                  <span>{selectedJobDetails.company_name}</span>
                  <span>•</span>
                  <span>{selectedJobDetails.parish} Parish</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Remote
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Job Description</h3>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    {selectedJobDetails.description}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Configured Interview Formats</h3>
                  <div className="flex flex-wrap gap-2">
                    {getJobFormats(selectedJobDetails).map(format => (
                      <span key={format} className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        • {format}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/60">
                  <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-emerald-600" /> Contact & Inquiries
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    This job listing is managed by Amber's Healthcare. For any questions, application status updates, or other inquiries regarding this position, please reach out to our team directly at:
                  </p>
                  <p className="mt-3 text-sm font-bold text-emerald-700">
                    <a href="mailto:contact@ambershealthcare.com" className="hover:underline">
                      contact@ambershealthcare.com
                    </a>
                  </p>
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setSelectedJobDetails(null)}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm cursor-pointer"
                  >
                    Close
                  </button>
                  
                  {interestSuccess === selectedJobDetails.id ? (
                    <span className="flex-1 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Interest Expressed!
                    </span>
                  ) : appliedJobIds.includes(selectedJobDetails.id) ? (
                    <button 
                      disabled
                      className="flex-1 py-3 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Applied / Under Matching
                    </button>
                  ) : user?.role === 'candidate' ? (
                    <button 
                      onClick={() => {
                        const job = selectedJobDetails;
                        setSelectedJobDetails(null);
                        handleOpenApplicationModal(job);
                      }}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Apply / Express Interest
                    </button>
                  ) : (user?.role === 'employer' || user?.role === 'admin') ? (
                    <Link 
                      to={user.role === 'admin' ? '/admin' : '/employer'} 
                      onClick={() => setSelectedJobDetails(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all text-sm text-center cursor-pointer flex items-center justify-center"
                    >
                      Go to Dashboard
                    </Link>
                  ) : (
                    <Link 
                      to="/register" 
                      onClick={() => setSelectedJobDetails(null)}
                      className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all text-sm text-center cursor-pointer flex items-center justify-center"
                    >
                      Apply Now
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = () => {
  // Authentication context
  const { user } = useAuth();
  
  // Dashboard overall stats
  const [stats, setStats] = useState({ totalHires: 0, activeJobs: 0, totalRevenue: 0 });
  
  // Tab-specific list states
  const [candidates, setCandidates] = useState<any[]>([]);
  const [employers, setEmployers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [potentials, setPotentials] = useState<any[]>([]);
  
  // Search state and selected active tab
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState<'candidates' | 'employers' | 'jobs' | 'referrals' | 'potentials' | 'notifications'>('candidates');
  
  // Modals & detail views states
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [introData, setIntroData] = useState({ job_id: "", candidate_id: "", note: "" });
  
  // Submission feedback states
  const [introError, setIntroError] = useState<string | null>(null);
  const [introSuccess, setIntroSuccess] = useState<string | null>(null);
  const [introLoading, setIntroLoading] = useState(false);

  // Referral updating state variables
  const [referralStatus, setReferralStatus] = useState("pending");
  const [referralNotes, setReferralNotes] = useState("");

  const handleConfirmMatch = async (id: string) => {
    try {
      const res = await fetch(`/api/introductions/${id}/confirm`, { method: "POST" });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to confirm match");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectMatch = async (id: string) => {
    if (!window.confirm("Are you sure you want to decline this match?")) return;
    try {
      const res = await fetch(`/api/introductions/${id}/reject`, { method: "POST" });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to decline match");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch all administrative data from corresponding server endpoints
  const fetchData = async () => {
    try {
      const [statsRes, candRes, jobsRes, empRes, refRes, notifyRes, potRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/candidates"),
        fetch("/api/admin/jobs"),
        fetch("/api/admin/employers"),
        fetch("/api/referrals"),
        fetch("/api/admin/notifications"),
        fetch("/api/admin/potential-matches")
      ]);
      
      if (statsRes.ok) setStats(await statsRes.json());
      if (candRes.ok) {
        const data = await candRes.json();
        if (Array.isArray(data)) setCandidates(data);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        if (Array.isArray(data)) setJobs(data);
      }
      if (empRes.ok) {
        const data = await empRes.json();
        if (Array.isArray(data)) setEmployers(data);
      }
      if (refRes.ok) {
        const data = await refRes.json();
        if (Array.isArray(data)) setReferrals(data);
      }
      if (notifyRes.ok) {
        const data = await notifyRes.json();
        if (Array.isArray(data)) setNotifications(data);
      }
      if (potRes.ok) {
        const data = await potRes.json();
        if (Array.isArray(data)) setPotentials(data);
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  // Re-fetch data on user change
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  // Handle submitting candidate/job introduction
  const handleIntroSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIntroError(null);
    setIntroSuccess(null);
    setIntroLoading(true);

    try {
      const res = await fetch("/api/introductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(introData)
      });
      const data = await res.json();
      if (res.ok) {
        setIntroSuccess("Introduction created successfully & email/text notifications dispatched!");
        setIntroData({ job_id: "", candidate_id: "", note: "" });
        fetchData();
        setTimeout(() => {
          setShowIntroForm(false);
          setIntroSuccess(null);
        }, 3000);
      } else {
        setIntroError(data.error || "Failed to create introduction.");
      }
    } catch (err) {
      console.error("Error creating introduction:", err);
      setIntroError("A network error occurred. Please try again.");
    } finally {
      setIntroLoading(false);
    }
  };

  // Handle updating status & admin notes on a submitted referral
  const handleReferralStatusUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedReferral) return;

    try {
      const res = await fetch(`/api/referrals/${selectedReferral.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: referralStatus,
          employer_notes: referralNotes
        })
      });

      if (res.ok) {
        setSelectedReferral(null);
        fetchData();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update referral status.");
      }
    } catch (err) {
      console.error("Error updating referral status", err);
    }
  };

  // Helper to open referral update modal with initial state prefilled
  const openReferralModal = (referral: any) => {
    setSelectedReferral(referral);
    setReferralStatus(referral.status || "pending");
    setReferralNotes(referral.employer_notes || "");
  };

  // Perform client-side keyword search based on selected tab context
  const getFilteredItems = () => {
    const term = searchTerm.toLowerCase();
    if (selectedTab === 'candidates') {
      return candidates.filter(c => 
        (c.full_name || "").toLowerCase().includes(term) ||
        (c.parish || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term)
      );
    } else if (selectedTab === 'employers') {
      return employers.filter(e => 
        (e.company_name || "").toLowerCase().includes(term) ||
        (e.contact_name || "").toLowerCase().includes(term) ||
        (e.email || "").toLowerCase().includes(term) ||
        (e.parish || "").toLowerCase().includes(term)
      );
    } else if (selectedTab === 'jobs') {
      return jobs.filter(j => 
        (j.title || "").toLowerCase().includes(term) ||
        (j.company_name || "").toLowerCase().includes(term) ||
        (j.parish || "").toLowerCase().includes(term) ||
        (j.role_category || "").toLowerCase().includes(term)
      );
    } else if (selectedTab === 'referrals') {
      return referrals.filter(r => 
        (r.referrer_name || "").toLowerCase().includes(term) ||
        (r.referrer_email || "").toLowerCase().includes(term) ||
        (r.candidate_name || "").toLowerCase().includes(term) ||
        (r.candidate_email || "").toLowerCase().includes(term) ||
        (r.status || "").toLowerCase().includes(term)
      );
    } else if (selectedTab === 'notifications') {
      return notifications.filter(n => 
        (n.recipient_email || "").toLowerCase().includes(term) ||
        (n.recipient_phone || "").toLowerCase().includes(term) ||
        (n.subject || "").toLowerCase().includes(term) ||
        (n.message || "").toLowerCase().includes(term) ||
        (n.type || "").toLowerCase().includes(term)
      );
    } else if (selectedTab === 'potentials') {
      return potentials.filter(p =>
        (p.candidate_name || "").toLowerCase().includes(term) ||
        (p.job_title || "").toLowerCase().includes(term) ||
        (p.company_name || "").toLowerCase().includes(term) ||
        (p.candidate_parish || "").toLowerCase().includes(term) ||
        (p.job_parish || "").toLowerCase().includes(term) ||
        (p.note || "").toLowerCase().includes(term)
      );
    }
    return [];
  };

  const filteredItems = getFilteredItems();

  // Guard clause against non-admin users
  if (user?.role !== 'admin') return <div className="pt-32 text-center">Unauthorized</div>;

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Control Center</h1>
          <p className="text-slate-500 mt-1">Manage referrals, employers, candidates, and job board openings.</p>
        </div>
        <button 
          onClick={() => setShowIntroForm(true)}
          className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Create Introduction</span>
        </button>
      </div>

      {/* Admin stats metrics panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-colors">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Total Hires</h3>
          <p className="text-4xl font-extrabold text-slate-900">{stats.totalHires}</p>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-colors">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Active Jobs</h3>
          <p className="text-4xl font-extrabold text-slate-900">{stats.activeJobs}</p>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-500 transition-colors">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Total Revenue</h3>
          <p className="text-4xl font-extrabold text-emerald-600">${(stats.totalRevenue / 100).toLocaleString()}</p>
        </div>
      </div>

      {/* Introduction creation form modal block */}
      {showIntroForm && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-200 mb-12"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">New Candidate-Job Introduction</h2>
            <button 
              onClick={() => {
                setShowIntroForm(false);
                setIntroError(null);
                setIntroSuccess(null);
              }} 
              className="p-2 hover:bg-slate-100 rounded-full"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {introError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-semibold flex items-start gap-2">
              <span className="text-rose-500 font-bold">⚠️ Error:</span>
              <span>{introError}</span>
            </div>
          )}

          {introSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm font-semibold flex items-start gap-2">
              <span className="text-emerald-500 font-bold">✨ Success:</span>
              <span>{introSuccess}</span>
            </div>
          )}

          <form onSubmit={handleIntroSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Job Posting</label>
                <select 
                  required
                  disabled={introLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  value={introData.job_id}
                  onChange={e => setIntroData({...introData, job_id: e.target.value})}
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.company_name} - {j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Candidate</label>
                <select 
                  required
                  disabled={introLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  value={introData.candidate_id}
                  onChange={e => setIntroData({...introData, candidate_id: e.target.value})}
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.parish})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Admin Note / Message</label>
              <textarea 
                rows={3}
                disabled={introLoading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                value={introData.note}
                onChange={e => setIntroData({...introData, note: e.target.value})}
                placeholder="Include details about why this match is recommended..."
              />
            </div>
            <button 
              type="submit" 
              disabled={introLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer flex justify-center items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {introLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Dispatched Match & Sending Notifications...</span>
                </>
              ) : (
                <span>Create Introduction & Send Email/Text Alerts</span>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Main unified management panel */}
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Navigation tabs & global tab-specific search bar */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedTab('candidates'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                selectedTab === 'candidates' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Users className="w-4 h-4" />
              <span>Candidates ({candidates.length})</span>
            </button>
            
            <button
              onClick={() => { setSelectedTab('employers'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                selectedTab === 'employers' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Building2 className="w-4 h-4" />
              <span>Employers ({employers.length})</span>
            </button>

            <button
              onClick={() => { setSelectedTab('jobs'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                selectedTab === 'jobs' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Briefcase className="w-4 h-4" />
              <span>Jobs ({jobs.length})</span>
            </button>

            <button
              onClick={() => { setSelectedTab('referrals'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                selectedTab === 'referrals' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Gift className="w-4 h-4" />
              <span>Referrals ({referrals.length})</span>
            </button>

            <button
              onClick={() => { setSelectedTab('potentials'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer relative",
                selectedTab === 'potentials' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Potential Matches ({potentials.length})</span>
              {potentials.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-bounce">
                  {potentials.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setSelectedTab('notifications'); setSearchTerm(''); }}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
                selectedTab === 'notifications' 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <Bell className="w-4 h-4" />
              <span>Alert Logs ({notifications.length})</span>
            </button>
          </div>

          {/* Search box targeting active tab keys */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search in ${selectedTab}...`}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tab content renders dynamic tables / list items */}
        <div className="overflow-x-auto">
          {selectedTab === 'candidates' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(c => (
                <div key={c.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <p className="font-extrabold text-slate-900 text-lg">{c.full_name}</p>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold uppercase">{c.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" />{c.parish} Parish</span>
                      <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400" />{c.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400" />{c.phone || "No phone"}</span>
                    </div>
                    {/* Render Specialties pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(() => {
                        try {
                          const specialties = typeof c.role_specialties === 'string' 
                            ? JSON.parse(c.role_specialties) 
                            : c.role_specialties;
                          return (Array.isArray(specialties) ? specialties : []).map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                              {s}
                            </span>
                          ));
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCandidate(c)}
                    className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer self-start sm:self-center"
                  >
                    View details
                  </button>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400">No candidates found.</div>
              )}
            </div>
          )}

          {selectedTab === 'employers' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(e => (
                <div key={e.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-slate-900 text-lg">{e.company_name}</p>
                      {e.accepted_agreement_at && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Signed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><User className="w-4 h-4 text-slate-400" />Contact: {e.contact_name}</span>
                      <span className="flex items-center gap-1"><Mail className="w-4 h-4 text-slate-400" />{e.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-4 h-4 text-slate-400" />{e.phone || "No phone"}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" />{e.parish} Parish</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEmployer(e)}
                    className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer self-start sm:self-center"
                  >
                    View details
                  </button>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400">No employers found.</div>
              )}
            </div>
          )}

          {selectedTab === 'jobs' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(j => (
                <div key={j.id} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="font-extrabold text-slate-900 text-lg">{j.title}</p>
                    <p className="text-sm font-semibold text-emerald-600">{j.company_name}</p>
                    <div className="flex flex-wrap items-center gap-x-4 mt-1 text-xs text-slate-500">
                      <span>Category: <strong className="text-slate-700">{j.role_category}</strong></span>
                      <span>Parish: <strong className="text-slate-700">{j.parish}</strong></span>
                      <span>Status: <strong className={cn("uppercase", j.status === 'open' ? 'text-emerald-600' : 'text-slate-400')}>{j.status}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400">No jobs listed.</div>
              )}
            </div>
          )}

          {selectedTab === 'referrals' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(r => (
                <div key={r.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-900 text-lg">Referral: {r.candidate_name}</p>
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                        r.status === 'pending' && "bg-amber-100 text-amber-800",
                        r.status === 'hired_waiting_pay_periods' && "bg-indigo-100 text-indigo-800",
                        r.status === 'paid_completed' && "bg-emerald-100 text-emerald-800",
                        r.status === 'rejected' && "bg-red-100 text-red-800"
                      )}>
                        {r.status === 'hired_waiting_pay_periods' ? 'Hired / In Waiting' : r.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 pt-1">
                      <div>
                        <strong className="text-slate-900 block text-xs uppercase tracking-wider text-slate-400 mb-1">Referrer (Who Referred)</strong>
                        <p className="font-bold text-slate-800">{r.referrer_name}</p>
                        <p className="text-xs text-slate-500">{r.referrer_email}</p>
                      </div>
                      <div>
                        <strong className="text-slate-900 block text-xs uppercase tracking-wider text-slate-400 mb-1">Candidate Referred</strong>
                        <p className="font-bold text-slate-800">{r.candidate_name}</p>
                        <p className="text-xs text-slate-500">{r.candidate_email}</p>
                      </div>
                    </div>

                    {r.employer_notes && (
                      <div className="mt-3 p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-100 italic">
                        <strong>Admin/Employer Notes:</strong> "{r.employer_notes}"
                      </div>
                    )}
                    <p className="text-[11px] text-slate-400 pt-1">Submitted on: {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  
                  <button 
                    onClick={() => openReferralModal(r)}
                    className="px-5 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
                  >
                    Update status & notes
                  </button>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400">No referral applications found.</div>
              )}
            </div>
          )}

          {selectedTab === 'notifications' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map(n => (
                <div key={n.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                        n.type === 'both' ? 'bg-indigo-100 text-indigo-800' :
                        n.type === 'sms' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      )}>
                        {n.type === 'both' ? '📧 Email & 📱 SMS' : n.type === 'sms' ? '📱 SMS Match Alert' : '📧 Email Match Alert'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Dispatched
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Dispatched: {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {n.recipient_email && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{n.recipient_email}</span>
                        </div>
                      )}
                      {n.recipient_phone && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{n.recipient_phone}</span>
                        </div>
                      )}
                    </div>

                    {n.subject && (
                      <h4 className="text-sm font-bold text-slate-900 pt-1">
                        Subject: <span className="font-semibold text-slate-700">{n.subject}</span>
                      </h4>
                    )}

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                      {n.message}
                    </div>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400">No alert notification logs found.</div>
              )}
            </div>
          )}

          {selectedTab === 'potentials' && (
            <div className="divide-y divide-slate-100">
              {filteredItems.map((p: any) => (
                <div key={p.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                        ⏳ Potential Match
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Submitted: {new Date(p.introduced_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Candidate</p>
                        <p className="text-base font-extrabold text-slate-900">{p.candidate_name}</p>
                        <p className="text-xs text-slate-500 font-medium">Parish: {p.candidate_parish || p.job_parish}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Requested Position</p>
                        <p className="text-base font-extrabold text-slate-900">{p.job_title}</p>
                        <p className="text-xs text-slate-500 font-medium">{p.company_name} • {p.job_parish} Parish</p>
                      </div>
                    </div>

                    {p.note && (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-600 italic">
                        " {p.note} "
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col md:flex-row gap-2 md:items-center">
                    <button
                      onClick={() => handleRejectMatch(p.id)}
                      className="px-5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 md:flex-initial"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleConfirmMatch(p.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 cursor-pointer flex-1 md:flex-initial"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve & Match</span>
                    </button>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="p-16 text-center text-slate-400 font-medium">
                  No potential matches currently under review.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Candidate details modal dialog */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedCandidate(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">{selectedCandidate.full_name}</h2>
                    <p className="text-slate-500 font-medium">{selectedCandidate.parish} Parish</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    try {
                      const specialties = typeof selectedCandidate.role_specialties === 'string' 
                        ? JSON.parse(selectedCandidate.role_specialties) 
                        : selectedCandidate.role_specialties;
                      return (Array.isArray(specialties) ? specialties : []).map((s: string) => (
                        <span key={s} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                          {s}
                        </span>
                      ));
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedCandidate.email || "No email provided"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{selectedCandidate.phone || "No phone provided"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Profile Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Briefcase className="w-4 h-4" />
                      <span>Status: <span className="font-bold text-emerald-600 uppercase">{selectedCandidate.status}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {new Date(selectedCandidate.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Experience Summary</h3>
                <div className="p-6 bg-slate-50 rounded-3xl text-slate-700 leading-relaxed italic">
                  "{selectedCandidate.experience_summary || "No summary provided."}"
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIntroData({ ...introData, candidate_id: selectedCandidate.id });
                    setShowIntroForm(true);
                    setSelectedCandidate(null);
                  }}
                  className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 cursor-pointer"
                >
                  Create Introduction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Employer details modal dialog */}
      <AnimatePresence>
        {selectedEmployer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedEmployer(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedEmployer(null)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">{selectedEmployer.company_name}</h2>
                    <p className="text-slate-500 font-medium">{selectedEmployer.parish} Parish</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Person</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <User className="w-4 h-4" />
                      <span>{selectedEmployer.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{selectedEmployer.email || "No email provided"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{selectedEmployer.phone || "No phone provided"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Verification & Status</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Agreement Status: <span className="font-bold text-emerald-600">SIGNED</span></span>
                    </div>
                    {selectedEmployer.accepted_agreement_at && (
                      <div className="flex items-center gap-3 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">Signed at: {new Date(selectedEmployer.accepted_agreement_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedEmployer.website && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Company Website</h3>
                  <a 
                    href={selectedEmployer.website} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
                  >
                    <span>{selectedEmployer.website}</span>
                  </a>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Referral update modal dialog */}
      <AnimatePresence>
        {selectedReferral && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSelectedReferral(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 md:p-10 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedReferral(null)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>

              <h2 className="text-2xl font-bold text-slate-900 mb-6">Update Referral status</h2>
              
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm space-y-1">
                <p><strong className="text-slate-500">Candidate:</strong> {selectedReferral.candidate_name} ({selectedReferral.candidate_email})</p>
                <p><strong className="text-slate-500">Referrer:</strong> {selectedReferral.referrer_name} ({selectedReferral.referrer_email})</p>
              </div>

              <form onSubmit={handleReferralStatusUpdate} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Referral Status</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    value={referralStatus}
                    onChange={e => setReferralStatus(e.target.value)}
                  >
                    <option value="pending">Pending Review</option>
                    <option value="hired_waiting_pay_periods">Hired / Waiting on Pay Periods</option>
                    <option value="paid_completed">Paid / Completed</option>
                    <option value="rejected">Rejected / Invalid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Employer/Admin Notes</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-sm"
                    value={referralNotes}
                    onChange={e => setReferralNotes(e.target.value)}
                    placeholder="Add details on hiring status, compensation reviews, tracking codes, or verification steps..."
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedReferral(null)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const PayPalPaymentModal = ({ invoice, onClose, onSuccess }: { invoice: any, onClose: () => void, onSuccess: () => void }) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
        if (data.paypalClientId) {
          loadPayPalSdk(data.paypalClientId);
        }
      })
      .catch(err => {
        console.error("Failed to load payment config", err);
        setLoading(false);
      });
  }, [invoice]);

  const loadPayPalSdk = (clientId: string) => {
    const scriptId = "paypal-sdk-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      setSdkReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      setSdkReady(true);
    };
    script.onerror = () => {
      setErrorMessage("Failed to load PayPal Payment SDK.");
    };
    document.body.appendChild(script);
  };

  useEffect(() => {
    if (sdkReady && config?.paypalClientId) {
      // @ts-ignore
      if (window.paypal) {
        // @ts-ignore
        window.paypal.Buttons({
          createOrder: async () => {
            try {
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId: invoice.id })
              });
              const order = await res.json();
              if (order.id) {
                return order.id;
              } else {
                throw new Error(order.error || "Failed to create PayPal order");
              }
            } catch (err: any) {
              setErrorMessage(err.message);
              throw err;
            }
          },
          onApprove: async (data: any) => {
            setPaying(true);
            try {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID, invoiceId: invoice.id })
              });
              const capture = await res.json();
              if (capture.status === "COMPLETED") {
                onSuccess();
              } else {
                setErrorMessage(capture.error || "Payment capture failed");
              }
            } catch (err: any) {
              setErrorMessage(err.message);
            } finally {
              setPaying(false);
            }
          },
          onError: (err: any) => {
            console.error("PayPal Error", err);
            setErrorMessage("An error occurred with PayPal checkout.");
          }
        }).render("#paypal-button-container");
      }
    }
  }, [sdkReady, config]);

  const simulatePayment = async () => {
    setPaying(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/simulate-pay`, {
        method: "POST"
      });
      if (res.ok) {
        onSuccess();
      } else {
        setErrorMessage("Failed to simulate payment.");
      }
    } catch (err) {
      setErrorMessage("Network error during simulation.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">Invoice Payment</h2>
        <p className="text-slate-600 mb-6">Payment for placement invoice <span className="font-mono text-xs text-slate-500">#{invoice.id.substring(0, 8)}</span></p>

        <div className="divide-y divide-slate-100 mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="pb-3 flex justify-between">
            <span className="text-slate-500 font-medium text-sm">Candidate</span>
            <span className="font-bold text-slate-800 text-sm">{invoice.candidate_name}</span>
          </div>
          <div className="py-3 flex justify-between">
            <span className="text-slate-500 font-medium text-sm">Job Position</span>
            <span className="font-bold text-slate-800 text-sm">{invoice.job_title}</span>
          </div>
          <div className="pt-3 flex justify-between">
            <span className="text-slate-800 font-bold">Total Placement Fee</span>
            <span className="font-extrabold text-emerald-600 text-lg">${(invoice.amount_cents / 100).toLocaleString()}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {config?.paypalClientId ? (
              <div id="paypal-button-container" className="w-full" />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed mb-4">
                  <strong>PayPal Integration Status:</strong> Live/Sandbox PayPal credentials are not configured in your Environment Secrets. To receive real/sandbox payments into your PayPal Business account, set <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> in the Secrets tab.
                </div>
                <button
                  onClick={simulatePayment}
                  disabled={paying}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {paying ? "Processing..." : "Simulate Successful PayPal Payment"}
                </button>
              </div>
            )}
            
            <button
              onClick={onClose}
              disabled={paying}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


const EmployerAgreement = () => {
  const navigate = useNavigate();

  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-4">
      <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200">
        <h1 className="text-3xl font-bold mb-8">Employer Services Agreement</h1>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <p className="font-bold text-slate-900">Amber’s Healthcare – Employer Services Agreement</p>
          <ol className="list-decimal pl-5 space-y-4">
            <li><strong>Services:</strong> Amber’s Healthcare (“Company”) provides recruitment and candidate introduction services only. Company does not employ, supervise, direct, or control candidates and does not provide staffing or temporary labor services.</li>
            <li><strong>Hiring Authority:</strong> All hiring decisions, compensation terms, schedules, supervision, and termination decisions are made solely by the Employer. Company has no authority over employment conditions.</li>
            <li><strong>Placement Fee:</strong> Employer agrees to pay a flat placement fee of <strong>$4,500</strong> if Employer hires, engages, or contracts with a candidate introduced by Company within <strong>twelve (12) months</strong> of introduction.</li>
            <li><strong>Fee Trigger:</strong> A placement fee is due upon Employer confirming a hire through the platform, or Employer engaging the candidate outside the platform after introduction.</li>
            <li><strong>Payment Terms:</strong> Invoices are due upon receipt. Company may suspend services for non-payment.</li>
            <li><strong>Non-Circumvention:</strong> Employer agrees not to bypass Company to avoid placement fees by engaging introduced candidates directly or indirectly.</li>
            <li><strong>No Employment Relationship:</strong> Nothing in this Agreement creates an employment, joint employment, partnership, or agency relationship between Company and any candidate.</li>
            <li><strong>$100 Referral Fee Program:</strong> Anyone may submit a referral for a potential candidate. If that referred candidate is actively hired by the Employer, the referrer receives a <strong>$100</strong> referral fee. This referral fee is paid only after the referred employee successfully completes <strong>two (2) full pay periods</strong>. Employer agrees to update the candidate's active employment status in their employer portal to ensure accurate and timely payout to the referrer. Referrers are not required to be registered employees or employers, and there is no limit to the number of referral fees a single referrer may earn.</li>
            <li><strong>Compliance:</strong> Employer agrees to comply with all applicable federal, state, and local employment and anti-discrimination laws.</li>
            <li><strong>Limitation of Liability:</strong> Company makes no guarantee regarding candidate performance or retention.</li>
            <li><strong>Governing Law:</strong> This Agreement is governed by the laws of the State of Louisiana.</li>
          </ol>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
          <button 
            onClick={async () => {
              await fetch("/api/employers/accept-agreement", { method: "POST" });
              navigate("/employer");
            }}
            className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer"
          >
            I Accept the Agreement
          </button>
        </div>
      </div>
    </div>
  );
};

const CandidateTerms = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'candidate') {
      fetch("/api/candidates/me")
        .then(res => res.ok ? res.json() : null)
        .then(data => setCandidate(data))
        .catch(err => console.error("Error fetching candidate", err));
    }
  }, [user]);

  return (
    <div className="pt-32 pb-24 max-w-3xl mx-auto px-4">
      <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200">
        <h1 className="text-3xl font-bold mb-8">Candidate Terms & Conditions</h1>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <p className="font-bold text-slate-900">Amber’s Healthcare – Candidate Terms & Conditions</p>
          <ul className="list-disc pl-5 space-y-4">
            <li><strong>Services:</strong> Amber’s Healthcare provides recruitment, career guidance, and candidate introduction services to local clinics and practices.</li>
            <li><strong>No Charge:</strong> Candidates are never charged any fees for job placement, resume review, or introduction services.</li>
            <li><strong>$100 Referral Fee Program:</strong> Anyone is welcome to refer healthcare administrative talent to our platform. If your referred candidate gets actively hired by an employer and completes <strong>two (2) full pay periods</strong>, the referrer receives a <strong>$100</strong> cash referral fee. The hiring employer will log this in their portal, and the referrer does not need to have a registered employee or employer account to collect. There is no limit to how many referral fees a single referrer can receive.</li>
            <li><strong>Employment Relationship:</strong> Amber’s Healthcare does not employ, manage, or direct candidates. Any employment offer or contract will be directly between you and the hiring employer.</li>
            <li><strong>No Placement Guarantee:</strong> While we actively match profiles with open listings, Amber’s Healthcare does not guarantee job placement or interviews.</li>
            <li><strong>Accurate Information:</strong> You agree to provide true, accurate, and up-to-date resume and specialty information.</li>
            <li><strong>Local Only:</strong> Candidates must be physically located within our allowed Baton Rouge region parishes.</li>
          </ul>
        </div>
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-slate-500">
            {candidate?.accepted_terms_at ? (
              <span className="text-emerald-600 font-bold">✓ Terms accepted on {new Date(candidate.accepted_terms_at).toLocaleDateString()}</span>
            ) : (
              "Please accept terms to complete your onboarding"
            )}
          </span>
          {user?.role === 'candidate' && !candidate?.accepted_terms_at && (
            <button 
              onClick={async () => {
                await fetch("/api/candidates/accept-terms", { method: "POST" });
                navigate("/candidate");
              }}
              className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all cursor-pointer"
            >
              I Accept the Terms
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

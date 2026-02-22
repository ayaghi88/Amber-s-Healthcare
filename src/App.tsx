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
  Sparkles
} from "lucide-react";
import { cn } from "./lib/utils";
import { ALLOWED_PARISHES, ROLE_CATEGORIES, PRICING } from "./constants";

// --- Types ---
interface User {
  id: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
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
  const { user, logout } = useAuth();
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
            {user ? (
              <div className="flex items-center gap-4">
                <Link 
                  to={user.role === 'admin' ? '/admin' : user.role === 'employer' ? '/employer' : '/candidate'} 
                  className="text-slate-600 hover:text-emerald-600 font-medium transition-colors"
                >
                  Dashboard
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
              {user ? (
                <>
                  <Link to="/dashboard" className="block text-lg font-medium text-slate-700" onClick={() => setIsOpen(false)}>Dashboard</Link>
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

  const login = (user: User) => setUser(user);
  const logout = () => setUser(null);

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
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// --- Auth Pages ---

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.user) {
      login(data.user);
      navigate(data.user.role === 'admin' ? '/admin' : data.user.role === 'employer' ? '/employer' : '/candidate');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="pt-32 pb-24 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Welcome Back</h2>
        {error && <p className="text-red-600 mb-4 text-center text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-slate-600">
          Don't have an account? <Link to="/register" className="text-emerald-600 font-bold">Register</Link>
        </p>
      </div>
    </div>
  );
};

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'candidate' | 'employer'>('candidate');
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });
    const data = await res.json();
    if (data.user) {
      login(data.user);
      navigate(role === 'employer' ? '/employer' : '/candidate');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="pt-32 pb-24 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Create Account</h2>
        {error && <p className="text-red-600 mb-4 text-center text-sm">{error}</p>}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
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
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    parish: ALLOWED_PARISHES[0],
    role_specialties: [] as string[],
    experience_summary: ""
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/candidates/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="pt-32 pb-24 max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 bg-emerald-600 text-white">
          <h1 className="text-3xl font-bold">Candidate Profile</h1>
          <p className="opacity-90">Complete your profile to be matched with local healthcare employers.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                value={profile.full_name}
                onChange={e => setProfile({...profile, full_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
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
            <label className="block text-sm font-bold text-slate-700 mb-2">Specialties</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="block text-sm font-bold text-slate-700 mb-2">Experience Summary</label>
            <textarea 
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              value={profile.experience_summary}
              onChange={e => setProfile({...profile, experience_summary: e.target.value})}
              placeholder="Briefly describe your healthcare administrative background..."
            />
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-slate-500 italic">"Candidates are never charged for placement."</p>
            <button type="submit" className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
              {success ? "Saved!" : "Update Profile"}
            </button>
          </div>
        </form>
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
    role_category: ROLE_CATEGORIES[0]
  });
  const [jobs, setJobs] = useState<any[]>([]);
  const [intros, setIntros] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showJobForm, setShowJobForm] = useState(false);
  const [employer, setEmployer] = useState<any>(null);
  const [hiringIntro, setHiringIntro] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [selectedJobMatches, setSelectedJobMatches] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);

  const fetchData = async () => {
    const [empRes, jobsRes, introsRes, invRes] = await Promise.all([
      fetch("/api/employers/me"),
      fetch("/api/employers/jobs"),
      fetch("/api/employers/introductions"),
      fetch("/api/employers/invoices")
    ]);
    const empData = await empRes.json();
    setEmployer(empData);
    if (empData) setProfile(empData);
    setJobs(await jobsRes.json());
    setIntros(await introsRes.json());
    setInvoices(await invRes.json());
  };

  const fetchMatches = async (jobId: string) => {
    const res = await fetch(`/api/jobs/${jobId}/matches`);
    const data = await res.json();
    setMatches(data);
    setSelectedJobMatches(jobId);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await fetch("/api/employers/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    fetchData();
  };

  const handleJobSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });
    if (res.ok) {
      setShowJobForm(false);
      setJob({ title: "", description: "", parish: ALLOWED_PARISHES[0], role_category: ROLE_CATEGORIES[0] });
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
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none"
                  value={profile.company_name}
                  onChange={e => setProfile({...profile, company_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contact Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none"
                  value={profile.contact_name}
                  onChange={e => setProfile({...profile, contact_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parish</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none"
                  value={profile.parish}
                  onChange={e => setProfile({...profile, parish: e.target.value})}
                >
                  {ALLOWED_PARISHES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all">
                Save Profile
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">Job Title</label>
                      <input 
                        type="text" 
                        required 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea 
                      rows={4}
                      required 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                      value={job.description}
                      onChange={e => setJob({...job, description: e.target.value})}
                    />
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
                    <p className="text-sm text-slate-600 mb-4 font-medium">For: {i.job_title}</p>
                    <p className="text-sm text-slate-500 line-clamp-2">{i.experience_summary}</p>
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
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No invoices generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* Hire Modal */}
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
      </AnimatePresence>
    </div>
  );
};

const JobBoard = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/jobs")
      .then(res => res.json())
      .then(data => setJobs(data));
  }, []);

  return (
    <div className="pt-32 pb-24 max-w-5xl mx-auto px-4">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Remote Admin Jobs</h1>
        <p className="text-xl text-slate-600">Baton Rouge & surrounding areas only.</p>
      </div>

      <div className="space-y-6">
        {jobs.length > 0 ? jobs.map(job => (
          <div key={job.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-emerald-200 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold mb-2 uppercase tracking-wider">
                  {job.role_category}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{job.title}</h2>
                <p className="text-slate-500 font-medium">{job.company_name} • {job.parish} Parish</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <ShieldCheck className="w-5 h-5" />
                <span>Remote</span>
              </div>
            </div>
            <p className="text-slate-600 mb-6 line-clamp-2">{job.description}</p>
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4" />
                <span>Baton Rouge Region</span>
              </div>
              <Link to="/register" className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all">
                Apply Now
              </Link>
            </div>
          </div>
        )) : (
          <div className="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500">No active jobs at the moment. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalHires: 0, activeJobs: 0, totalRevenue: 0 });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [showIntroForm, setShowIntroForm] = useState(false);
  const [introData, setIntroData] = useState({ job_id: "", candidate_id: "", note: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const fetchData = async () => {
    const [statsRes, candRes, jobsRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/candidates"),
      fetch("/api/admin/jobs")
    ]);
    setStats(await statsRes.json());
    setCandidates(await candRes.json());
    setJobs(await jobsRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIntroSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/introductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(introData)
    });
    if (res.ok) {
      setShowIntroForm(false);
      setIntroData({ job_id: "", candidate_id: "", note: "" });
      fetchData();
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.parish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (user?.role !== 'admin') return <div className="pt-32 text-center">Unauthorized</div>;

  return (
    <div className="pt-32 pb-24 max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <button 
          onClick={() => setShowIntroForm(true)}
          className="px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
        >
          Create Introduction
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Total Hires</h3>
          <p className="text-4xl font-extrabold text-slate-900">{stats.totalHires}</p>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Active Jobs</h3>
          <p className="text-4xl font-extrabold text-slate-900">{stats.activeJobs}</p>
        </div>
        <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 font-bold uppercase text-xs mb-2">Total Revenue</h3>
          <p className="text-4xl font-extrabold text-emerald-600">${(stats.totalRevenue / 100).toLocaleString()}</p>
        </div>
      </div>

      {showIntroForm && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-emerald-200 mb-12"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">New Introduction</h2>
            <button onClick={() => setShowIntroForm(false)}><X className="w-6 h-6 text-slate-400" /></button>
          </div>
          <form onSubmit={handleIntroSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Job</label>
                <select 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                  value={introData.candidate_id}
                  onChange={e => setIntroData({...introData, candidate_id: e.target.value})}
                >
                  <option value="">-- Choose Candidate --</option>
                  {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.parish})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Admin Note</label>
              <textarea 
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none"
                value={introData.note}
                onChange={e => setIntroData({...introData, note: e.target.value})}
              />
            </div>
            <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all">
              Create Introduction
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold">Candidates ({candidates.length})</h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search name or parish..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredCandidates.map(c => (
              <div 
                key={c.id} 
                className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => setSelectedCandidate(c)}
              >
                <div>
                  <p className="font-bold text-slate-900">{c.full_name}</p>
                  <p className="text-xs text-slate-500">{c.parish} Parish</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-bold text-emerald-600 uppercase">{c.status}</div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
            {filteredCandidates.length === 0 && (
              <div className="p-12 text-center text-slate-400">No candidates found.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold">Jobs ({jobs.length})</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {jobs.map(j => (
              <div key={j.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{j.title}</p>
                  <p className="text-xs text-slate-500">{j.company_name}</p>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase">{j.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Detail Modal */}
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
                  {JSON.parse(selectedCandidate.role_specialties || "[]").map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      {s}
                    </span>
                  ))}
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
                      <span>Joined: {new Date(selectedCandidate.created_at).toLocaleDateString()}</span>
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
                  className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Create Introduction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const EmployerAgreement = () => (
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
          <li><strong>Compliance:</strong> Employer agrees to comply with all applicable federal, state, and local employment and anti-discrimination laws.</li>
          <li><strong>Limitation of Liability:</strong> Company makes no guarantee regarding candidate performance or retention.</li>
          <li><strong>Governing Law:</strong> This Agreement is governed by the laws of the State of Louisiana.</li>
        </ol>
      </div>
      <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end">
        <button 
          onClick={async () => {
            await fetch("/api/employers/accept-agreement", { method: "POST" });
            window.history.back();
          }}
          className="px-8 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
        >
          I Accept the Agreement
        </button>
      </div>
    </div>
  </div>
);

const CandidateTerms = () => (
  <div className="pt-32 pb-24 max-w-3xl mx-auto px-4">
    <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200">
      <h1 className="text-3xl font-bold mb-8">Candidate Terms</h1>
      <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
        <ul className="list-disc pl-5 space-y-2">
          <li>Amber’s Healthcare provides job matching and candidate introduction services only.</li>
          <li>Candidates are never charged for placement.</li>
          <li>Amber’s Healthcare does not employ candidates.</li>
          <li>All employment relationships are directly between the candidate and the hiring employer.</li>
          <li>Amber’s Healthcare does not guarantee job placement.</li>
          <li>Employers make all hiring decisions independently.</li>
        </ul>
      </div>
    </div>
  </div>
);

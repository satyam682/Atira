import React, { useState } from 'react';
import { Mail, User, ShieldCheck, KeyRound, AlertTriangle, Clock, ChevronRight, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SpikeMark from './SpikeMark';

interface AuthFlowProps {
  onLoginSuccess: (user: any) => void;
  showToast: (msg: string, type?: 'info' | 'success') => void;
}

export default function AuthFlow({ onLoginSuccess, showToast }: AuthFlowProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Simple client-side email validator
  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const safeJson = async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    return { error: text ? (text.length > 200 ? text.substring(0, 200) + '...' : text) : `HTTP Error ${res.status}` };
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email format.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password
        }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        if (data.requiresPassword) {
          setShowAdminPassword(true);
        }
        setErrorMessage(data.error || 'Authentication request failed.');
        setLoading(false);
        return;
      }

      if (data.success && data.user) {
        showToast(`Welcome back, ${data.user.name}!`, 'success');
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to connect to the server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email format.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setErrorMessage(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      if (data.status === 'approved') {
        showToast('Account pre-approved! Logging you in.', 'success');
        // Automatically request direct login for them
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const loginData = await safeJson(loginRes);
        if (loginRes.ok && loginData.success) {
          onLoginSuccess(loginData.user);
        } else {
          setErrorMessage(loginData.error || 'Failed to complete login.');
        }
      } else if (data.status === 'pending') {
        setSuccessMessage("Your request has been sent to the admin. You'll get access after approval.");
      } else if (data.status === 'rejected') {
        setErrorMessage('Your request was declined');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Connection failed. Please verify that your dev server is active.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-canvas font-sans p-6 select-none">
      {/* Visual Logo Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg font-display tracking-tight">
          C
        </div>
        <div className="flex items-baseline">
          <span className="text-xl font-medium tracking-tight text-ink font-display">Conduit</span>
          <span className="text-[10px] bg-surface-cream-strong text-muted px-1.5 py-0.5 rounded font-mono ml-2">v2.1</span>
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl border border-hairline shadow-none max-w-sm w-full p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />

        {/* Title area */}
        <div className="space-y-1.5 mb-6 text-center">
          <h2 className="text-xl font-medium text-ink font-display">
            {mode === 'login' && 'Sign in to Conduit'}
            {mode === 'register' && 'Request Access'}
          </h2>
          <p className="text-xs text-muted-soft leading-relaxed">
            {mode === 'login' && 'Enter your approved email address to access your dashboard.'}
            {mode === 'register' && 'Register your details. Access requires administrator approval.'}
          </p>
        </div>

        {/* Action alerts */}
        {errorMessage && (
          <div className="p-3.5 bg-surface-cream-strong/50 border border-hairline rounded-xl mb-5 flex items-start gap-2.5 text-xs text-primary animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
            <span className="font-medium leading-relaxed text-ink">{errorMessage}</span>
          </div>
        )}

        <AnimatePresence>
          {successMessage && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                className="bg-canvas rounded-2xl p-8 max-w-sm w-full text-center border border-hairline shadow-none relative overflow-hidden"
              >
                {/* Header primary bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                
                <div className="mx-auto w-14 h-14 rounded-full bg-surface-soft text-primary flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <h3 className="text-lg font-medium text-ink font-display">Request Submitted!</h3>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  Your registration request has been securely sent to the administrator. Access will be authorized once approved!
                </p>

                <div className="mt-6">
                  <button
                    onClick={() => { setSuccessMessage(null); setMode('login'); setPassword(''); setShowAdminPassword(false); }}
                    className="w-full py-2.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold active:scale-98 transition-all cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Forms */}
        {mode === 'login' && !successMessage && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink block font-sans">Email Address</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-muted-soft absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (showAdminPassword) {
                      setShowAdminPassword(false);
                      setPassword('');
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-hairline rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary transition-all text-body font-sans"
                />
              </div>
            </div>

            {showAdminPassword && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1 mt-3"
              >
                <label className="text-xs font-medium text-ink block font-sans">Admin Security Password</label>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-muted-soft absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-hairline rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary transition-all text-body font-sans"
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-3 border-t border-hairline-soft text-xs text-muted">
              Don't have access yet?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMessage(null); setPassword(''); setShowAdminPassword(false); }}
                className="text-primary hover:text-primary-active underline font-semibold cursor-pointer"
              >
                Request Access here
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink block font-sans">Full Name</label>
              <div className="relative">
                <User className="w-4.5 h-4.5 text-muted-soft absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-hairline rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary transition-all text-body font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink block font-sans">Email Address</label>
              <div className="relative">
                <Mail className="w-4.5 h-4.5 text-muted-soft absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-canvas border border-hairline rounded-lg text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/15 focus:border-primary transition-all text-body font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-active text-white rounded-lg text-xs font-semibold active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
            >
              {loading ? 'Submitting request...' : 'Request Access Credentials'}
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-3 border-t border-hairline-soft text-xs text-muted">
              Already have access?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(null); setPassword(''); setShowAdminPassword(false); }}
                className="text-primary hover:text-primary-active underline font-semibold cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Visual footer details */}
      <span className="mt-8 text-[11px] text-muted-soft flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5 text-primary" /> Secured by Conduit Gate Middleware
      </span>
    </div>
  );
}

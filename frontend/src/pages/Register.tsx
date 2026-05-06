import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// ─── Same background as Login ─────────────────────────────────────────────────
function LandscapeBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080808" />
          <stop offset="60%" stopColor="#181818" />
          <stop offset="100%" stopColor="#282828" />
        </linearGradient>
        <linearGradient id="mtn3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1e1e" />
          <stop offset="100%" stopColor="#101010" />
        </linearGradient>
        <linearGradient id="mtn4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#282828" />
          <stop offset="100%" stopColor="#141414" />
        </linearGradient>
        <radialGradient id="glow2" cx="50%" cy="40%" r="30%">
          <stop offset="0%" stopColor="#383838" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#080808" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#sky2)" />
      <ellipse cx="720" cy="380" rx="500" ry="200" fill="url(#glow2)" />

      {/* Stars */}
      {[
        [100,50],[220,35],[380,75],[520,25],[670,50],[820,20],[970,65],[1120,40],[1270,55],[1400,30],
        [70,110],[310,95],[460,125],[610,85],[760,110],[910,90],[1060,120],[1210,100],[1360,85],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1} fill="white" opacity={0.25 + (i % 5) * 0.1} />
      ))}

      <path d="M0 520 L180 280 L360 420 L540 260 L720 380 L900 240 L1080 360 L1260 280 L1440 400 L1440 900 L0 900Z"
        fill="url(#mtn3)" opacity="0.7" />
      <path d="M0 600 L120 420 L280 520 L440 380 L600 480 L760 360 L920 460 L1080 400 L1240 500 L1440 440 L1440 900 L0 900Z"
        fill="url(#mtn4)" opacity="0.85" />

      {[50, 100, 145, 185, 220].map((x, i) => (
        <g key={`lp${i}`} transform={`translate(${x}, ${625 - i * 8})`}>
          <polygon points="0,-70 18,0 -18,0" fill="#1a1a1a" opacity="0.9" />
          <polygon points="0,-50 14,10 -14,10" fill="#222" opacity="0.8" />
          <rect x="-4" y="0" width="8" height="18" fill="#111" />
        </g>
      ))}
      {[1390, 1340, 1295, 1255, 1220].map((x, i) => (
        <g key={`rp${i}`} transform={`translate(${x}, ${625 - i * 8})`}>
          <polygon points="0,-70 18,0 -18,0" fill="#1a1a1a" opacity="0.9" />
          <polygon points="0,-50 14,10 -14,10" fill="#222" opacity="0.8" />
          <rect x="-4" y="0" width="8" height="18" fill="#111" />
        </g>
      ))}

      <ellipse cx="80" cy="700" rx="60" ry="35" fill="#181818" opacity="0.9" />
      <ellipse cx="180" cy="710" rx="50" ry="30" fill="#1e1e1e" opacity="0.85" />
      <ellipse cx="1360" cy="700" rx="60" ry="35" fill="#181818" opacity="0.9" />
      <ellipse cx="1260" cy="710" rx="50" ry="30" fill="#1e1e1e" opacity="0.85" />

      <path d="M0 730 Q360 700 720 720 Q1080 740 1440 715 L1440 900 L0 900Z" fill="#0f0f0f" />
      <path d="M200 760 Q720 740 1240 760 L1240 820 Q720 800 200 820Z" fill="#1c1c1c" opacity="0.5" />
    </svg>
  );
}

// ─── Register page ────────────────────────────────────────────────────────────
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(name, email, password);
      void navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      <LandscapeBackground />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div
          className="rounded-2xl px-8 py-10"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Sign Up</h1>
            <p className="mt-2 text-sm text-gray-400">
              Already a member?{' '}
              <Link to="/login" className="text-gray-200 hover:text-white underline underline-offset-2 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form data-testid="register-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-400 mb-2 tracking-widest uppercase">
                Full Name
              </label>
              <input
                id="name"
                data-testid="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Alice Admin"
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-white pb-2 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-400 mb-2 tracking-widest uppercase">
                Email
              </label>
              <input
                id="email"
                data-testid="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-white pb-2 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-400 mb-2 tracking-widest uppercase">
                Password
              </label>
              <input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-white pb-2 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            <button
              data-testid="register-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-black font-semibold rounded-xl text-sm tracking-wide transition-all duration-200 shadow-lg shadow-black/30"
            >
              {isLoading ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or sign up with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-gray-300 hover:text-white text-xs font-medium transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#9ca3af"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#6b7280"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#9ca3af"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#6b7280"/>
              </svg>
              Google
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-gray-300 hover:text-white text-xs font-medium transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

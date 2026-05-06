import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// ─── Animated SVG background (dark monochrome landscape) ─────────────────────
function LandscapeBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="60%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#2a2a2a" />
        </linearGradient>
        <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="100%" stopColor="#111111" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#161616" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#0d0d0d" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="30%">
          <stop offset="0%" stopColor="#3a3a3a" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
        </radialGradient>
        {/* Stars */}
        <filter id="blur2">
          <feGaussianBlur stdDeviation="1" />
        </filter>
      </defs>

      {/* Sky */}
      <rect width="1440" height="900" fill="url(#sky)" />
      {/* Glow behind mountains */}
      <ellipse cx="720" cy="380" rx="500" ry="200" fill="url(#glow)" />

      {/* Stars */}
      {[
        [120,60],[200,40],[350,80],[500,30],[650,55],[800,25],[950,70],[1100,45],[1250,60],[1380,35],
        [80,120],[300,100],[450,130],[600,90],[750,115],[900,95],[1050,125],[1200,105],[1350,90],
        [160,170],[420,155],[580,180],[740,160],[900,175],[1060,150],[1220,170],[1400,155],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={Math.random() > 0.5 ? 1.5 : 1} fill="white" opacity={0.3 + (i % 4) * 0.15} />
      ))}

      {/* Far mountains */}
      <path d="M0 520 L180 280 L360 420 L540 260 L720 380 L900 240 L1080 360 L1260 280 L1440 400 L1440 900 L0 900Z"
        fill="url(#mtn1)" opacity="0.7" />

      {/* Mid mountains */}
      <path d="M0 600 L120 420 L280 520 L440 380 L600 480 L760 360 L920 460 L1080 400 L1240 500 L1440 440 L1440 900 L0 900Z"
        fill="url(#mtn2)" opacity="0.85" />

      {/* Left pine trees */}
      {[60, 110, 155, 195, 230].map((x, i) => (
        <g key={`lp${i}`} transform={`translate(${x}, ${620 - i * 8})`}>
          <polygon points="0,-70 18,0 -18,0" fill="#1a1a1a" opacity="0.9" />
          <polygon points="0,-50 14,10 -14,10" fill="#222222" opacity="0.8" />
          <rect x="-4" y="0" width="8" height="18" fill="#111111" />
        </g>
      ))}

      {/* Right pine trees */}
      {[1380, 1330, 1285, 1245, 1210].map((x, i) => (
        <g key={`rp${i}`} transform={`translate(${x}, ${620 - i * 8})`}>
          <polygon points="0,-70 18,0 -18,0" fill="#1a1a1a" opacity="0.9" />
          <polygon points="0,-50 14,10 -14,10" fill="#222222" opacity="0.8" />
          <rect x="-4" y="0" width="8" height="18" fill="#111111" />
        </g>
      ))}

      {/* Round bushes left */}
      <ellipse cx="80" cy="700" rx="60" ry="35" fill="#181818" opacity="0.9" />
      <ellipse cx="180" cy="710" rx="50" ry="30" fill="#1e1e1e" opacity="0.85" />

      {/* Round bushes right */}
      <ellipse cx="1360" cy="700" rx="60" ry="35" fill="#181818" opacity="0.9" />
      <ellipse cx="1260" cy="710" rx="50" ry="30" fill="#1e1e1e" opacity="0.85" />

      {/* Foreground ground */}
      <path d="M0 730 Q360 700 720 720 Q1080 740 1440 715 L1440 900 L0 900Z"
        fill="#0f0f0f" />

      {/* Water / lake reflection */}
      <path d="M200 760 Q720 740 1240 760 L1240 820 Q720 800 200 820Z"
        fill="url(#water)" opacity="0.5" />

      {/* Reflection shimmer lines */}
      {[0, 1, 2].map((i) => (
        <line key={`sh${i}`}
          x1={500 + i * 120} y1={775 + i * 8}
          x2={700 + i * 120} y2={775 + i * 8}
          stroke="white" strokeWidth="1" opacity="0.06" />
      ))}

      {/* Clouds */}
      {[
        { cx: 200, cy: 130, rx: 80, ry: 20 },
        { cx: 350, cy: 110, rx: 60, ry: 15 },
        { cx: 1100, cy: 140, rx: 90, ry: 22 },
        { cx: 1250, cy: 120, rx: 65, ry: 16 },
      ].map((c, i) => (
        <ellipse key={`cl${i}`} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
          fill="white" opacity="0.06" />
      ))}
    </svg>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      void navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center">
      {/* Illustrated background */}
      <LandscapeBackground />

      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      {/* Glass card */}
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
          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Sign In</h1>
            <p className="mt-2 text-sm text-gray-400">
              New here?{' '}
              <Link to="/register" className="text-gray-200 hover:text-white underline underline-offset-2 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* Form */}
          <form data-testid="login-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-7">
            {/* Email */}
            <div className="group">
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
                autoComplete="email"
                placeholder="alice@tms.dev"
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-white pb-2 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div className="group">
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
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-white pb-2 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 bg-white hover:bg-gray-100 disabled:opacity-50 text-black font-semibold rounded-xl text-sm tracking-wide transition-all duration-200 shadow-lg shadow-black/30"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social placeholders */}
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-gray-300 hover:text-white text-xs font-medium transition-all">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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

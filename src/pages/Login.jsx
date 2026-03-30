import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck, RotateCcw } from 'lucide-react'
import { supabase } from "../../database/supabase"
import { logAudit } from '../services/auditLogService'

let loginLogoUrl
try {
  loginLogoUrl = new URL('../assets/images/Sidebar.png', import.meta.url).href
} catch {
  loginLogoUrl = '/image/Sidebar.png'
}

const ALLOWED_EMAIL = import.meta.env.VITE_ADMIN_ACCOUNT;
const PROTECTED_2FA_EMAIL = "findepartment0@gmail.com";
const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1/send-2fa-code";

// ── LOGIN STATES ──────────────────────────────────────────────
// 'credentials' → normal email/password form
// 'otp'         → 2FA code input (only for PROTECTED_2FA_EMAIL)
// 'loading'     → splash overlay

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // ── STEP 1: Handle initial login & trigger 2FA if needed ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    console.log('[LOGIN] Step 1: handleLogin fired', { email, ALLOWED_EMAIL });

    // Pre-flight: block non-admin emails (only if env var is configured)
    if (ALLOWED_EMAIL && email !== ALLOWED_EMAIL) {
      console.log('[LOGIN] Step 1 FAIL: email not in allowed list');
      setErrorMessage("Unauthorized Access: Invalid admin credentials.");
      logAudit('UNAUTHORIZED_LOGIN_ATTEMPT', { attempted_email: email }, 'SECURITY');
      setLoading(false);
      return;
    }

    try {
      console.log('[LOGIN] Step 2: calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[LOGIN] Step 2 result:', { data, error });

      if (error) {
        setErrorMessage(error.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Post-login: double-check the session email (only if env var is configured)
      if (ALLOWED_EMAIL && data?.user?.email !== ALLOWED_EMAIL) {
        console.log('[LOGIN] Step 3 FAIL: email mismatch after login');
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        logAudit('LOGIN_BYPASS_PREVENTED', { user_id: data.user.id, email: data.user.email }, 'SECURITY');
        setErrorMessage("Security Breach Prevented: Unauthorized account detected.");
        setLoading(false);
        return;
      }

      console.log('[LOGIN] Step 3: credentials OK, checking 2FA...');

      // ── 2FA GATE ─────────────────────────────────────────────
      if (email === PROTECTED_2FA_EMAIL) {
        console.log('[LOGIN] Step 4: 2FA required, signing out temporarily...');
        await supabase.auth.signOut();

        try {
          const res = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ email, action: 'send' }),
          });
          const result = await res.json();
          console.log('[LOGIN] Step 4 OTP result:', result);

          if (!result.sent) {
            setErrorMessage("Failed to send verification code. Please try again.");
            setLoading(false);
            return;
          }
        } catch (fetchErr) {
          console.error('[LOGIN] Step 4 fetch error:', fetchErr);
          setErrorMessage("Could not reach verification server. Please try again.");
          setLoading(false);
          return;
        }

        logAudit('2FA_CODE_SENT', { email }, 'SECURITY');
        setLoading(false);
        setStep('otp');
        startResendCooldown();
        return;
      }

      // ── Non-2FA: navigate immediately ─────
      console.log('[LOGIN] Step 5: navigating to /dashboard...');
      logAudit('ADMIN_LOGIN_SUCCESS', { email }, 'AUTH', { module: 'Authentication', status: 'SUCCESS' });
      navigate('/dashboard');

    } catch (err) {
      console.error('[LOGIN] CATCH error:', err);
      setErrorMessage("System error during authentication.");
      setLoading(false);
    }
  };

  // ── STEP 2: Verify OTP then re-authenticate ───────────────
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Verify the OTP via Edge Function
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, action: 'verify', code: otpCode }),
      });
      const result = await res.json();

      if (!result.valid) {
        setErrorMessage("Invalid or expired verification code. Please try again.");
        setLoading(false);
        return;
      }

      // OTP valid → re-authenticate to restore the session
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("Re-authentication failed. Please go back and try again.");
        setLoading(false);
        return;
      }

      logAudit('2FA_LOGIN_SUCCESS', { email }, 'AUTH', { module: 'Authentication', status: 'SUCCESS' });
      setLoading(true);
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (err) {
      console.error(err.message);
      setErrorMessage("System error during verification.");
      setLoading(false);
    }
  };

  // ── Resend cooldown timer (60s) ───────────────────────────
  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage('');
    try {
      await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email, action: 'send' }),
      });
      startResendCooldown();
    } catch {
      setErrorMessage("Failed to resend code.");
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setOtpCode('');
    setErrorMessage('');
  };

  return (
    <>
      <style>{`
        @keyframes float1 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40vw, 20vh) scale(1.3); }
          66% { transform: translate(10vw, 50vh) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float2 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30vw, -30vh) scale(1.2); }
          66% { transform: translate(-50vw, 10vh) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float3 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30vw, -40vh) scale(1.4); }
          66% { transform: translate(-20vw, -20vh) scale(0.8); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .animate-float-fast-1 { animation: float1 6s infinite alternate ease-in-out; }
        .animate-float-fast-4 { animation: float1 9s infinite alternate-reverse ease-in-out; }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.4s ease-out forwards; }

        .otp-input {
          letter-spacing: 0.5em;
          font-size: 1.5rem;
          font-weight: 800;
          text-align: center;
        }
      `}</style>

      {/* SPLASH LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="flex flex-col items-center animate-pulse">
            <img src={loginLogoUrl} alt="Loading..." className="h-28 md:h-36 w-auto object-contain drop-shadow-2xl" />
            <span className="mt-4 text-sm font-bold uppercase text-[#2ecc71]" style={{ letterSpacing: '0.28em' }}>
              Financial System
            </span>
          </div>
        </div>
      )}

      {/* MAIN UI */}
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#e8f5e9]">
        <div className="absolute inset-0 z-0 filter blur-[80px] opacity-80 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-400 animate-float-fast-1"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-green-400 animate-float-fast-4"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white/50 p-8 md:p-10">

            {/* ── LOGO ── */}
            <div className="flex flex-col items-center mb-10">
              <img src={loginLogoUrl} alt="Logo" className="h-24 w-auto drop-shadow-sm" />
              <span className="mt-3 text-[11px] font-black uppercase text-[#2ecc71]" style={{ letterSpacing: '0.28em' }}>
                Financial System
              </span>
            </div>

            {/* ── ERROR MESSAGE ── */}
            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-red-50/90 border border-red-100 text-red-600">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">{errorMessage}</p>
              </div>
            )}

            {/* ════════════════════════════════════════
                STEP 1: CREDENTIALS FORM
            ════════════════════════════════════════ */}
            {step === 'credentials' && (
              <form onSubmit={handleLogin} className="space-y-6 slide-up">
                <div>
                  <label className="block text-sm font-extrabold text-gray-800 mb-2 pl-4 uppercase tracking-widest">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                      className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-white bg-white/60 text-sm font-bold outline-none focus:border-[#2ecc71] text-gray-900"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-gray-800 mb-2 pl-4 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                      className="w-full pl-12 pr-12 py-4 rounded-full border-2 border-white bg-white/60 text-sm font-bold outline-none focus:border-[#2ecc71] text-gray-900"
                      placeholder="Enter your password"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2ecc71]">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-full text-white font-bold text-sm uppercase tracking-widest bg-slate-800 hover:bg-[#2ecc71] transition-all">
                  Authenticate <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}

            {/* ════════════════════════════════════════
                STEP 2: OTP VERIFICATION FORM
            ════════════════════════════════════════ */}
            {step === 'otp' && (
              <form onSubmit={handleOtpVerify} className="space-y-6 slide-up">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-2">
                  <div className="w-14 h-14 rounded-full bg-[#e8f5e9] flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-[#2ecc71]" />
                  </div>
                  <h2 className="text-lg font-black text-gray-800 uppercase tracking-widest">2-Step Verification</h2>
                  <p className="text-xs text-gray-500 mt-2 font-semibold">
                    A 6-digit code was sent to<br />
                    <span className="text-gray-700 font-extrabold">{email}</span>
                  </p>
                </div>

                {/* OTP Input */}
                <div>
                  <label className="block text-sm font-extrabold text-gray-800 mb-2 pl-4 uppercase tracking-widest">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setErrorMessage(''); }}
                    className="otp-input w-full px-4 py-4 rounded-full border-2 border-white bg-white/60 outline-none focus:border-[#2ecc71] text-gray-900"
                    placeholder="000000"
                    required
                  />
                </div>

                {/* Verify Button */}
                <button
                  type="submit"
                  disabled={otpCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-full text-white font-bold text-sm uppercase tracking-widest bg-slate-800 hover:bg-[#2ecc71] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Verify & Enter <ShieldCheck className="w-5 h-5" />
                </button>

                {/* Resend + Back */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" /> Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-1 text-xs font-bold text-[#2ecc71] hover:text-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-8 text-center text-[11px] font-bold text-gray-500">Copyright © 2026 Envirocab - All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
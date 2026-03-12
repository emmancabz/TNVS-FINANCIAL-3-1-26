import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, ArrowRight, Moon, RefreshCw } from 'lucide-react'

let loginLogoUrl
try {
  loginLogoUrl = new URL('../assets/images/Sidebar.png', import.meta.url).href
} catch {
  loginLogoUrl = '/image/Sidebar.png'
}

import { supabase } from "../../database/supabase";

const ALLOWED_EMAIL = import.meta.env.VITE_ADMIN_ACCOUNT;

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
// If you don't have a toast library, you can use a simple alert for now
  const showToast = (msg) => alert(msg);

  const handleLogin = async (e) => {
  e.preventDefault();

  // 1. Check if fields are empty using your actual state variables
  if (!email || !password) {
    setMessage("Please fill out all fields.");
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email, // Changed from formData.email
      password: password, // Changed from formData.password
    });

    if (error) throw error;

    if (data.user.email !== ALLOWED_EMAIL) {
      await supabase.auth.signOut();
      showToast("Unauthorized Access: Invalid email.", "error");
      setLoading(false);
      return;
    }
    
    setTimeout(() => {
  navigate("/dashboard"); // Gawing lowercase
}, 1000);
  } catch (error) {
    console.error(error.message || "Invalid credentials");
    showToast(error.message || "Invalid credentials", "error");
    setLoading(false);
  }
};

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-[#eef0f2]'}`}>
      <div className="w-full max-w-md relative">
        <div className={`rounded-3xl shadow-lg p-8 md:p-10 transition-colors duration-300 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="absolute top-5 right-5">
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl transition-colors ${darkMode ? 'text-amber-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
              aria-label="Dark mode"
            >
              <Moon className="w-5 h-5" strokeWidth={1.6} />
            </button>
          </div>

          {/* Logo: large, centered, aligned with form */}
          <div className="flex justify-center mb-8">
            <img
              src={loginLogoUrl}
              alt="Logo"
              className="h-24 w-auto max-w-[220px] object-contain object-center"
              style={{ imageRendering: 'auto' }}
              onError={(e) => {
                e.target.style.display = 'none'
                const next = e.target.nextElementSibling
                if (next) next.classList.remove('hidden')
              }}
            />
            <div className="hidden h-24 w-24 rounded-2xl bg-[#2ecc71]/15 items-center justify-center text-[#2ecc71] font-semibold text-2xl">
              TNVS
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.6} />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm outline-none transition-all placeholder-gray-400 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-gray-300 focus:ring-2 focus:ring-gray-200'
                  }`}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" strokeWidth={1.6} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-xl border text-sm outline-none transition-all placeholder-gray-400 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-gray-300 focus:ring-2 focus:ring-gray-200'
                  }`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" strokeWidth={1.6} /> : <Eye className="w-5 h-5" strokeWidth={1.6} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-[#94a3b8] hover:bg-[#64748b] text-white font-bold text-sm uppercase tracking-wider transition-all duration-200 shadow-sm"
            >
              Authenticate
              <ArrowRight className="w-5 h-5" strokeWidth={2.2} />
            </button>
          </form>

          <p className={`mt-6 text-center text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            © 2026 TNVS Finance System
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login


import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { Eye, EyeOff, Home, ArrowRight } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { API_URL } from "../config/api";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    axios
      .post(`${API_URL}/api/v1/login`, {
        email,
        password,
      })
      .then((response) => {
        if (response.data.success) {
          const role = response.data.user.role?.trim().toLowerCase();
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('role', role);
          localStorage.setItem('userToken', response.data.token);
          
          axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
          
          toast.success("Logged in successfully!");
          setTimeout(() => {
            navigate(role === "doctor" ? "/doctor" : "/patient");
          }, 1500);
        } else {
          toast.error(response.data.message || "Invalid credentials!");
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Login failed!");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center pt-24 md:pt-0 pb-12 px-6 bg-[#FAFDEE] dark:bg-[#0a111a] transition-colors duration-300 font-sans relative overflow-x-hidden">
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      {/* Professional Home Button */}
      <Link to="/" className="absolute top-8 left-8 z-20 group">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#1F3A4B]/20 dark:border-white/10 bg-white/50 dark:bg-[#1F3A4B]/20 backdrop-blur-md text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-sm tracking-widest transition-all hover:border-[#1F3A4B] dark:hover:border-[#C2F84F] hover:shadow-lg">
          <Home size={16} />
          <span>BACK HOME</span>
        </div>
      </Link>

      {/* Content Wrapper */}
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] mb-3">
            Login
          </h1>
          <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 font-medium tracking-wide text-base">
            Login to your HealthHub account
          </p>
        </div>
        
        <form 
          onSubmit={onSubmit} 
          className="bg-white dark:bg-[#111827] p-6 md:p-10 rounded-[2.5rem] border border-[#1F3A4B]/10 shadow-2xl backdrop-blur-lg"
        >
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all"
              />
            </div>
            
            <div>
              <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1F3A4B]/40"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#1F3A4B] dark:bg-[#C2F84F] py-4 md:py-5 font-bold text-white dark:text-[#1F3A4B] uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg text-sm md:text-lg flex items-center justify-center gap-2"
            >
              {loading ? "VERIFYING..." : "LOGIN"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
        
        <p className="text-center mt-6 md:mt-8 font-medium text-[#1F3A4B]/90 dark:text-[#FAFDEE]/90 tracking-wide text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#1F3A4B] dark:text-[#C2F84F] font-bold underline decoration-2 underline-offset-4 hover:opacity-70">
            Sign up
          </Link>
        </p>
      </div>

      <ToastContainer 
        position="top-right" 
        autoClose={2000} 
        hideProgressBar 
        theme={localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'}
      />
    </main>
  );
};

export default Login;
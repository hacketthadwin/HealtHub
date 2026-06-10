import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { API_URL } from "../config/api";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /* Decoupled state variable name to prevent execution crashes */
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const navigate = useNavigate();

  const onSubmit = (e) => {
    e.preventDefault();
    setIsSubmitLoading(true);

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
        setIsSubmitLoading(false);
      });
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center pt-24 md:pt-0 pb-12 px-6 bg-[#FAFDEE] dark:bg-[#0a111a] transition-colors duration-300 font-roboto-slab relative overflow-x-hidden antialiased">
      
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      {/* Adaptive Aesthetic Return Navigation */}
      <Link to="/" className="absolute top-6 left-4 md:top-8 md:left-8 z-20 group block">
        <div className="flex items-center justify-center gap-3.5 h-12 w-12 md:h-auto md:w-auto md:px-6 md:py-3.5 rounded-full border border-neutral-200/40 dark:border-white/5 bg-white/40 dark:bg-neutral-950/20 backdrop-blur-md text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-sm font-bold tracking-widest transition-all duration-300 hover:text-emerald-600 dark:hover:text-[#C2F84F] hover:border-neutral-300/60 dark:hover:border-white/20 hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.05)] uppercase">
          <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="hidden md:inline leading-none pt-[1px]">BACK HOME</span>
        </div>
      </Link>

      {/* Content Wrapper */}
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-5xl md:text-7xl font-extrabold italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] mb-3 font-sans leading-none">
            LOGIN
          </h1>
          <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 font-bold tracking-wider text-base uppercase">
            LOGIN TO YOUR HEALTHHUB ACCOUNT
          </p>
        </div>
        
        <form 
          onSubmit={onSubmit} 
          className="bg-white dark:bg-[#111827] p-6 md:p-10 rounded-[2.5rem] border border-[#1F3A4B]/10 shadow-2xl backdrop-blur-lg"
        >
          <div className="space-y-5 md:space-y-7">
            <div>
              <label className="block font-bold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 tracking-widest text-sm mb-2 ml-1">EMAIL</label>
              <input
                type="email"
                placeholder="ENTER YOUR EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitLoading}
                className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-5 py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-base md:text-lg outline-none focus:border-[#C2F84F] transition-all tracking-wide placeholder:text-sm"
              />
            </div>
            
            <div>
              <label className="block font-bold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-sm mb-2 ml-1">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitLoading}
                  className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-5 py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-base md:text-lg outline-none focus:border-[#C2F84F] transition-all tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1F3A4B]/40 dark:text-[#FAFDEE]/40"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full rounded-2xl bg-[#1F3A4B] dark:bg-[#C2F84F] py-4 md:py-5 font-bold text-white dark:text-[#1F3A4B] uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg text-base md:text-lg flex items-center justify-center gap-2.5"
            >
              {isSubmitLoading ? "VERIFYING..." : "LOGIN"}
              {!isSubmitLoading && <ArrowRight size={20} />}
            </button>
          </div>
        </form>
        
        <p className="text-center mt-6 md:mt-8 font-bold text-[#1F3A4B]/90 dark:text-[#FAFDEE]/90 tracking-wider text-sm uppercase">
          DON'T HAVE AN ACCOUNT?{" "}
          <Link to="/signup" className="text-[#1F3A4B] dark:text-[#C2F84F] font-bold underline decoration-2 underline-offset-4 hover:opacity-70 ml-1">
            SIGN UP
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
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { Home, ArrowRight } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';
import { API_URL } from '../config/api';

const SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Dermatologist', 'Neurologist',
  'Orthopedic', 'Gynecologist', 'Pediatrician', 'Psychiatrist',
  'Oncologist', 'ENT Specialist', 'Ophthalmologist', 'Urologist',
  'Endocrinologist', 'Gastroenterologist', 'Pulmonologist',
];

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '', role: '', specialization: '', experience: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    setLoading(true);

    const payload = {
      email: formData.email,
      password: formData.password,
      name: formData.username,
      role: formData.role,
    };

    // Include doctor-specific fields if role is Doctor
    if (formData.role === 'Doctor') {
      if (formData.specialization) payload.specialization = formData.specialization;
      if (formData.experience) payload.experience = parseInt(formData.experience);
    }

    axios.post(`${API_URL}/api/v1/signup`, payload)
      .then((response) => {
        if (response.data.success) {
          toast.success('Signup successful!');
          setTimeout(() => navigate('/login'), 1500);
        } else {
          toast.error(response.data.message || 'Signup failed!');
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Signup failed!');
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center pt-24 md:pt-0 pb-12 px-6 bg-[#FAFDEE] dark:bg-[#0a111a] transition-colors duration-300 font-sans relative overflow-x-hidden">

      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] bg-[#C2F84F] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[35%] h-[35%] bg-cyan-400 rounded-full blur-[140px]" />
      </div>

      <Link to="/" className="absolute top-8 left-8 z-20 group">
        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[#1F3A4B]/20 dark:border-white/10 bg-white/50 dark:bg-[#1F3A4B]/20 backdrop-blur-md text-[#1F3A4B] dark:text-[#FAFDEE] font-bold text-sm tracking-widest transition-all hover:border-[#1F3A4B] dark:hover:border-[#C2F84F] hover:shadow-lg">
          <Home size={16} />
          <span>BACK HOME</span>
        </div>
      </Link>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] mb-3">
            Sign Up
          </h1>
          <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 font-medium tracking-wide text-base">
            Create your HealthHub account
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-[#111827] p-6 md:p-10 rounded-[2.5rem] border border-[#1F3A4B]/10 shadow-2xl backdrop-blur-lg"
        >
          <div className="space-y-4 md:space-y-6">
            <div>
              <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Full Name</label>
              <input name="username" type="text" placeholder="Enter your name" onChange={onChange} required
                className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all" />
            </div>

            <div>
              <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Email</label>
              <input name="email" type="email" placeholder="Enter your email" onChange={onChange} required
                className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all" />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Password</label>
                <input name="password" type="password" placeholder="••••••••" onChange={onChange} required
                  className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all" />
              </div>
              <div>
                <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 md:mb-2 ml-1">Confirm</label>
                <input name="confirmPassword" type="password" placeholder="••••••••" onChange={onChange} required
                  className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm md:text-base outline-none focus:border-[#C2F84F] transition-all" />
              </div>
            </div>

            {/* Role selection */}
            <div>
              <span className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-2 text-center">I am a...</span>
              <div className="flex justify-center gap-6 md:gap-8">
                {['Doctor', 'Patient'].map((r) => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer font-bold text-sm md:text-lg">
                    <input type="radio" name="role" value={r} onChange={onChange} required className="h-4 w-4 md:h-5 md:w-5 accent-[#1F3A4B] dark:accent-[#C2F84F]" />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {/* Doctor-specific fields (Issue 11.1) */}
            {formData.role === 'Doctor' && (
              <div className="space-y-4 pt-2 border-t border-[#1F3A4B]/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#1F3A4B]/60 dark:text-[#FAFDEE]/60 text-center">Doctor Profile</p>

                <div>
                  <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 ml-1">Specialization</label>
                  <select
                    name="specialization"
                    value={formData.specialization}
                    onChange={onChange}
                    className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm outline-none focus:border-[#C2F84F] transition-all"
                  >
                    <option value="">Select specialization...</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 uppercase tracking-widest text-[10px] md:text-sm mb-1 ml-1">Years of Experience</label>
                  <input
                    name="experience"
                    type="number"
                    placeholder="e.g. 5"
                    min="0"
                    max="60"
                    value={formData.experience}
                    onChange={onChange}
                    className="w-full rounded-2xl border border-[#1F3A4B]/10 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 md:px-5 py-3 md:py-4 text-[#1F3A4B] dark:text-[#FAFDEE] font-medium text-sm outline-none focus:border-[#C2F84F] transition-all"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-[#1F3A4B] dark:bg-[#C2F84F] py-4 md:py-5 font-bold text-white dark:text-[#1F3A4B] uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg text-sm md:text-lg flex items-center justify-center gap-2">
              {loading ? 'PROCESSING...' : 'SIGN UP'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </form>

        <p className="text-center mt-6 md:mt-8 font-medium text-[#1F3A4B]/90 dark:text-[#FAFDEE]/90 tracking-wide text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1F3A4B] dark:text-[#C2F84F] font-bold underline decoration-2 underline-offset-4 hover:opacity-70">Login</Link>
        </p>
      </div>

      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
    </main>
  );
};

export default Signup;

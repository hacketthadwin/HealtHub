import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Moon, Sun, Home, LogOut } from 'lucide-react';

const navItems = [
  { name: 'Features', scrollTo: 'features' },
  { name: 'FAQ',      scrollTo: 'faq' },
  { name: 'About Us', href: '/about' },
  { name: 'Pricing',  href: '/pricing' },
  { name: 'Contact',  href: '/contact' },
];

export default function Header1() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dashboardRoute, setDashboardRoute] = useState('/');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role  = localStorage.getItem('role');
    if (token) {
      setIsLoggedIn(true);
      if (role === 'doctor')       setDashboardRoute('/doctor');
      else if (role === 'patient') setDashboardRoute('/patient');
      else                         setDashboardRoute('/dashboard');
    } else {
      setIsLoggedIn(false);
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme') || (isDark ? 'dark' : 'light');
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  // Fixed Scroll Navigation handling closing height spaces first
  const handleScrollNav = (sectionId) => {
    setIsMobileMenuOpen(false);
    
    const scrollToTarget = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (location.pathname === '/') {
      // Small timeout lets the menu structural block collapse before computing position
      setTimeout(scrollToTarget, 100);
    } else {
      navigate('/');
      setTimeout(scrollToTarget, 350);
    }
  };

  return (
    <>
      <div className="h-24" />

      <motion.header
        className="fixed top-0 left-0 right-0 z-50 py-4 font-sans px-4 sm:px-6 lg:px-8"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div 
          className={`mx-auto max-w-7xl rounded-2xl transition-all duration-500 border px-4 sm:px-6 lg:px-8 relative z-50 ${
            isScrolled || isMobileMenuOpen
              ? 'bg-white/80 dark:bg-[#0a111a]/85 backdrop-blur-xl border-gray-200/40 dark:border-white/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_12px_45px_-10px_rgba(0,0,0,0.4)] py-3'
              : 'bg-white/40 dark:bg-white/5 backdrop-blur-md border-transparent py-4'
          }`}
        >
          <div className="flex items-center justify-between">
            
            {/* LOGO */}
            <div className="flex items-center shrink-0">
              <Link to="/" className="group relative">
                <span className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-[#1F3A4B] dark:text-[#FAFDEE] group-hover:text-emerald-600 dark:group-hover:text-[#C2F84F] transition-colors duration-300">
                  HEALTH<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
                </span>
              </Link>
            </div>

            {/* DESKTOP NAVIGATION */}
            <nav className="hidden lg:flex items-center bg-gray-200/30 dark:bg-white/5 p-1 rounded-full border border-gray-300/10 dark:border-white/5 backdrop-blur-md">
              {navItems.map((item) => {
                const isActive = item.href && location.pathname === item.href;
                const linkClass = `relative px-5 py-2 text-sm font-semibold transition-all duration-300 rounded-full text-[#1F3A4B] dark:text-[#FAFDEE] hover:text-emerald-600 dark:hover:text-[#C2F84F]`;

                if (item.scrollTo) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleScrollNav(item.scrollTo)}
                      className={`${linkClass} bg-transparent border-none outline-none cursor-pointer`}
                    >
                      {item.name}
                    </button>
                  );
                }

                return (
                  <Link key={item.name} to={item.href} className={linkClass}>
                    <span className="relative z-10">{item.name}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activePill"
                        className="absolute inset-0 bg-white dark:bg-[#0f172a] rounded-full shadow-sm border border-gray-200/50 dark:border-white/10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* DESKTOP CONTROLS */}
            <div className="hidden lg:flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="relative p-2.5 rounded-full border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-[#1F3A4B] dark:text-[#FAFDEE]"
                aria-label="Toggle theme"
              >
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 180 : 0, scale: theme === 'dark' ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                  className={theme === 'dark' ? 'absolute' : ''}
                >
                  <Sun size={18} className="text-amber-500" />
                </motion.div>
                <motion.div
                  initial={false}
                  animate={{ rotate: theme === 'dark' ? 0 : -180, scale: theme === 'dark' ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className={theme === 'light' ? 'absolute' : ''}
                >
                  <Moon size={18} className="text-[#C2F84F]" />
                </motion.div>
              </button>

              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <Link
                    to={dashboardRoute}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-[#C2F84F] dark:hover:bg-[#b0e342] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1F3A4B] transition-all"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-200/60 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-950/30 px-5 py-2.5 text-sm font-semibold text-rose-900 dark:text-rose-400 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-[#1F3A4B] dark:text-[#FAFDEE] hover:text-emerald-600 dark:hover:text-[#C2F84F] px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1F3A4B] hover:bg-[#2c536c] dark:bg-[#FAFDEE] dark:hover:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1F3A4B] transition-all"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* MOBILE NAVIGATION TRIGGERS */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-gray-200/50 dark:bg-white/5 border border-gray-300/20 dark:border-white/10 text-[#1F3A4B] dark:text-[#FAFDEE]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
              <button
                className="p-2.5 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] transition-transform active:scale-95"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* COMPACT DROP-DOWN CONTAINER */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden lg:hidden"
              >
                <div className="pt-6 pb-2 border-t border-gray-200/50 dark:border-white/5 mt-4 flex flex-col gap-1">
                  {navItems.map((item) => {
                    const isActive = item.href && location.pathname === item.href;
                    const itemClass = `w-full text-left py-3 px-4 rounded-xl text-sm font-semibold transition-colors flex items-center justify-between text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-gray-100 dark:hover:bg-white/5`;

                    if (item.scrollTo) {
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleScrollNav(item.scrollTo)}
                          className={itemClass}
                        >
                          {item.name}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${itemClass} ${isActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#C2F84F] dark:bg-[#C2F84F]/10' : ''}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>{item.name}</span>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-[#C2F84F]" />}
                      </Link>
                    );
                  })}

                  {/* Auth Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200/40 dark:border-white/5 flex flex-col gap-2">
                    {isLoggedIn ? (
                      <>
                        <Link
                          to={dashboardRoute}
                          className="w-full py-3 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] flex items-center justify-center gap-2 text-sm font-bold text-white dark:text-[#1F3A4B]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Home className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <button
                          onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                          className="w-full py-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-sm font-bold"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/login"
                          className="py-3 rounded-xl text-center text-sm font-bold text-[#1F3A4B] dark:text-[#FAFDEE] bg-gray-100 dark:bg-white/5 hover:bg-gray-200/50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                        <Link
                          to="/signup"
                          className="py-3 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-center text-sm font-bold text-white dark:text-[#1F3A4B]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          Get Started
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>
    </>
  );
}
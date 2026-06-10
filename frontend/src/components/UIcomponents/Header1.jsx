import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Moon, Sun, Home, LogOut } from 'lucide-react';

const navItems = [
  { name: 'FEATURES', scrollTo: 'features' },
  { name: 'FAQ',      scrollTo: 'faq' },
  { name: 'ABOUT US', href: '/about' },
  // { name: 'PRICING',  href: '/pricing' },
  { name: 'CONTACT',  href: '/contact' },
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

  const handleScrollNav = (sectionId) => {
    setIsMobileMenuOpen(false);
    
    const scrollToTarget = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (location.pathname === '/') {
      setTimeout(scrollToTarget, 100);
    } else {
      navigate('/');
      setTimeout(scrollToTarget, 350);
    }
  };

  return (
    <>
      {/* Expanded top clearing space to balance the larger logo presence */}
      <div className="h-28" />

      <motion.header
        className="fixed top-0 left-0 right-0 z-50 py-5 font-roboto-slab px-4 sm:px-6 lg:px-8 antialiased"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div 
          className={`mx-auto max-w-7xl rounded-2xl transition-all duration-500 border px-6 lg:px-8 relative z-50 ${
            isScrolled || isMobileMenuOpen
              ? 'bg-white/70 dark:bg-[#070c14]/75 backdrop-blur-xl border-neutral-200/30 dark:border-white/5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6)] py-3'
              : 'bg-white/20 dark:bg-neutral-900/10 backdrop-blur-lg border-transparent py-4'
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            
            {/* LOGO - Amplified Size and Weight Dynamics */}
            <div className="flex items-center shrink-0">
              <Link to="/" className="group relative block py-1">
                <span 
                  style={{ fontWeight: 900 }}
                  className="text-3xl sm:text-3xl lg:text-4xl italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] group-hover:text-emerald-600 dark:group-hover:text-[#C2F84F] transition-colors duration-300 select-none block leading-none"
                >
                  HEALT<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
                </span>
              </Link>
            </div>

            {/* DESKTOP NAVIGATION */}
            <nav className="hidden lg:flex items-center bg-neutral-200/40 dark:bg-[#121c26]/40 p-1 rounded-full border border-neutral-300/20 dark:border-white/5 shadow-sm">
              {navItems.map((item) => {
                const isActive = item.href && location.pathname === item.href;
                const linkClass = `relative px-6 py-2.5 text-base font-bold tracking-wider transition-all duration-300 rounded-full text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 hover:text-emerald-600 dark:hover:text-[#C2F84F] uppercase`;

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
                        className="absolute inset-0 bg-white/90 dark:bg-white/5 rounded-full shadow-sm border border-neutral-200/50 dark:border-white/10"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* DESKTOP CONTROLS */}
            <div className="hidden lg:flex items-center space-x-4 shrink-0">
              <button
                onClick={toggleTheme}
                className="relative p-2.5 rounded-full border border-neutral-200 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-neutral-100/80 dark:hover:bg-white/10 transition-all text-[#1F3A4B] dark:text-[#FAFDEE]"
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
                <div className="flex items-center gap-2.5">
                  <Link
                    to={dashboardRoute}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-[#C2F84F] dark:hover:bg-[#b0e342] px-6 py-3 text-base font-bold uppercase tracking-wider text-white dark:text-[#1F3A4B] shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <Home className="h-4 w-4" />
                    <span>DASHBOARD</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-200/50 hover:bg-rose-100/50 dark:bg-white/5 dark:hover:bg-rose-950/20 px-6 py-3 text-base font-bold uppercase tracking-wider text-rose-900 dark:text-rose-400 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>LOGOUT</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/login"
                    className="text-base font-bold uppercase tracking-wider text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 hover:text-emerald-600 dark:hover:text-[#C2F84F] px-4 py-3 transition-colors"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 rounded-full bg-[#1F3A4B] hover:bg-[#25465b] dark:bg-[#FAFDEE] dark:hover:bg-white px-6 py-3 text-base font-bold uppercase tracking-wider text-white dark:text-[#1F3A4B] shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    <span>GET STARTED</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* MOBILE NAVIGATION TRIGGERS */}
            <div className="flex lg:hidden items-center gap-2 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-neutral-200/50 dark:bg-white/5 border border-neutral-300/20 dark:border-white/10 text-[#1F3A4B] dark:text-[#FAFDEE]"
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
                <div className="pt-6 pb-2 border-t border-neutral-200/40 dark:border-white/5 mt-4 flex flex-col gap-1.5">
                  {navItems.map((item) => {
                    const isActive = item.href && location.pathname === item.href;
                    const itemClass = `w-full text-left py-3.5 px-4 rounded-xl text-base font-bold uppercase tracking-wider transition-colors flex items-center justify-between text-[#1F3A4B]/90 dark:text-[#FAFDEE]/90 hover:bg-neutral-100 dark:hover:bg-white/5`;

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
                  <div className="mt-4 pt-4 border-t border-neutral-200/40 dark:border-white/5 flex flex-col gap-2">
                    {isLoggedIn ? (
                      <>
                        <Link
                          to={dashboardRoute}
                          className="w-full py-3.5 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] flex items-center justify-center gap-2 text-base font-bold uppercase tracking-wider text-white dark:text-[#1F3A4B]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Home className="h-4 w-4" />
                          DASHBOARD
                        </Link>
                        <button
                          onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                          className="w-full py-3.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-2 text-base font-bold uppercase tracking-wider"
                        >
                          <LogOut className="h-4 w-4" />
                          LOGOUT
                        </button>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/login"
                          className="py-3.5 rounded-xl text-center text-base font-bold uppercase tracking-wider text-[#1F3A4B] dark:text-[#FAFDEE] bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200/50"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          SIGN IN
                        </Link>
                        <Link
                          to="/signup"
                          className="py-3.5 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-center text-base font-bold uppercase tracking-wider text-white dark:text-[#1F3A4B]"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          GET STARTED
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
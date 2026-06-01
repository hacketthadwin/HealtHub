import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Moon, Sun, Home, LogOut } from 'lucide-react';

const navItems = [
  { name: 'Pricing', href: '/pricing' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

export default function Header1() {
  const [isScrolled, setIsScrolled]       = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme]                 = useState('light');
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [dashboardRoute, setDashboardRoute] = useState('/');
  const location = useLocation();

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
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
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

  return (
    <>
      <div className="h-16 sm:h-[72px] lg:h-20" />

      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 border-b-2 transition-all duration-100 font-sans ${
          isScrolled
            ? 'bg-[#FAFDEE]/90 dark:bg-[#0a111a]/90 border-[#1F3A4B]/20 dark:border-white/20 backdrop-blur-md shadow-xl'
            : 'bg-transparent border-transparent'
        }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="mx-auto max-w-[1700px] px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="flex h-16 sm:h-[72px] lg:h-20 items-center justify-between">

            {/* LOGO — untouched */}
            <div className="flex items-center shrink-0">
              <Link to="/" className="group">
                <span className="text-2xl sm:text-3xl md:text-[2rem] lg:text-4xl font-black italic tracking-tight uppercase text-[#1F3A4B] dark:text-[#FAFDEE] group-hover:text-emerald-500 dark:group-hover:text-[#C2F84F] transition-colors duration-200">
                  HEALTH<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
                </span>
              </Link>
            </div>

            {/* DESKTOP NAV LINKS */}
            <nav className="hidden lg:flex items-center space-x-6 lg:space-x-10 xl:space-x-16">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative py-1 text-sm lg:text-base font-semibold transition-all duration-200 ${
                      isActive
                        ? 'text-emerald-600 dark:text-[#C2F84F] opacity-100'
                        : 'text-[#1F3A4B] dark:text-[#FAFDEE] opacity-70 hover:opacity-100 hover:text-emerald-600 dark:hover:text-[#C2F84F]'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-600 dark:bg-[#C2F84F] rounded-full origin-left"
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* DESKTOP ACTIONS */}
            <div className="hidden lg:flex items-center space-x-4 lg:space-x-5">

              {/* Theme toggle */}
              <div
                className="relative flex h-9 w-[72px] lg:h-10 lg:w-20 items-center rounded-full border-2 border-[#1F3A4B] dark:border-[#C2F84F] bg-white dark:bg-black cursor-pointer shadow-lg shrink-0"
                onClick={toggleTheme}
              >
                <div className={`absolute top-1/2 left-1 h-6 w-6 lg:h-7 lg:w-7 -translate-y-1/2 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] transition-transform duration-300 ${theme === 'dark' ? 'translate-x-8 lg:translate-x-10' : 'translate-x-0'}`} />
                <span className="relative z-10 flex flex-1 items-center justify-center">
                  <Sun size={14} className={theme === 'light' ? 'text-[#C2F84F]' : 'text-gray-500'} />
                </span>
                <span className="relative z-10 flex flex-1 items-center justify-center">
                  <Moon size={14} className={theme === 'dark' ? 'text-[#1F3A4B]' : 'text-gray-500'} />
                </span>
              </div>

              {/* Logged in */}
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    to={dashboardRoute}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1F3A4B] hover:scale-105 active:scale-95 transition-all shadow-md whitespace-nowrap"
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:scale-105 active:scale-95 transition-all shadow-md whitespace-nowrap"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                /* Not logged in */
                <div className="flex items-center gap-4">
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-[#1F3A4B] dark:text-[#FAFDEE] hover:text-emerald-600 dark:hover:text-[#C2F84F] transition-colors duration-200 whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] px-5 py-2.5 text-sm font-semibold text-white dark:text-[#1F3A4B] hover:scale-105 active:scale-95 transition-all shadow-md whitespace-nowrap"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* MOBILE / TABLET TOP-BAR ACTIONS */}
            <div className="flex lg:hidden items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-black border-2 border-[#1F3A4B] dark:border-[#C2F84F] text-[#1F3A4B] dark:text-[#C2F84F]"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                className="p-2.5 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] shadow-md"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="fixed top-16 sm:top-[72px] left-0 right-0 h-screen lg:hidden z-40"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute inset-0 bg-[#FAFDEE] dark:bg-[#0a111a] backdrop-blur-xl border-t-2 border-[#1F3A4B]/10 dark:border-white/10" />
              <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-3">

                {/* Nav links */}
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`block py-3 px-5 rounded-xl border text-base font-semibold transition-all ${
                        isActive
                          ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] border-transparent'
                          : 'bg-transparent border-[#1F3A4B]/10 dark:border-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-[#1F3A4B]/5'
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  );
                })}

                {/* Action buttons */}
                <div className="pt-2 flex flex-col gap-3">
                  {isLoggedIn ? (
                    <>
                      <Link
                        to={dashboardRoute}
                        className="w-full py-3 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] flex items-center justify-center gap-2 text-sm font-semibold text-white dark:text-[#1F3A4B]"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Home className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                        className="w-full py-3 rounded-xl bg-rose-600 flex items-center justify-center gap-2 text-sm font-semibold text-white"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="w-full py-3 rounded-xl border-2 border-[#1F3A4B] dark:border-[#C2F84F] text-center text-sm font-semibold text-[#1F3A4B] dark:text-[#C2F84F]"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/signup"
                        className="w-full py-3 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-center text-sm font-semibold text-white dark:text-[#1F3A4B]"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Get Started
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
}
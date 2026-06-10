import React, { useRef, useState, useEffect } from 'react';
import { Shield, Zap, Smartphone } from 'lucide-react';
import Header1 from './UIcomponents/Header1';

const values = [
  {
    icon: Shield,
    title: "Absolute Privacy",
    description: "EVERY PATIENT PROFILE AND MEDICAL PRIVATE CHAT IS FULLY PROTECTED BEHIND SECURE LOGIN LOCKS.",
    cornerStyle: " sm:rounded-br-[2px]",
  },
  {
    icon: Zap,
    title: "Instant Connections",
    description: "NO MORE WAITING TIME OR BUSY PHONE LINES. BOOK OPEN SLOTS IMMEDIATELY WITH LIVE STATUS ALERTS.",
    cornerStyle: " sm:rounded-br-[2px]",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "MANAGE APPOINTMENTS, LOG RECORDS, AND TALK WITH DOCTORS COMFORTABLY FROM ANY MOBILE DEVICE.",
    cornerStyle: " sm:rounded-br-[2px]",
  }
];

export default function AboutUs() {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 280);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className="w-full min-h-screen transition-colors duration-300 font-roboto-slab overflow-x-hidden relative select-none pt-44 pb-24 px-6 antialiased"
      style={{ backgroundColor: 'transparent' }}
    >
      
      {/* Background Ambience Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[140px] dark:opacity-15" 
          style={{ background: `radial-gradient(circle at center, #C2F84F, transparent 70%)` }}
        />
        <div 
          className="absolute bottom-[20%] right-[-10%] w-[35%] h-[35%] rounded-full opacity-25 dark:opacity-15 bg-cyan-500 blur-[140px]" 
        />
      </div>

      <Header1 />

      <div 
        ref={containerRef}
        className={`relative z-10 mx-auto max-w-[1400px] flex flex-col items-center space-y-16 md:space-y-24 transition-all duration-500 ease-out ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        
        {/* Header Strategic Branding Block */}
        <div className="text-center max-w-4xl self-center space-y-5 flex flex-col items-center">
          <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] relative mx-auto w-fit rounded-full px-5 py-2 text-xs font-bold tracking-widest uppercase shadow-md transition-transform duration-500 hover:scale-105">
            <span className="relative z-1">OUR STORY</span>
          </div>
          <h1 className="text-[#1F3A4B] dark:text-[#FAFDEE] text-4xl sm:text-5xl md:text-6xl font-extrabold italic uppercase tracking-tighter font-sans leading-none">
            Bridging the Gap in Modern <span className="text-emerald-600 dark:text-[#C2F84F]">Healthcare</span>
          </h1>
          <p className="text-sm md:text-base font-bold tracking-widest uppercase text-[#1F3A4B]/80 dark:text-[#FAFDEE]/60 max-w-3xl mx-auto leading-relaxed">
            HEALTHHUB IS A UNIFIED PLATFORM BUILT TO CONNECT PATIENTS, DOCTORS, AND HOSPITALS THROUGH SMART DASHBOARD TOOLS THAT PLACE YOUR WELLNESS FIRST.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto items-stretch">
          {values.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="h-full group">
                <div className={`relative rounded-[2.5rem] px-8 py-10 border-2 backdrop-blur-2xl shadow-xl transition-all duration-500 h-full flex flex-col justify-start bg-white dark:bg-white/5 border-[#1F3A4B]/5 dark:border-white/5 group-hover:border-[#1F3A4B] dark:group-hover:border-[#C2F84F] group-hover:shadow-2xl hover:scale-[1.01] ${item.cornerStyle}`}>
                  
                  <div className="p-3 bg-[#1F3A4B]/5 dark:bg-white/5 group-hover:bg-[#1F3A4B] dark:group-hover:bg-[#C2F84F] text-[#1F3A4B] dark:text-[#C2F84F] group-hover:text-[#C2F84F] group-hover:dark:text-[#1F3A4B] w-fit rounded-2xl shadow-sm transition-all duration-500 mb-6 relative z-10">
                    <Icon className="h-7 w-7 stroke-[2.25] transform group-hover:rotate-6 transition-transform duration-500" />
                  </div>

                  {/* CRITICAL UPDATE: Changed class to font-roboto-slab for core box headers */}
                  <h3 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-3 text-2xl font-bold italic uppercase tracking-tighter leading-none font-roboto-slab relative z-10">
                    {item.title}
                  </h3>
                  
                  <p className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/50 text-base tracking-wide leading-relaxed uppercase relative z-10">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight Banner Callout */}
        <div className="w-full max-w-6xl rounded-[2.5rem] p-8 md:p-12 border-2 bg-white dark:bg-white/5 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl backdrop-blur-2xl grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-4 text-left">
            {/* CRITICAL UPDATE: Changed class to font-roboto-slab for banner inner headers */}
            <h2 className="text-2xl md:text-4xl font-extrabold italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab leading-none">
              Designed for Patients <br /> Built for Professionals
            </h2>
            <p className="text-sm md:text-base  tracking-wide uppercase text-[#1F3A4B]/70 dark:text-[#FAFDEE]/50 leading-relaxed">
              WHETHER YOU NEED QUICK CHAT ANSWERS OR SYSTEM DASHBOARD PANELS FOR AN ENTIRE HOSPITAL INFRASTRUCTURE, HEALTHHUB PROVIDES A SMOOTH EXPERIENCE ACROSS EVERY ROLE.
            </p>
          </div>
          <div className="rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-800/40 dark:from-[#C2F84F] dark:to-[#C2F84F]/40 border border-black/5 dark:border-white/5 p-6 flex flex-col justify-center h-full min-h-[160px] shadow-xl">
            {/* Kept font-sans here deliberately to match numerical styling across the home page */}
            <span className="text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter text-white dark:text-[#1F3A4B] font-sans leading-none">100%</span>
            <p className="text-sm font-extrabold uppercase tracking-widest text-white dark:text-[#1F3A4B] mt-2 font-sans leading-none">
              DIGITAL SYSTEM SETUP
            </p>
            <p className="text-sm tracking-wide uppercase text-white/90 dark:text-[#1F3A4B]/80 font-bold leading-normal mt-2">
              NO PAPER RECORDS NEEDED. COMPREHENSIVE CLINICAL DASHBOARDS KEEP DATA SAFE AND ACCESSIBLE ANYTIME.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
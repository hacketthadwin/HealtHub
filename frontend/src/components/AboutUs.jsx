import React, { useRef, useState, useEffect } from 'react';
import { Shield, Zap, Smartphone } from 'lucide-react';
import Header1 from './UIcomponents/Header1';

const values = [
  {
    icon: Shield,
    title: "Absolute Privacy",
    description: "Every patient profile and medical private chat is fully protected behind secure login locks.",
    cornerStyle: " sm:rounded-br-[2px]",
  },
  {
    icon: Zap,
    title: "Instant Connections",
    description: "No more waiting time or busy phone lines. Book open slots immediately with live status alerts.",
    cornerStyle: " sm:rounded-br-[2px]",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Manage appointments, log records, and talk with doctors comfortably from any mobile device.",
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
    // font-roboto-slab is the base font for all normal text in this page
    <div 
      className="w-full min-h-screen transition-colors duration-300 font-roboto-slab overflow-x-hidden relative select-none pt-44 pb-24 px-6"
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
        className={`relative z-10 mx-auto max-w-[1400px] flex flex-col items-center space-y-16 md:space-y-20 transition-all duration-500 ease-out ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        
        {/* Header Strategic Branding Block */}
        <div className="text-center max-w-3xl self-center space-y-4">
          {/* font-black tracking-widest matches footer/FAQ badge style */}
          <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] relative mx-auto w-fit rounded-full px-4 py-1.5 text-md font-black tracking-widest uppercase">
            <span className="relative z-1">Our Story</span>
          </div>
          {/* font-sans keeps heading font — unchanged */}
          <h1 className="text-[#1F3A4B] dark:text-[#FAFDEE] text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
            Bridging the Gap in Modern <span className="text-emerald-600 dark:text-[#C2F84F]">Healthcare</span>
          </h1>
          {/* font-black tracking-wide uppercase matches footer description style */}
          <p className="text-base md:text-lg  tracking-wide uppercase text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 max-w-2xl mx-auto leading-relaxed">
            HealthHub is a unified platform built to connect patients, doctors, and hospitals through smart dashboard tools that place your wellness first.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto items-stretch">
          {values.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="h-full">
                <div className={`relative rounded-[2.5rem] px-8 py-10 border-2 transition-all duration-300 h-full flex flex-col justify-start bg-white dark:bg-white/5 border-[#1F3A4B]/10 dark:border-white/10 hover:border-emerald-500 dark:hover:border-[#C2F84F] ${item.cornerStyle}`}>
                  <div className="text-[#1F3A4B] dark:text-[#C2F84F] mb-4">
                    <Icon className="h-8 w-8 stroke-[2]" />
                  </div>
                  {/* font-black italic uppercase tracking-tighter matches footer/features card heading style */}
                  <h3 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-3 text-lg md:text-xl  italic uppercase tracking-tighter">
                    {item.title}
                  </h3>
                  {/* tracking-wide uppercase matches footer body text style */}
                  <p className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 text-sm md:text-base tracking-wide uppercase leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight Banner Callout */}
        <div className="w-full max-w-6xl rounded-[2.5rem] p-8 md:p-12 border-2 bg-black/5 dark:bg-white/5 border-[#1F3A4B]/10 dark:border-white/10 backdrop-blur-sm grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-2 space-y-3 text-left">
            {/* heading unchanged */}
            <h2 className="text-xl md:text-3xl  italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE] leading-none">
              Designed for Patients <br /> Built for Professionals
            </h2>
            {/* tracking-wide uppercase matches footer body text style */}
            <p className="text-sm md:text-base tracking-wide uppercase text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 leading-relaxed">
              Whether you need quick chat answers or system dashboard panels for an entire hospital infrastructure, HealthHub provides a smooth experience across every role.
            </p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-800/40 dark:from-[#C2F84F] dark:to-[#C2F84F]/40 border border-black/5 dark:border-white/5 p-6 flex flex-col justify-center h-full min-h-[140px]">
            <span className="text-4xl font-black italic uppercase tracking-tighter text-white dark:text-[#1F3A4B]">100%</span>
            {/* font-black uppercase tracking-tighter matches footer label style */}
            <p className="text-sm font-black uppercase tracking-tighter text-white dark:text-[#1F3A4B] mt-1">
              Digital System Setup
            </p>
            {/* tracking-wide uppercase matches footer body text style */}
            <p className="text-xs sm:text-sm tracking-wide uppercase text-white dark:text-[#1F3A4B] leading-normal mt-1">
              No paper records needed. Comprehensive clinical dashboards keep data safe and accessible anytime.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
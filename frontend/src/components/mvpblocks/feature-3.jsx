import React from "react";
import {
  Building2,
  Lightbulb,
  ScreenShare,
  Trophy,
  User,
  User2,
} from "lucide-react";
import { cn } from "../../lib/utils";

const leftFeatures = [
  {
    icon: Building2,
    title: "Verified Doctors",
    description: "CONNECT ONLY WITH CERTIFIED HEALTHCARE PROFESSIONALS AVAILABLE FOR DIRECT CONSULTATIONS.",
    cornerStyle: "sm:translate-x-2 sm:rounded-br-[2px]",
  },
  {
    icon: User2,
    title: "Patient Support Rooms",
    description: "JOIN SECURE CHAT SPACES TO DISCUSS SYMPTOMS, ASK QUESTIONS, AND GET ADVICE SAFELY.",
    cornerStyle: "sm:translate-x-2 sm:rounded-br-[2px]",
  },
  {
    icon: Trophy,
    title: "Health Insights",
    description: "GET REAL-TIME ADVICE AND CLEAR DATA REVIEWS ON VISITS, TASKS, AND MEDICAL RECORDS.",
    cornerStyle: "sm:translate-x-2 sm:rounded-tr-[2px]",
  },
];

const rightFeatures = [
  {
    icon: ScreenShare,
    title: "Live Consultations",
    description: "TALK WITH ASSIGNED DOCTORS IN REAL TIME THROUGH FAST LIVE MESSAGING CHANNELS.",
    cornerStyle: "sm:-translate-x-2 sm:rounded-bl-[2px]",
  },
  {
    icon: User,
    title: "Smart Appointment System",
    description: "BOOK, TRACK, AND MANAGE YOUR CLINIC APPOINTMENTS WITH INSTANT SLOT ACCEPTANCE.",
    cornerStyle: "sm:translate-x-2 sm:rounded-bl-[2px]",
  },
  {
    icon: Lightbulb,
    title: "AI Health Assistant",
    description: "ASK HEALTH QUESTIONS AND RECEIVE AUTOMATIC SMART HELP ANYTIME.",
    cornerStyle: "sm:-translate-x-2 sm:rounded-tl-[2px]",
  },
];

const FeatureCard = ({ feature }) => {
  const Icon = feature.icon;
  return (
    <div className="h-full group">
      <div
        className={cn(
          "relative rounded-[2.5rem] px-8 py-10 border border-[#1F3A4B]/10 dark:border-white/10 backdrop-blur-xl shadow-lg transition-all duration-500 h-full flex flex-col justify-start overflow-hidden bg-white/50 dark:bg-white/5 hover:shadow-2xl hover:scale-[1.02]",
          feature.cornerStyle
        )}
      >
        {/* Glassmorphic Glow Effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#C2F84F]/20 to-transparent blur-3xl" />
        </div>

        {/* Icon with Glassmorphic Hover (Color & Shadow only) */}
        <div className="mb-6 w-fit relative z-10">
          <Icon className="h-10 w-10 text-[#1F3A4B] dark:text-[#C2F84F] transition-all duration-500 stroke-[1.5] group-hover:text-[#C2F84F] dark:group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(194,248,79,0.8)] transform group-hover:rotate-6" />
        </div>

        <h3 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-3 text-2xl md:text-3xl font-extrabold italic uppercase tracking-tighter leading-none font-roboto-slab relative z-10">
          {feature.title}
        </h3>
        
        <p className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 text-base font-bold tracking-wide leading-relaxed uppercase relative z-10">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

export default function CongestedFeatures() {
  return (
    <section className="relative w-full py-20 bg-transparent transition-colors duration-300 z-10 font-roboto-slab antialiased" id="features">
      <div className="mx-auto px-4 max-w-[1500px]">
        <div className="flex flex-col-reverse gap-10 lg:grid lg:grid-cols-3 items-center">
          
          {/* Left Feature Column */}
          <div className="flex flex-col gap-6 w-full">
            {leftFeatures.map((feature, index) => (
              <FeatureCard key={`left-feature-${index}`} feature={feature} />
            ))}
          </div>

          {/* Sticky Center Strategic Branding Column */}
          <div className="text-center lg:sticky lg:top-40 py-8 px-4 self-center flex flex-col items-center">
            <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] relative mx-auto mb-5 w-fit rounded-full px-5 py-2 text-xs font-bold tracking-widest uppercase shadow-md transition-transform duration-500 hover:scale-105">
              <span className="relative z-1">FEATURES</span>
            </div>
            <h2 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-4 text-3xl sm:text-4xl md:text-5xl font-extrabold italic uppercase tracking-tighter leading-none font-sans">
              WHAT ARE WE<br /> PROVIDING?
            </h2>
            <p className="text-sm font-bold tracking-widest uppercase opacity-50 mx-auto max-w-xs leading-relaxed">
              EASY AND POWERFUL TOOLS DESIGNED TO GIVE YOU A SMOOTH EXPERIENCE.
            </p>
          </div>

          {/* Right Feature Column */}
          <div className="flex flex-col gap-6 w-full">
            {rightFeatures.map((feature, index) => (
              <FeatureCard key={`right-feature-${index}`} feature={feature} />
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
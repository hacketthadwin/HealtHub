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
    cornerStyle: "sm:-translate-x-2 sm:rounded-br-[2px]",
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
    <div className="h-full">
      <div
        className={cn(
          "relative rounded-[2.5rem] px-8 py-10 border-2 transition-all duration-300 h-full flex flex-col justify-start",
          "bg-white dark:bg-white/5",
          "border-[#1F3A4B]/10 dark:border-white/10 hover:border-emerald-500 dark:hover:border-[#C2F84F]",
          feature.cornerStyle
        )}
      >
        <div className="text-[#1F3A4B] dark:text-[#C2F84F] mb-4">
          <Icon className="h-8 w-8 stroke-[2.5]" />
        </div>
        <h3 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-3 text-xl md:text-2xl font-black italic uppercase tracking-tighter leading-none">
          {feature.title}
        </h3>
        <p className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 text-[11px] font-bold tracking-wide leading-relaxed uppercase">
          {feature.description}
        </p>
      </div>
    </div>
  );
};

export default function CongestedFeatures() {
  return (
    <section className="relative w-full py-12 bg-transparent transition-colors duration-300 z-10" id="features">
      <div className="mx-auto px-4 max-w-[1400px]">
        <div className="flex flex-col-reverse gap-8 md:grid md:grid-cols-3 items-center">
          
          {/* Left Feature Column */}
          <div className="flex flex-col gap-6 w-full">
            {leftFeatures.map((feature, index) => (
              <FeatureCard key={`left-feature-${index}`} feature={feature} />
            ))}
          </div>

          {/* Sticky Center Strategic Branding Column */}
          <div className="text-center md:sticky md:top-32 py-8 px-4 self-center">
            <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] relative mx-auto mb-6 w-fit rounded-full px-4 py-1.5 text-[10px] font-black tracking-widest uppercase">
              <span className="relative z-1">FEATURES</span>
            </div>
            <h2 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-4 text-3xl font-black italic uppercase tracking-tighter sm:text-4xl md:text-5xl leading-none">
              PLATFORM <br /> CAPABILITIES
            </h2>
            <p className="text-[10px] font-black tracking-widest uppercase opacity-40 mx-auto max-w-[16rem]">
              EASY AND POWERFUL TOOLS DESIGNED TO GIVE YOU A SMOOTH EXPERIANCE.
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
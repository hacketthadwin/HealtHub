import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";

function FAQItem({ question, answer, index }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "relative rounded-[2rem] border-2 transition-all duration-300 overflow-hidden",
        "bg-white dark:bg-white/5 backdrop-blur-md shadow-sm", 
        isOpen 
          ? "border-[#1F3A4B] dark:border-[#C2F84F] z-10 scale-[1.01] shadow-xl" 
          : "border-[#1F3A4B]/5 dark:border-white/5 z-0 hover:border-[#1F3A4B]/20 dark:hover:border-[#C2F84F]/30"
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left select-none"
      >
        {/* CRITICAL UPDATE: Swapped font-sans for font-roboto-slab for the questions */}
        <h3 className="text-base md:text-lg font-medium italic uppercase tracking-wider text-[#1F3A4B] dark:text-[#FAFDEE] font-roboto-slab">
          {question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="shrink-0 text-[#1F3A4B] dark:text-[#C2F84F]"
        >
          <ChevronDown className="h-5 w-5 stroke-[2.5]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: { height: { duration: 0.3 }, opacity: { duration: 0.2 } } 
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: { height: { duration: 0.25 }, opacity: { duration: 0.15 } } 
            }}
          >
            <div className="px-6 pb-6 pt-0 border-t-2 border-[#1F3A4B]/5 dark:border-white/5 mt-1">
              <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/70 text-base leading-relaxed pt-4 tracking-wide font-medium">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CongestedFAQ() {
  const faqs = [
    {
      question: "What makes this healthcare platform unique?",
      answer: "OUR PLATFORM CONNECTS PATIENTS AND DOCTORS WITH REAL-TIME APPOINTMENTS, SECURE CHAT, AI HELP, AND EASY-TO-USE DASHBOARDS FOR BOTH SIDES.",
    },
    {
      question: "How does the appointment system work?",
      answer: "PATIENTS CAN BOOK AVAILABLE TIME SLOTS, AND DOCTORS CAN ACCEPT, DECLINE, OR RESCHEDULE REQUESTS. BOTH SIDES GET INSTANT UPDATES WITH A LIVE CALENDAR VIEW.",
    },
    {
      question: "Is the chat with doctors secure?",
      answer: "YES, ALL COMMUNICATION IS PROTECTED WITH SECURE ACCOUNTS AND LOCKED LOGIN SESSIONS, KEEPING DOCTOR-PATIENT CONVERSATIONS PRIVATE AND RELIABLE.",
    },
    {
      question: "Can I access the platform from mobile?",
      answer: "ABSOLUTELY! THE ENTIRE INTERFACE IS MOBILE-FRIENDLY, INCLUDING DASHBOARDS, CHAT, APPOINTMENTS, AND THE AI ASSISTANT, ENSURING A SMOOTH EXPERIENCE ANYWHERE.",
    },
  ];

  return (
    <div className="w-full h-auto block relative px-4 bg-transparent transition-all duration-300 z-10 font-roboto-slab antialiased">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14 space-y-4"
        >
          <Badge className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest bg-[#1F3A4B] dark:bg-[#C2F84F] border-transparent text-white dark:text-[#1F3A4B] shadow-md">
            FAQ
          </Badge>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">
            Common Questions
          </h2>
          <p className="text-sm font-bold tracking-widest uppercase opacity-50 max-w-xl mx-auto leading-relaxed">
            EVERYTHING YOU NEED TO KNOW ABOUT HOW OUR PORTAL AND PLATFORM PLANS WORK.
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem key={index} {...faq} index={index} />
          ))}
        </div>

        {/* Support Section Footer */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-16 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] text-center border-2 bg-white dark:bg-white/5 border-[#1F3A4B]/5 dark:border-white/5 shadow-2xl backdrop-blur-2xl"
        >
          <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] inline-flex p-4 rounded-2xl mb-5 shadow-lg">
            <Mail className="w-6 h-6" />
          </div>
          {/* CRITICAL UPDATE: Modified font weight to font-medium for standard prose alignment */}
          <h4 className="text-[#1F3A4B] dark:text-[#FAFDEE] text-2xl md:text-4xl font-medium italic uppercase tracking-tighter mb-2 leading-none">
            Still have questions?
          </h4>
          <p className="text-sm font-bold tracking-widest uppercase opacity-50 mb-8 max-w-md mx-auto leading-relaxed">
            CAN'T FIND WHAT YOU'RE LOOKING FOR? REACH OUT TO OUR SUPPORT TEAM.
          </p>
          <Link 
            to="/contact"
            className="inline-block px-10 py-5 rounded-2xl text-sm font-bold uppercase tracking-widest bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] hover:scale-105 active:scale-95 transition-all shadow-xl italic"
          >
            Contact Support
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
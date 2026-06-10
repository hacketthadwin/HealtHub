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
        "bg-black/5 dark:bg-white/5", 
        isOpen 
          ? "border-[#1F3A4B] dark:border-[#C2F84F] z-10 scale-[1.01]" 
          : "border-[#1F3A4B]/10 dark:border-white/10 z-0 hover:border-[#1F3A4B]/30 dark:hover:border-[#C2F84F]/30"
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <h3 className="text-base md:text-xl  uppercase tracking-tight text-[#1F3A4B] dark:text-[#FAFDEE]">
          {question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="shrink-0 text-[#1F3A4B] dark:text-[#C2F84F]"
        >
          <ChevronDown className="h-5 w-5 stroke-[3]" />
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
            <div className="px-6 pb-6 pt-0 border-t-2 border-[#1F3A4B]/10 dark:border-white/10 mt-2">
              <p className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 text-sm md:text-lg leading-relaxed pt-4 tracking-wide">
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
    <div className="w-full h-auto block relative px-4 bg-transparent transition-all duration-300 z-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 space-y-4"
        >
          <Badge className="px-4 py-1.5 rounded-full border-2 text-sm  uppercase tracking-widest bg-[#1F3A4B] dark:bg-[#C2F84F] border-transparent text-white dark:text-[#1F3A4B]">
            FAQ
          </Badge>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase sm:text-5xl text-[#1F3A4B] dark:text-[#FAFDEE]">
            Common Questions
          </h2>
          <p className="text-md  tracking-widest uppercase opacity-40 max-w-xl mx-auto">
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
          className="mt-16 p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] text-center border-2 bg-black/5 dark:bg-white/5 border-[#1F3A4B]/10 dark:border-white/10"
        >
          <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] inline-flex p-4 rounded-2xl mb-4 shadow-md">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="text-[#1F3A4B] dark:text-[#FAFDEE] text-2xl md:text-3xl  italic uppercase tracking-tighter mb-2">
            Still have questions?
          </h4>
          <p className="text-md  tracking-widest uppercase opacity-40 mb-8">
            CAN'T FIND WHAT YOU'RE LOOKING FOR? REACH OUT TO OUR SUPPORT TEAM.
          </p>
          <Link 
            to="/contact"
            className="inline-block px-8 py-4 rounded-xl  text-sm uppercase tracking-widest bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            Contact Support
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
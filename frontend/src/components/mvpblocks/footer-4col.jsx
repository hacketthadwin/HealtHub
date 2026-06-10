import React from "react";
import { Link } from "react-router-dom";
import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";
import { cn } from "../../lib/utils";

const data = {
  facebookLink: "https://facebook.com/HealthHub",
  instaLink: "https://instagram.com/HealthHub",
  twitterLink: "https://twitter.com/HealthHub",
  githubLink: "https://github.com/HealthHub",
  dribbbleLink: "https://dribbble.com/HealthHub",
  services: {
    appointments: "/book-appointment",
    doctors: "/find-doctors",
    community: "/community-support",
    aiassistant: "/ai-health-assistant",
  },
  about: {
    history: "/our-journey",
    team: "/our-doctors",
    handbook: "/patient-guidelines",
    careers: "/join-us",
  },
  help: {
    faqs: "/faqs",
    support: "/patient-support",
    livechat: "/chat-with-doctor",
  },
  contact: {
    email: "support@healthhub.com",
    phone: "+91 8637373116",
    address: "Kolkata, West Bengal, India",
  },
  company: {
    name: "HEALTHHUB",
    description: "A MODERN HEALTHCARE MANAGEMENT SYSTEMS ENGINE OVERSEEING DUAL WORKFLOW SCHEDULING ROUTINES AND COMPLIANCE CHANNELS.",
  },
};

const socialLinks = [
  { icon: Facebook, label: "Facebook", href: data.facebookLink },
  { icon: Instagram, label: "Instagram", href: data.instaLink },
  { icon: Twitter, label: "Twitter", href: data.twitterLink },
];

const aboutLinks = [
  { text: "OUR JOURNEY", href: data.about.history },
  { text: "OUR DOCTORS", href: data.about.team },
  { text: "PATIENT GUIDELINES", href: data.about.handbook },
  { text: "JOIN US", href: data.about.careers },
];

const serviceLinks = [
  { text: "BOOK APPOINTMENT", href: data.services.appointments },
  { text: "FIND DOCTORS", href: data.services.doctors },
  { text: "COMMUNITY SUPPORT", href: data.services.community },
  { text: "AI HEALTH ASSISTANT", href: data.services.aiassistant },
];

const helpfulLinks = [
  { text: "FAQS", href: data.help.faqs },
  { text: "PATIENT SUPPORT", href: data.help.support },
  { text: "CHAT WITH DOCTOR", href: data.help.livechat, hasIndicator: true },
];

const contactInfo = [
  { icon: Mail, text: data.contact.email },
  { icon: Phone, text: data.contact.phone },
  { icon: MapPin, text: data.contact.address, isAddress: true },
];

export default function Footer4Col() {
  return (
    // font-roboto-slab is the base font for all normal text in this footer
    <footer className="bg-transparent mt-16 w-full border-t-2 border-[#1F3A4B]/10 dark:border-white/10 relative z-10 font-roboto-slab">
      <div className="mx-auto max-w-screen-xl pt-16 pb-6 px-6 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          
          {/* Brand/Company Section */}
          <div className="space-y-6">
            <div className="flex justify-center sm:justify-start items-center">
              <span className="text-5xl  italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE]">
                HEALTH<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
              </span>
            </div>

            {/*  tracking-widest matches FAQ/features label style */}
            <p className="text-md tracking-widest leading-relaxed uppercase text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 text-center sm:text-left max-w-sm">
              {data.company.description}
            </p>

            <ul className="mt-8 flex justify-center gap-4 sm:justify-start">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] hover:scale-105 transition-all shadow-md"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Nav Links Grid */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:col-span-2">
            
            {/* About Us */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-md  uppercase tracking-widest mb-6">ABOUT US</p>
              {/*  tracking-widest matches FAQ/features link style */}
              <ul className="space-y-4 text-md  tracking-widest">
                {aboutLinks.map(({ text, href }) => (
                  <li key={text}>
                    <Link to={href} className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 hover:text-emerald-600 dark:hover:text-[#C2F84F] transition-colors">{text}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-md  uppercase tracking-widest mb-6">SERVICES</p>
              {/*  tracking-widest matches FAQ/features link style */}
              <ul className="space-y-4 text-md  tracking-widest">
                {serviceLinks.map(({ text, href }) => (
                  <li key={text}>
                    <Link to={href} className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 hover:text-emerald-600 dark:hover:text-[#C2F84F] transition-colors">{text}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-md  uppercase tracking-widest mb-6">HELP</p>
              {/*  tracking-widest matches FAQ/features link style */}
              <ul className="space-y-4 text-md  tracking-widest">
                {helpfulLinks.map(({ text, href, hasIndicator }) => (
                  <li key={text}>
                    <Link to={href} className={cn("transition-colors flex justify-center sm:justify-start items-center gap-2", hasIndicator ? "text-emerald-600 dark:text-[#C2F84F]" : "text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 hover:text-emerald-600 dark:hover:text-[#C2F84F]")}>
                      <span>{text}</span>
                      {hasIndicator && (
                        <span className="relative flex w-2 h-2">
                          <span className="bg-emerald-600 dark:bg-[#C2F84F] animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" />
                          <span className="bg-emerald-600 dark:bg-[#C2F84F] relative inline-flex w-2 h-2 rounded-full" />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-md  uppercase tracking-widest mb-6">CONTACT</p>
              {/*  tracking-widest matches FAQ/features link style */}
              <ul className="space-y-4 text-md  tracking-widest">
                {contactInfo.map(({ icon: Icon, text, isAddress }) => (
                  <li key={text}>
                    <a className="flex items-center justify-center gap-3 sm:justify-start group" href={isAddress ? `https://maps.google.com/search?q=${encodeURIComponent(text)}` : text.includes("@") ? `mailto:${text}` : `tel:${text}`} target={isAddress ? "_blank" : "_self"} rel={isAddress ? "noopener noreferrer" : undefined}>
                      <Icon className="text-[#1F3A4B] dark:text-[#C2F84F] w-5 h-5 shrink-0" />
                      <span className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/70 group-hover:text-[#1F3A4B] dark:group-hover:text-[#FAFDEE] transition-colors">{text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-16 border-t border-[#1F3A4B]/10 dark:border-white/10 pt-8">
          <div className="text-center sm:flex sm:justify-between sm:text-left">
            <p className="text-xs text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50  uppercase tracking-widest">ALL RIGHTS RESERVED.</p>
            <p className="text-xs text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50 mt-4 sm:mt-0  tracking-widest">&copy; 2026 {data.company.name.toUpperCase()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
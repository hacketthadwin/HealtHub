import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  facebookLink: "https://facebook.com/Healthub",
  instaLink: "https://instagram.com/Healthub",
  twitterLink: "https://twitter.com/Healthub",
  githubLink: "https://github.com/Healthub",
  dribbbleLink: "https://dribbble.com/Healthub",
  services: {
    appointments: "/book-appointment",
    doctors: "/book-appointment",
    community: "/community-support",
    aiassistant: "/login",
  },
  about: {
    history: "/about",
    team: "/book-appointment",
    handbook: "/about",
    careers: "/contact",
  },
  help: {
    faqs: "faq",
    support: "/contact",
    livechat: "/book-appointment",
  },
  contact: {
    email: "support@healthub.com",
    phone: "+91 8899223344",
    address: "Patna, Bihar, India",
  },
  company: {
    name: "HEALTHUB",
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
  { text: "FAQS", href: data.help.faqs, scrollTo: true },
  { text: "PATIENT SUPPORT", href: data.help.support },
  { text: "CHAT WITH DOCTOR", href: data.help.livechat, hasIndicator: true },
];

const contactInfo = [
  { icon: Mail, text: data.contact.email },
  { icon: Phone, text: data.contact.phone },
  { icon: MapPin, text: data.contact.address, isAddress: true },
];

export default function Footer4Col() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleFaqClick = () => {
    const scrollFaq = () => {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
    };

    if (location.pathname === "/") {
      scrollFaq();
    } else {
      navigate("/");
      setTimeout(scrollFaq, 350);
    }
  };

  return (
    <footer className="bg-white dark:bg-white/5 backdrop-blur-2xl mt-24 w-full border-t border-[#1F3A4B]/10 dark:border-white/5 relative z-10 font-roboto-slab antialiased">
      <div className="mx-auto max-w-screen-xl pt-16 pb-8 px-6 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          
          {/* Brand/Company Section */}
          <div className="space-y-6">
            <div className="flex justify-center sm:justify-start items-center">
              <span className="text-4xl md:text-5xl font-extrabold italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] font-sans">
                HEALT<span className="text-emerald-600 dark:text-[#C2F84F]">HUB</span>
              </span>
            </div>

            {/* Expanded brand text body context */}
            <p className="text-base font-medium tracking-widest leading-relaxed text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 text-center sm:text-left max-w-sm">
              {data.company.description}
            </p>

            <ul className="mt-8 flex justify-center gap-3.5 sm:justify-start">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#1F3A4B] dark:bg-white/5 text-white dark:text-[#C2F84F] hover:bg-emerald-600 dark:hover:bg-[#C2F84F] hover:text-white dark:hover:text-[#1F3A4B] hover:scale-105 transition-all shadow-md border border-transparent dark:border-white/5"
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
              {/* Category headings amplified safely to text-base */}
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-extrabold uppercase tracking-widest mb-6 font-sans">ABOUT US</p>
              <ul className="space-y-4 text-sm md:text-base font-bold tracking-wider">
                {aboutLinks.map(({ text, href }) => (
                  <li key={text}>
                    <Link to={href} className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 hover:text-emerald-600 dark:hover:text-[#C2F84F] transition-colors underline decoration-transparent hover:decoration-current decoration-2 underline-offset-4">{text}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-extrabold uppercase tracking-widest mb-6 font-sans">SERVICES</p>
              <ul className="space-y-4 text-sm md:text-base font-bold tracking-wider">
                {serviceLinks.map(({ text, href }) => (
                  <li key={text}>
                    <Link to={href} className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 hover:text-emerald-600 dark:hover:text-[#C2F84F] transition-colors underline decoration-transparent hover:decoration-current decoration-2 underline-offset-4">{text}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Help */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-extrabold uppercase tracking-widest mb-6 font-sans">HELP</p>
              <ul className="space-y-4 text-sm md:text-base font-bold tracking-wider">
                {helpfulLinks.map(({ text, href, hasIndicator, scrollTo }) => (
                  <li key={text}>
                    {scrollTo ? (
                      <button
                        type="button"
                        onClick={handleFaqClick}
                        className={cn("block w-full text-center sm:text-left transition-colors underline decoration-transparent hover:decoration-current decoration-2 underline-offset-4 text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 hover:text-emerald-600 dark:hover:text-[#C2F84F]", hasIndicator ? "flex justify-center sm:justify-start items-center gap-2" : "")}
                      >
                        <span>{text}</span>
                        {hasIndicator && (
                          <span className="relative flex w-2.5 h-2.5">
                            <span className="bg-emerald-600 dark:bg-[#C2F84F] animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" />
                            <span className="bg-emerald-600 dark:bg-[#C2F84F] relative inline-flex w-2.5 h-2.5 rounded-full" />
                          </span>
                        )}
                      </button>
                    ) : (
                      <Link to={href} className={cn("transition-colors flex justify-center sm:justify-start items-center gap-2 underline decoration-transparent hover:decoration-current decoration-2 underline-offset-4", hasIndicator ? "text-emerald-600 dark:text-[#C2F84F]" : "text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 hover:text-emerald-600 dark:hover:text-[#C2F84F]")}>
                        <span>{text}</span>
                        {hasIndicator && (
                          <span className="relative flex w-2.5 h-2.5">
                            <span className="bg-emerald-600 dark:bg-[#C2F84F] animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" />
                            <span className="bg-emerald-600 dark:bg-[#C2F84F] relative inline-flex w-2.5 h-2.5 rounded-full" />
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="text-center sm:text-left">
              <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-base font-extrabold uppercase tracking-widest mb-6 font-sans">CONTACT</p>
              <ul className="space-y-4 text-sm md:text-base font-bold tracking-wider">
                {contactInfo.map(({ icon: Icon, text, isAddress }) => (
                  <li key={text}>
                    <a className="flex items-center justify-center gap-3 sm:justify-start group" href={isAddress ? `https://maps.google.com/search?q=${encodeURIComponent(text)}` : text.includes("@") ? `mailto:${text}` : `tel:${text}`} target={isAddress ? "_blank" : "_self"} rel={isAddress ? "noopener noreferrer" : undefined}>
                      <Icon className="text-[#1F3A4B] dark:text-[#C2F84F] w-5 h-5 shrink-0" />
                      <span className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 group-hover:text-emerald-600 dark:group-hover:text-[#C2F84F] transition-colors underline decoration-transparent hover:decoration-current decoration-2 underline-offset-4">{text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Bottom — Base metrics bumped completely up to text-sm */}
        <div className="mt-16 border-t border-[#1F3A4B]/5 dark:border-white/5 pt-8">
          <div className="text-center sm:flex sm:justify-between sm:text-left">
            <p className="text-sm text-[#1F3A4B]/50 dark:text-[#FAFDEE]/40 font-bold uppercase tracking-widest">ALL RIGHTS RESERVED.</p>
            <p className="text-sm text-[#1F3A4B]/50 dark:text-[#FAFDEE]/40 mt-4 sm:mt-0 font-bold uppercase tracking-widest">© 2026 {data.company.name.toUpperCase()}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
import React, { useState, useRef, useEffect, memo, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import Earth from "../ui/globe";
import { SparklesCore } from "../ui/sparkles";
import { Label } from "../ui/label";
import { Check, Loader2 } from "lucide-react";
import { API_URL, pingServer } from "../../config/api";
import Header1 from "../UIcomponents/Header1";

// ─── Isolated Globe Panel ─────────────────────────────────────────────────────
const inputClass = `
  w-full h-12 sm:h-14 px-5 rounded-2xl border bg-[#1F3A4B]/5 dark:bg-white/5 
  font-bold text-sm sm:text-base outline-none transition-all duration-300 
  text-[#1F3A4B] dark:text-[#FAFDEE] normal-case tracking-wide 
  placeholder:text-xs placeholder:uppercase placeholder:tracking-wider
  border-[#1F3A4B]/10 dark:border-white/10
  focus:border-[#C2F84F] focus:ring-4 focus:ring-[#C2F84F]/20 focus:shadow-[0_0_20px_rgba(194,248,79,0.15)]
`;

const GlobePanel = memo(({ isInView }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
    transition={{ duration: 0.5, delay: 0.4 }}
    className="relative my-8 hidden items-center justify-center overflow-hidden px-4 min-[350px]:flex md:items-start md:px-0 md:pr-8"
  >
    <div className="flex flex-col items-center justify-center overflow-hidden w-full h-full">
      {/* Article text configuration matched cleanly to font-roboto-slab */}
      <article className="relative mx-auto h-[250px] sm:h-[350px] min-h-60 w-full max-w-[450px] overflow-hidden rounded-[2.5rem] border border-[#1F3A4B]/5 dark:border-white/5 bg-gradient-to-b from-[#C2F84F] to-[#C2F84F]/5 p-6 text-2xl sm:text-3xl font-medium italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] md:h-[450px] md:min-h-80 md:p-8 md:text-4xl md:leading-[1.05] lg:text-5xl font-roboto-slab">
        Your health matters.
        <br />
        <div className="absolute -right-16 -bottom-16 z-10 mx-auto flex h-full w-full max-w-[200px] sm:max-w-[300px] items-center justify-center transition-all duration-700 hover:scale-105 md:-right-28 md:-bottom-28 md:max-w-[550px]">
          <Earth
            scale={1.1}
            baseColor={[0.76, 0.97, 0.31]}
            markerColor={[0, 0, 0]}
            glowColor={[0.76, 0.97, 0.31]}
          />
        </div>
      </article>
    </div>
  </motion.div>
));
GlobePanel.displayName = "GlobePanel";

async function safeJsonParse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Server is starting up — please wait a few seconds and try again."
    );
  }
  return response.json();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ContactUs1() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadParticles, setLoadParticles] = useState(false);

  const formRef = useRef(null);
  const isInView = useInView(formRef, { once: true, amount: 0.1 });

  useEffect(() => {
    const timer = setTimeout(() => setLoadParticles(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    pingServer().catch(() => {});
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const response = await fetch(`${API_URL}/api/v1/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message.");
      }

      setName("");
      setEmail("");
      setMessage("");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (error) {
      console.error("Contact form error:", error);
      setErrorMsg(error.message || "Failed to send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, email, message]);

  return (
    <section
      className="relative w-full min-h-screen flex items-center justify-center py-10 md:pt-40 md:pb-16 overflow-y-auto transition-colors duration-300 font-roboto-slab select-none antialiased"
      style={{ backgroundColor: "var(--body-bg)", color: "var(--body-text)" }}
    >
      <Header1 />

      {/* Background Glows */}
      <div
        className="absolute top-0 left-0 h-[300px] w-[300px] md:h-[500px] md:w-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, var(--sparkle-neon), transparent 70%)`,
        }}
      />
      <div
        className="absolute right-0 bottom-0 h-[200px] w-[200px] md:h-[300px] md:w-[300px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, #476407, transparent 70%)`,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 flex items-center justify-center w-full">
        <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-white dark:bg-white/5 border border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl backdrop-blur-2xl">
          <div className="flex flex-col-reverse md:grid md:grid-cols-2 gap-0">

            {/* ── Form Side ── */}
            <div className="relative p-6 md:p-12" ref={formRef}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex w-full flex-wrap gap-x-2 relative z-20 items-baseline"
              >
                <h2 className="text-[#1F3A4B] dark:text-[#FAFDEE] mb-2 text-3xl sm:text-5xl font-extrabold italic tracking-tighter uppercase font-sans leading-none">
                  CONTACT
                </h2>
                <span className="text-[#476407] dark:text-[#C2F84F] relative z-10 text-3xl sm:text-5xl font-extrabold tracking-tighter italic uppercase font-sans leading-none">
                  HEALTHUB
                </span>

                {loadParticles && (
                  <SparklesCore
                    id="tsparticles-contact"
                    background="transparent"
                    minSize={0.6}
                    maxSize={1.4}
                    particleDensity={100}
                    className="absolute inset-0 -top-5 h-24 w-full pointer-events-none"
                    particleColor="#C2F84F"
                  />
                )}
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onSubmit={handleSubmit}
                className="mt-6 sm:mt-8 space-y-4 sm:space-y-6"
              >
                <p className="text-[#1F3A4B]/70 dark:text-[#FAFDEE]/60 text-xs sm:text-sm md:text-base font-bold tracking-wide leading-relaxed uppercase">
                  HAVE A QUESTION ABOUT APPOINTMENTS, DOCTOR AVAILABILITY, OR HEALTH
                  SUPPORT? SEND US A MESSAGE AND OUR TEAM WILL RESPOND SHORTLY.
                </p>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm font-bold tracking-widest uppercase opacity-80 text-[#1F3A4B] dark:text-[#FAFDEE] ml-1">
                      FULL NAME
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ENTER YOUR FULL NAME"
                      required
                      disabled={isSubmitting}
                      className={inputClass}                    
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm font-bold tracking-widest uppercase opacity-80 text-[#1F3A4B] dark:text-[#FAFDEE] ml-1">
                      EMAIL ADDRESS
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER YOUR EMAIL ADDRESS"
                      required
                      disabled={isSubmitting}
                      className={inputClass}                                        
                      />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs sm:text-sm font-bold tracking-widest uppercase opacity-80 text-[#1F3A4B] dark:text-[#FAFDEE] ml-1">
                    HOW CAN WE HELP YOU?
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="WRITE YOUR MESSAGE..."
                    required
                    disabled={isSubmitting}
                    className={inputClass}                                      />
                </div>

                {errorMsg && (
                  <p className="text-xs sm:text-sm font-bold tracking-wide uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 rounded-2xl px-5 py-3">
                    {errorMsg.toUpperCase()}
                  </p>
                )}

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full pt-1 sm:pt-2"
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 sm:h-14 rounded-2xl text-sm sm:text-base font-bold uppercase tracking-widest bg-[#476407] dark:bg-[#C2F84F] text-[#FAFDEE] dark:text-[#1F3A4B] shadow-xl transition-all duration-200 italic"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        SENDING...
                      </span>
                    ) : isSubmitted ? (
                      <span className="flex items-center justify-center text-emerald-600 dark:text-[#1F3A4B]">
                        <Check className="mr-2 h-5 w-5 stroke-[3]" />
                        MESSAGE SENT!
                      </span>
                    ) : (
                      <span>SEND MESSAGE</span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </div>

            {/* ── Globe Side ── */}
            <GlobePanel isInView={isInView} />
          </div>
        </div>
      </div>
    </section>
  );
}
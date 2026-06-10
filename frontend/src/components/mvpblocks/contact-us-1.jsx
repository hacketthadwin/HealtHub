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
// Extracted into its own memo'd component so that typing in the form
// (which updates name/email/message state) never triggers a re-render here.
const GlobePanel = memo(({ isInView }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
    transition={{ duration: 0.5, delay: 0.4 }}
    className="relative my-8 hidden items-center justify-center overflow-hidden px-4 min-[350px]:flex md:items-start md:px-0 md:pr-8"
  >
    <div className="flex flex-col items-center justify-center overflow-hidden w-full h-full">
      <article className="relative mx-auto h-[350px] min-h-60 w-full max-w-[450px] overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-gradient-to-b from-[#C2F84F] to-[#C2F84F]/5 p-6 text-3xl  italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] md:h-[450px] md:min-h-80 md:p-8 md:text-4xl md:leading-[1.05] lg:text-5xl">
        Your health matters.
        <br />
        <div className="absolute -right-20 -bottom-20 z-10 mx-auto flex h-full w-full max-w-[300px] items-center justify-center transition-all duration-700 hover:scale-105 md:-right-28 md:-bottom-28 md:max-w-[550px]">
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

// ─── Helper: safe JSON parse (handles HTML error pages from sleeping server) ──
async function safeJsonParse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // Server returned HTML (e.g. Render's 503 while waking up)
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

  // Defer sparkle init so the primary canvas settles first
  useEffect(() => {
    const timer = setTimeout(() => setLoadParticles(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Pre-warm the Render server as soon as the page mounts — avoids cold-start
  // HTML response that causes the JSON parse crash when the user submits.
  useEffect(() => {
    pingServer().catch(() => {/* silent — best-effort */});
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

      // Safe parse — won't crash on HTML error pages
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
    // font-roboto-slab is the base font for all normal text in this page
    <section
      className="relative w-full min-h-screen flex items-center justify-center pt-40 pb-16 overflow-y-auto transition-colors duration-300 font-roboto-slab select-none"
      style={{ backgroundColor: "var(--body-bg)", color: "var(--body-text)" }}
    >
      <Header1 />

      {/* Background Glows */}
      <div
        className="absolute top-0 left-0 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, var(--sparkle-neon), transparent 70%)`,
        }}
      />
      <div
        className="absolute right-0 bottom-0 h-[300px] w-[300px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, #476407, transparent 70%)`,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 md:px-6 flex items-center justify-center w-full">
        <div className="mx-auto w-full max-w-7xl overflow-hidden rounded-[28px] backdrop-blur-sm">
          <div className="grid md:grid-cols-2 gap-4">

            {/* ── Form Side ── */}
            <div className="relative p-6 md:p-10" ref={formRef}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex w-full gap-2 relative z-20"
              >
                <h2 className="from-foreground to-foreground/80 mb-2 bg-gradient-to-r bg-clip-text text-4xl font-black italic tracking-tighter uppercase md:text-5xl">
                  Contact
                </h2>
                <span className="text-[#476407] dark:text-[#C2F84F] relative z-10 w-full text-4xl font-black tracking-tighter italic uppercase md:text-5xl">
                  HealthHub
                </span>

                {loadParticles && (
                  <SparklesCore
                    id="tsparticles-contact"
                    background="transparent"
                    minSize={0.6}
                    maxSize={1.4}
                    particleDensity={200}
                    className="absolute inset-0 -top-5 h-32 w-full pointer-events-none"
                    particleColor="#C2F84F"
                  />
                )}
              </motion.div>

              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                onSubmit={handleSubmit}
                className="mt-8 space-y-6"
              >
                {/* tracking-wide matches FAQ answer body text style */}
                <p className="text-muted-foreground text-sm md:text-base tracking-wide leading-relaxed uppercase">
                  Have a question about appointments, doctor availability, or health
                  support? Send us a message and our team will respond shortly.
                </p>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    {/*  tracking-widest uppercase matches FAQ/features label style */}
                    <Label htmlFor="name" className="text-sm  tracking-widest uppercase opacity-80">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ENTER YOUR FULL NAME"
                      required
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] focus:bg-transparent dark:focus:bg-transparent focus:ring-2 focus:ring-[#C2F84F] focus:border-transparent transition-all duration-200 outline-none shadow-inner"
                    />
                  </div>

                  <div className="space-y-2">
                    {/*  tracking-widest uppercase matches FAQ/features label style */}
                    <Label htmlFor="email" className="text-sm  tracking-widest uppercase opacity-80">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ENTER YOUR EMAIL ADDRESS"
                      required
                      className="w-full h-12 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] focus:bg-transparent dark:focus:bg-transparent focus:ring-2 focus:ring-[#C2F84F] focus:border-transparent transition-all duration-200 outline-none shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {/*  tracking-widest uppercase matches FAQ/features label style */}
                  <Label htmlFor="message" className="text-sm  tracking-widest uppercase opacity-80">
                    How can we help you?
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="WRITE YOUR MESSAGE ABOUT APPOINTMENTS, DOCTORS, OR HEALTH QUERIES..."
                    required
                    className="w-full h-40 p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] focus:bg-transparent dark:focus:bg-transparent focus:ring-2 focus:ring-[#C2F84F] focus:border-transparent transition-all duration-200 outline-none resize-none shadow-inner leading-relaxed"
                  />
                </div>

                {/* Error message —  tracking-wide matches FAQ body text style */}
                {errorMsg && (
                  <p className="text-sm  tracking-wide uppercase text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 rounded-xl px-4 py-3">
                    {errorMsg}
                  </p>
                )}

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full pt-2"
                >
                  {/*  uppercase tracking-widest matches FAQ contact button style */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl text-sm  uppercase tracking-widest bg-[#476407] dark:bg-[#C2F84F] text-[#FAFDEE] dark:text-[#1F3A4B] shadow-md transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : isSubmitted ? (
                      <span className="flex items-center justify-center">
                        <Check className="mr-2 h-4 w-4" />
                        Message Sent!
                      </span>
                    ) : (
                      <span>Send Message</span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </div>

            {/* ── Globe Side (isolated — never re-renders on keystrokes) ── */}
            <GlobePanel isInView={isInView} />
          </div>
        </div>
      </div>
    </section>
  );
}
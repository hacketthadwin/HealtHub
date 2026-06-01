import React, { useState, useRef, useId, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";
import { Check, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../../context/ThemeContext';
import Header1 from '../UIcomponents/Header1';
import axios from "axios";
import { API_URL } from "../../config/api";
const NumberFlow = ({ value, format, transformTiming, className }) => {
  const formattedValue = new Intl.NumberFormat('en-IN', format).format(value);
  return (
    <span 
      className={className}
      style={{ 
        transition: `all ${transformTiming?.duration || 500}ms ${transformTiming?.easing || 'ease-out'}`,
      }}
    >
      {formattedValue}
    </span>
  );
};

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

const plans = [
  {
    name: "Patient Plan",
    price: "499",
    yearlyPrice: "399",
    period: "month",
    features: [
      "Priority matchmaking with available doctors",
      "Faster appointment confirmations",
      "Access to upgraded AI health assistant",
      "Unlimited symptom checks",
      "Priority chat response from doctors",
      "Community health discussions",
    ],
    description: "Best for patients who want faster responses and enhanced AI support.",
    buttonText: "Subscribe as Patient",
    href: "/signup",
    isPopular: false,
    cornerStyle: "sm:translate-x-2 sm:rounded-br-[2px]",
  },
  {
    name: "Premium Doctor Plan",
    price: "1999",
    yearlyPrice: "1599",
    period: "month",
    features: [
      "Premium Doctor Badge on profile",
      "Higher visibility to patients",
      "Priority listing in search results",
      "Advanced analytics for patient engagement",
      "Faster support and verification",
      "Unlimited appointments",
      "Direct patient chat access with priority routing",
    ],
    description: "Ideal for doctors who want more visibility, insights, and patient reach.",
    buttonText: "Upgrade as Doctor",
    href: "/signup",
    isPopular: true,
    cornerStyle: "sm:-translate-x-2 sm:rounded-br-[2px]",
  },
];

const MotionDiv = ({ children, initial, whileInView, viewport, transition, className, style }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && viewport?.once) {
          setIsVisible(true);
          observer.disconnect();
        } else if (entry.isIntersecting) {
          setIsVisible(true);
        } else if (!viewport?.once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [viewport?.once]);

  const getTransform = () => {
    if (!isVisible || !whileInView) return {};
    
    const transforms = [];
    if (whileInView.y !== undefined) transforms.push(`translateY(${whileInView.y}px)`);
    if (whileInView.x !== undefined) transforms.push(`translateX(${whileInView.x}px)`);
    if (whileInView.scale !== undefined) transforms.push(`scale(${whileInView.scale})`);
    
    return {
      transform: transforms.length > 0 ? transforms.join(' ') : 'none',
      opacity: whileInView.opacity !== undefined ? whileInView.opacity : 1,
      transition: `all ${transition?.duration || 0.6}s ${transition?.type === 'spring' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out'}`,
      transitionDelay: `${transition?.delay || 0}s`,
    };
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        ...getTransform(),
        opacity: isVisible ? (whileInView?.opacity !== undefined ? whileInView.opacity : 1) : (initial?.opacity || 1),
      }}
    >
      {children}
    </div>
  );
};

export default function CongestedPricing() {
  const [isMonthly, setIsMonthly] = useState(true);
  const { isDarkMode } = useTheme();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isLoaded, setIsLoaded] = useState(false); // Controls the full visibility lifecycle
  const switchRef = useRef(null);
  const switchId = useId();

  // Bumping the visual hold to match the WebGL compilation footprint of the contact canvas globe
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 280); 
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = (checked) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: ['#476407', '#C2F84F', '#FAFDEE', '#1F3A4B'],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

const getPlanType = (plan) => {
  if (plan.name.toLowerCase().includes("doctor")) {
    return isMonthly ? "doctor_monthly" : "doctor_yearly";
  }
  return isMonthly ? "patient_monthly" : "patient_yearly";
};

const handlePayment = async (plan) => {
  try {
    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Please login first");
      return;
    }

    const planType = getPlanType(plan);
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch the public Razorpay key from the backend so the frontend
    // never needs REACT_APP_RAZORPAY_KEY_ID in its own .env file
    const { data: keyData } = await axios.get(
      `${API_URL}/api/v1/payment/razorpay-key`,
      authHeaders
    );

    // Create the order — backend resolves the price from planType server-side
    const { data } = await axios.post(
      `${API_URL}/api/v1/payment/create-order`,
      { planType },
      authHeaders
    );

    const options = {
      key:         keyData.keyId,
      amount:      data.amount,
      currency:    data.currency,
      name:        "HealthHub",
      description: plan.name,
      order_id:    data.id,
      handler: async function (response) {
        try {
          await axios.post(
            `${API_URL}/api/v1/payment/verify-payment`,
            { ...response, planType },
            authHeaders
          );
          alert("Payment Successful! Your account has been upgraded.");
        } catch (error) {
          console.error(error);
          alert("Payment Verification Failed");
        }
      },
    };

    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
  } catch (error) {
    console.error(error);
    alert("Payment Failed. Please try again.");
  }
};

  return (
    <div 
      className="w-full min-h-screen transition-colors duration-300 font-sans overflow-x-hidden relative select-none pt-44 pb-20 px-6"
      style={{ backgroundColor: 'var(--body-bg)', color: 'var(--body-text)' }}
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
      
      {/* Wraps everything in an elegant fade-in transition to perfectly match the contact page's pacing */}
      <AnimatePresence mode="wait">
        {isLoaded ? (
          <motion.div
            key="pricing-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "linear" }}
            className="w-full max-w-7xl mx-auto relative z-10"
          >
            {/* Header Block */}
            <div className="mb-12 space-y-4 text-center">
              <div className="bg-[#1F3A4B] dark:bg-[#C2F84F] text-white dark:text-[#1F3A4B] relative mx-auto w-fit rounded-full px-4 py-1.5 text-xs font-bold tracking-wide uppercase">
                <span className="relative z-1">Pricing Models</span>
              </div>
              <h2 className="text-[#1F3A4B] dark:text-[#FAFDEE] text-3xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                Simple, Transparent Pricing for <span className="text-emerald-600 dark:text-[#C2F84F]">Everyone</span>
              </h2>
              <p className="text-base md:text-lg font-medium text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 max-w-2xl mx-auto leading-relaxed">
                Choose the plan that works for you. All plans include full access to our comprehensive dashboard configurations and tools.
              </p>
            </div>

            {/* Toggle Controls */}
            <div className="flex justify-center items-center gap-3 relative z-20 mb-16">
              <div className="inline-flex items-center gap-3 rounded-full px-4 py-2 bg-white dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/10 shadow-sm">
                <Switch 
                  className="transition-colors duration-300 border border-transparent dark:border-white/10" 
                  style={{ 
                    backgroundColor: !isMonthly 
                      ? (isDarkMode ? '#C2F84F' : '#476407') 
                      : (isDarkMode ? '#385870' : '#CBD5E1') 
                  }}
                  id={switchId}
                  ref={switchRef}
                  checked={!isMonthly}
                  onCheckedChange={handleToggle}
                />
                <Label 
                  htmlFor={switchId} 
                  className="cursor-pointer font-semibold text-sm text-[#1F3A4B] dark:text-[#FAFDEE] transition-colors duration-300 select-none"
                >
                  Annual billing
                </Label>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white dark:text-black bg-[#476407] dark:bg-[#C2F84F] transition-colors duration-300 shadow-sm">
                Save 20%
              </span>
            </div>

            {/* Cards Matrix Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 w-full max-w-6xl mx-auto items-stretch">
              {plans.map((plan, index) => (
                <MotionDiv
                  key={index}
                  initial={{ y: 30, opacity: 1 }}
                  whileInView={
                    isDesktop
                      ? {
                          y: plan.isPopular ? -12 : 0,
                          opacity: 1,
                          x: 0,
                          scale: plan.isPopular ? 1.02 : 0.98,
                        }
                      : {}
                  }
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    type: 'spring',
                    stiffness: 90,
                    damping: 20
                  }}
                  className={cn(
                    "relative rounded-[2.5rem] px-8 py-10 border-2 transition-all duration-300 flex flex-col justify-between h-full bg-white dark:bg-white/5",
                    plan.isPopular 
                      ? "border-[#C2F84F] dark:border-[#C2F84F] z-10 shadow-2xl" 
                      : "border-[#1F3A4B]/10 dark:border-white/10 z-0 hover:border-emerald-500 dark:hover:border-[#C2F84F]",
                    plan.cornerStyle
                  )}
                >
                  {plan.isPopular && (
                    <div className="absolute top-4 right-4 flex items-center rounded-full px-3 py-1.5 bg-[#C2F84F] text-black shadow-sm z-20">
                      <Star className="h-3.5 w-3.5 fill-current text-black" />
                      <span className="ml-1 text-xs font-bold uppercase tracking-wider">
                        Popular
                      </span>
                    </div>
                  )}

                  {/* Upper Content Section */}
                  <div className="flex flex-col flex-1">
                    <div>
                      <p className="text-[#1F3A4B] dark:text-[#FAFDEE] text-xl font-bold tracking-tight mb-4">
                        {plan.name}
                      </p>
                      
                      {/* Indian Currency Segment */}
                      <div className="flex items-baseline gap-x-1">
                        <span className="text-4xl font-black italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">
                          <NumberFlow
                            value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                            format={{
                              style: "currency",
                              currency: "INR",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }}
                            transformTiming={{
                              duration: 400,
                              easing: "ease-out",
                            }}
                          />
                        </span>
                        <span className="text-sm font-medium opacity-60 text-[#1F3A4B] dark:text-[#FAFDEE]">
                          / {plan.period}
                        </span>
                      </div>

                      <p className="text-xs opacity-50 mt-1">
                        {isMonthly ? "Billed monthly" : "Billed annually"}
                      </p>

                      {/* Feature Rows */}
                      <ul className="mt-8 flex flex-col gap-4">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500 dark:text-[#C2F84F]" />
                            <span className="text-[#1F3A4B]/80 dark:text-[#FAFDEE]/80 font-medium leading-relaxed">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Lower Action Block */}
                  <div className="mt-8">
                    <hr className="my-6 w-full border-[#1F3A4B]/10 dark:border-white/10" />

                  <button
                    onClick={() =>
                      handlePayment(plan)
                    }
                    className={cn(
                      "block w-full px-4 py-3.5 rounded-xl font-bold text-center text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                      plan.isPopular
                        ? "bg-[#C2F84F] text-black shadow-md shadow-[#C2F84F]/10"
                        : "bg-[#1F3A4B] dark:bg-white text-white dark:text-black shadow-sm"
                    )}
                  >
                    {plan.buttonText}
                  </button>
                    
                    <p className="mt-4 text-sm font-medium opacity-70 leading-relaxed text-[#1F3A4B] dark:text-[#FAFDEE]">
                      {plan.description}
                    </p>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Empty placeholder slot to preserve identical bounding box layout geometry while components compiling */
          <div className="w-full h-screen" key="pricing-loader" />
        )}
      </AnimatePresence>
    </div>
  );
}
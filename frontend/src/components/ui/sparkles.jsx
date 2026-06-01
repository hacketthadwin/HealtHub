"use client";
import React, { useId, useEffect, useState, memo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { cn } from "../../lib/utils";
import { motion, useAnimation } from "framer-motion";

// Singleton engine init — only loads once regardless of how many
// SparklesCore instances exist on the page.
let engineReady = false;
let enginePromise = null;
function getEngine() {
  if (!enginePromise) {
    enginePromise = initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => { engineReady = true; });
  }
  return enginePromise;
}

export const SparklesCore = memo((props) => {
  const {
    id,
    className,
    background,
    minSize,
    maxSize,
    speed,
    particleColor,
    particleDensity,
  } = props;

  const [init, setInit] = useState(engineReady);
  const controls = useAnimation();
  const generatedId = useId();

  useEffect(() => {
    if (engineReady) { setInit(true); return; }
    getEngine().then(() => setInit(true));
  }, []);

  const particlesLoaded = async (container) => {
    if (container) {
      controls.start({ opacity: 1, transition: { duration: 1 } });
    }
  };

  return (
    <motion.div animate={controls} className={cn("opacity-0", className)}>
      {init && (
        <Particles
          id={id || generatedId}
          className={cn("h-full w-full")}
          particlesLoaded={particlesLoaded}
          options={{
            background: { color: { value: background || "transparent" } },
            fullScreen: { enable: false, zIndex: 1 },
            fpsLimit: 30,          // ↓ was 120 — massively reduces main-thread pressure
            interactivity: {
              events: {
                onClick: { enable: false },   // disabled — no need for push effect
                onHover: { enable: false },
                resize: true,
              },
            },
            particles: {
              color: { value: particleColor || "#ffffff" },
              move: {
                direction: "none",
                enable: true,
                outModes: { default: "out" },
                speed: { min: 0.1, max: 0.6 }, // ↓ was max:1
                random: false,
                straight: false,
              },
              number: {
                density: { enable: true, width: 400, height: 400 },
                value: particleDensity || 80, // ↓ was 120 default
              },
              opacity: {
                value: { min: 0.1, max: 1 },
                animation: {
                  enable: true,
                  speed: speed || 2,  // ↓ was 4
                  sync: false,
                  mode: "auto",
                  startValue: "random",
                  destroy: "none",
                },
              },
              size: {
                value: { min: minSize || 1, max: maxSize || 3 },
              },
              shape: { type: "circle" },
              reduceDuplicates: true,
            },
            detectRetina: false,  // ↓ was true — retina doubles canvas size
          }}
        />
      )}
    </motion.div>
  );
});

SparklesCore.displayName = "SparklesCore";
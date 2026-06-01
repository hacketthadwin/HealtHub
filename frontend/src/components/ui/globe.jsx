"use client";
import React, { useEffect, useRef, memo } from "react";
import createGlobe from "cobe";
import { cn } from "../../lib/utils";

const Earth = memo(({
  className,
  theta = 0.25,
  dark = 1,
  scale = 1.1,
  diffuse = 1.2,
  mapSamples = 16000,       // ↓ was 40000 — cuts GPU load by ~60%
  mapBrightness = 6,
  baseColor = [0.4, 0.6509, 1],
  markerColor = [1, 0, 0],
  glowColor = [0.2745, 0.5765, 0.898],
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let width = 0;
    const onResize = () =>
      canvasRef.current && (width = canvasRef.current.offsetWidth);
    window.addEventListener("resize", onResize);
    onResize();

    let phi = 0;
    // Use a lower DPR so the canvas is smaller in memory — avoids competing
    // with the main-thread JS when the user types in the contact form.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: 0,
      theta,
      dark,
      scale,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
      opacity: 1,
      offset: [0, 0],
      markers: [],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.003;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  // Stringify arrays so the effect only re-runs when values actually change,
  // not on every parent render (prevents globe flicker when typing).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    theta, dark, scale, diffuse, mapSamples, mapBrightness,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(baseColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(markerColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(glowColor),
  ]);

  return (
    <div
      className={cn(
        "z-[10] mx-auto flex w-full max-w-[350px] items-center justify-center",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          aspectRatio: "1",
          willChange: "transform", // hint to browser: keep in GPU layer
        }}
      />
    </div>
  );
});

Earth.displayName = "Earth";
export default Earth;
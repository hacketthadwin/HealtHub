import React, { useState, useEffect } from 'react';

/**
 * Preloader Component
 *
 * This component displays a loading percentage counter from 0 to 100%
 * over a duration of 5 seconds. It is designed to overlay the application
 * content during initial loading.
 *
 * @param {object} props - The component's props.
 * @param {function} props.onComplete - A callback function that is called
 * when the preloader animation finishes (reaches 100%).
 */
const Preloader = ({ onComplete }) => {
  // State to hold the current loading percentage
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    // Set up an interval to increment the percentage.
    // The total duration is 5 seconds (5000 milliseconds).
    // To count from 0 to 100, we increment by 1 every 50ms (5000ms / 100 steps = 50ms per step).
    const interval = setInterval(() => {
      setPercentage((prevPercentage) => {
        // Check if the percentage has reached or exceeded 100.
        if (prevPercentage >= 100) {
          clearInterval(interval); // Stop the interval
          onComplete(); // Call the onComplete callback to signal completion
          return 100; // Ensure the percentage is exactly 100
        }
        // Increment the percentage for the next step
        return prevPercentage + 1;
      });
    }, 50); // Interval duration in milliseconds

    // Cleanup function: This runs when the component unmounts or
    // before the effect re-runs (though in this case, it only runs once).
    // It's crucial to clear the interval to prevent memory leaks.
    return () => clearInterval(interval);
  }, [onComplete]); // Dependency array: Re-run effect if onComplete prop changes

  return (
    // Fixed position to cover the entire viewport, high z-index to be on top
    // Applying the new radial gradient background
    <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_farthest-corner_at_-24.7%_-47.3%,_rgba(6,130,165,1)_0%,_rgba(34,48,86,1)_66.8%,_rgba(15,23,42,1)_100.2%)] z-50">
      {/* The inner container is now transparent and retains its layout properties.
          Shadow is kept for visual depth, but you can remove it if preferred. */}
      <div className="flex flex-col items-center p-8 rounded-xl shadow-2xl transform transition-all duration-300 ease-in-out hover:scale-105">
        {/*
          Removed: <h1>Loading...</h1>
          Removed: Progress bar container and its inner div
        */}
        {/* Percentage text display - now much larger and responsive */}
        <p className="text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold text-center drop-shadow-lg transition-all duration-75 ease-out">
          {percentage}%
        </p>
      </div>
    </div>
  );
};

export default Preloader;

import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Skiper19 from './UIcomponents/BackgroundScrollStroke';
// import { useTheme } from '../context/ThemeContext';
import Header1 from './UIcomponents/Header1';
import Feature3 from './mvpblocks/feature-3';
import Faq3 from './mvpblocks/faq-3';
import Footer4Col from './mvpblocks/footer-4col';

const HomePage = () => {
  // const { isDarkMode, toggleTheme } = useTheme();

  const createStyledChart = (canvasRef, type, data, options) => {
    if (canvasRef.current) {
      if (canvasRef.current.chart) {
        canvasRef.current.chart.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      
      // Create Vibrant Gradient for Area Fill
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(194, 248, 79, 0.4)'); // Glowing Lime
      gradient.addColorStop(1, 'rgba(194, 248, 79, 0)');   // Transparent

      // Force Visibility on Data Series
      if (data.datasets[0]) {
        data.datasets[0].fill = type === 'line';
        data.datasets[0].backgroundColor = type === 'line' ? gradient : '#C2F84F';
        data.datasets[0].borderColor = '#C2F84F'; 
        data.datasets[0].borderWidth = 4;
        data.datasets[0].pointRadius = 5;
        data.datasets[0].pointHoverRadius = 8;
        data.datasets[0].pointBackgroundColor = '#FAFDEE'; // Off-white points for pop
      }

      canvasRef.current.chart = new Chart(canvasRef.current, {
        type,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1F3A4B',
              titleColor: '#C2F84F',
              bodyColor: '#FAFDEE',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 14, weight: '800' },
              padding: 12,
              cornerRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(250, 253, 238, 0.2)'
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: '#FAFDEE', // High visibility Off-White
                font: { size: 11, weight: '800' },
                padding: 10
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(250, 253, 238, 0.1)', // Dim off-white grid lines
                drawBorder: false
              },
              ticks: {
                color: '#FAFDEE', // High visibility Off-White
                font: { size: 11, weight: '800' },
                callback: (v) => v + (type === 'line' ? '' : '')
              }
            }
          },
          ...options
        }
      });
    }
  };

  const chartLineCanvasRef = useRef(null);
  useEffect(() => {
    const lineChartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Total Active Patients',
        data: [120, 240, 450, 780, 1100, 1500, 2100], // Showing explosive platform growth
        borderColor: 'rgba(50,205,50,1)',
        backgroundColor: 'rgba(50,205,50,0.2)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(50,205,50,1)',
      }],
    };
    createStyledChart(chartLineCanvasRef, 'line', lineChartData);
    const currentCanvas = chartLineCanvasRef.current;

    return () => {
      currentCanvas?.chart?.destroy();
    };
  }, []);

  const chartBarCanvasRef = useRef(null);
  useEffect(() => {
    const barChartData = {
      labels: ['Pending', 'Confirmed', 'Completed', 'AI Assisted'],
      datasets: [{
        label: 'Appointments Handled',
        data: [85, 340, 620, 410], // Directly mapping to your doctor/patient triage systems
        backgroundColor: [
          'rgba(255,0,255,0.7)',
          'rgba(0,255,255,0.7)',
          'rgba(255,215,0,0.7)',
          'rgba(50,205,50,0.7)',
        ],
        borderColor: [
          'rgba(255,0,255,1)',
          'rgba(0,255,255,1)',
          'rgba(255,215,0,1)',
          'rgba(50,205,50,1)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      }]
    };
    createStyledChart(chartBarCanvasRef, 'bar', barChartData);
    const currentCanvas = chartBarCanvasRef.current;

    return () => {
      currentCanvas?.chart?.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans overflow-x-hidden relative select-none" style={{ backgroundColor: 'var(--body-bg)', color: 'var(--body-text)' }}>
      
      {/* Background Pipeline Layer */}
      <div className="absolute inset-0 top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <Skiper19 />
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full blur-[140px] opacity-25 dark:opacity-15" style={{ backgroundColor: 'var(--sparkle-neon)' }} />
        <div className="absolute bottom-[#10%] right-[-5%] w-[35%] h-[35%] bg-cyan-500 rounded-full blur-[140px] opacity-25 dark:opacity-15" />
      </div>

      <Header1 />

      {/* Main Structural Scrolling Layout Matrix */}
      <div className="relative z-10 mx-auto max-w-[1700px] flex flex-col items-center pt-36 pb-24 justify-start px-6 md:px-10 space-y-16 md:space-y-24 will-change-transform">
        
        {/* Core Tag Header */}
        <h1 className="w-full font-sans text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black italic tracking-tighter text-center uppercase leading-none">
          Where modern <br /> healthcare meets <br />
          <span style={{ color: 'var(--sparkle-neon)' }}>modern solutions</span>
        </h1>

        {/* Real-time System Traction Analytics Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          
          {/* User Scaling Line Graph */}
          <div className="bg-black/20 backdrop-blur-sm rounded-[2.5rem] md:rounded-[4rem] border-2 border-[#1F3A4B]/10 dark:border-white/10 p-4 sm:p-6 md:p-10 shadow-2xl relative overflow-hidden group will-change-transform">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">Patient Registrations</h2>
              <span className="px-3 py-1 bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/10 text-xs font-medium tracking-wide rounded-md text-[#1F3A4B] dark:text-[#FAFDEE]">Growth Over Time</span>
            </div>
            <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
              <canvas ref={chartLineCanvasRef}></canvas>
            </div>
          </div>

          {/* Workflow Status Bar Graph */}
          <div className="bg-black/20 backdrop-blur-sm rounded-[2.5rem] md:rounded-[4rem] border-2 border-[#1F3A4B]/10 dark:border-white/10 p-4 sm:p-6 md:p-10 shadow-2xl relative overflow-hidden group will-change-transform">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">Appointment Status</h2>
              <span className="px-3 py-1 bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/10 text-xs font-medium tracking-wide rounded-md text-[#1F3A4B] dark:text-[#FAFDEE]">Current Numbers</span>
            </div>
            <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
              <canvas ref={chartBarCanvasRef}></canvas>
            </div>
          </div>

        </div>

        {/* Supporting Layout Core Inclusions */}
        <div className="w-full space-y-16 md:space-y-24 relative z-10">

          {/* Features section — id used by header scroll nav */}
          <div id="features" className="scroll-mt-24">
            <Feature3 />
          </div>

          {/* FAQ section — id used by header scroll nav */}
          <div id="faq" className="scroll-mt-24">
            <Faq3 />
          </div>

        </div>

        <Footer4Col />
      </div>
    </div>
  );
};

export default HomePage;
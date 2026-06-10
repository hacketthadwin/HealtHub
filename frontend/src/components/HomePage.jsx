import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Skiper19 from './UIcomponents/BackgroundScrollStroke';
import Header1 from './UIcomponents/Header1';
import Feature3 from './mvpblocks/feature-3';
import Faq3 from './mvpblocks/faq-3';
import Footer4Col from './mvpblocks/footer-4col';

const HomePage = () => {

  const createStyledChart = (canvasRef, type, data, options) => {
    if (canvasRef.current) {
      if (canvasRef.current.chart) {
        canvasRef.current.chart.destroy();
      }

      const ctx = canvasRef.current.getContext('2d');
      const isDark = document.documentElement.classList.contains('dark');
      const dynamicLabelColor = isDark ? '#FAFDEE' : '#1F3A4B';
      
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(194, 248, 79, 0.4)');
      gradient.addColorStop(1, 'rgba(194, 248, 79, 0)');

      if (data.datasets[0]) {
        data.datasets[0].fill = type === 'line';
        data.datasets[0].backgroundColor = type === 'line' ? gradient : '#C2F84F';
        data.datasets[0].borderColor = '#C2F84F'; 
        data.datasets[0].borderWidth = 4;
        data.datasets[0].pointRadius = 5;
        data.datasets[0].pointHoverRadius = 8;
        data.datasets[0].pointBackgroundColor = isDark ? '#FAFDEE' : '#1F3A4B';
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
                color: dynamicLabelColor,
                /* Restored original unmapped chart fonts layout */
                font: { size: 11, weight: '800' },
                padding: 10
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: isDark ? 'rgba(250, 253, 238, 0.1)' : 'rgba(31, 58, 75, 0.05)',
                drawBorder: false
              },
              ticks: {
                color: dynamicLabelColor,
                /* Restored original unmapped chart fonts layout */
                font: { size: 11, weight: '800' },
                callback: (v) => v
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
    const currentLineCanvas = chartLineCanvasRef.current;
    
    const lineChartData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [{
        label: 'Total Active Patients',
        data: [120, 240, 450, 780, 1100, 1500, 2100],
        tension: 0.4,
      }],
    };
    
    createStyledChart(chartLineCanvasRef, 'line', lineChartData);

    const handleThemeChange = () => {
      createStyledChart(chartLineCanvasRef, 'line', lineChartData);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      currentLineCanvas?.chart?.destroy();
    };
  }, []);

  const chartBarCanvasRef = useRef(null);
  useEffect(() => {
    const currentBarCanvas = chartBarCanvasRef.current;
    
    const barChartData = {
      labels: ['Pending', 'Confirmed', 'Completed', 'AI Assisted'],
      datasets: [{
        label: 'Appointments Handled',
        data: [85, 340, 620, 410],
        borderWidth: 2,
        borderRadius: 8,
      }]
    };
    
    createStyledChart(chartBarCanvasRef, 'bar', barChartData);

    const handleThemeChange = () => {
      createStyledChart(chartBarCanvasRef, 'bar', barChartData);
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      currentBarCanvas?.chart?.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 font-roboto-slab overflow-x-hidden relative select-none" style={{ backgroundColor: 'var(--body-bg)', color: 'var(--body-text)' }}>
      
      {/* background pipeline layer */}
      <div className="absolute inset-0 top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <Skiper19 />
        <div className="absolute top-[-5%] left-[-5%] w-[45%] h-[45%] rounded-full blur-[140px] opacity-25 dark:opacity-15" style={{ backgroundColor: 'var(--sparkle-neon)' }} />
        <div className="absolute bottom-[#10%] right-[-5%] w-[35%] h-[35%] bg-cyan-500 rounded-full blur-[140px] opacity-25 dark:opacity-15" />
      </div>

      <Header1 />

      <div className="relative z-10 mx-auto max-w-[1700px] flex flex-col items-center pt-36 pb-6 justify-start md:px-10 space-y-16 md:space-y-24 will-change-transform">
        
        {/* core tag header */}
        <h1 className="w-full font-sans text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold italic tracking-tighter text-center uppercase leading-none">
          Where modern <br /> healthcare meets <br />
          <span style={{ color: 'var(--sparkle-neon)' }}>modern solutions</span>
        </h1>

        {/* real-time analytics grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 px-4 sm:px-0">
          
          {/* user scaling line graph */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] border border-[#1F3A4B]/5 dark:border-white/5 p-6 md:p-10 shadow-3xl relative overflow-hidden group will-change-transform">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-3xl font-extrabold italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">Patient Registrations</h2>
              <span className="px-4 py-1.5 bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/10 text-sm font-bold uppercase tracking-wider rounded-full text-[#1F3A4B] dark:text-[#FAFDEE]">Growth Over Time</span>
            </div>
            <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
              <canvas ref={chartLineCanvasRef}></canvas>
            </div>
          </div>

          {/* workflow status bar graph */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] border border-[#1F3A4B]/5 dark:border-white/5 p-6 md:p-10 shadow-3xl relative overflow-hidden group will-change-transform">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-3xl font-extrabold italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE] font-sans leading-none">Appointment Status</h2>
              <span className="px-4 py-1.5 bg-[#1F3A4B]/5 dark:bg-white/5 border border-[#1F3A4B]/10 dark:border-white/10 text-sm font-bold uppercase tracking-wider rounded-full text-[#1F3A4B] dark:text-[#FAFDEE]">Current Numbers</span>
            </div>
            <div className="h-48 sm:h-56 md:h-64 lg:h-72 xl:h-80">
              <canvas ref={chartBarCanvasRef}></canvas>
            </div>
          </div>

        </div>

        {/* supporting layout sections */}
        <div className="w-full space-y-16 md:space-y-24 relative z-10">
          <div id="features" className="scroll-mt-24">
            <Feature3 />
          </div>

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
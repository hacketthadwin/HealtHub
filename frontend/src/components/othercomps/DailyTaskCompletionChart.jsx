import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import axios from 'axios';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { API_URL } from "../../config/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const formatDate = (dateString) => {
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

function DailyTaskCompletionChart() {
  const [taskRawData, setTaskRawData] = useState({ labels: [], values: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchTaskData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/v1/get-7days-tasks`);
      if (!res.data.success) throw new Error(res.data.message);

      const rawTasks = res.data.data;
      const grouped = {};
      rawTasks.forEach(task => {
        const date = task.date.split('T')[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(task);
      });

      const today = new Date();
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const tasks = grouped[dateStr] || [];
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pct = total ? (completed / total) * 100 : 0;
        last7.push({ date: dateStr, percentage: parseFloat(pct.toFixed(2)) });
      }

      setTaskRawData({
        labels: last7.map(item => formatDate(item.date)),
        values: last7.map(item => item.percentage)
      });
    } catch (e) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskData();
    const interval = setInterval(fetchTaskData, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => ({
    labels: taskRawData.labels,
    datasets: [{
      label: 'Completion %',
      data: taskRawData.values,
      fill: true,
      borderColor: '#C2F84F',
      borderWidth: 4, // Slightly reduced for better small-screen visibility
      pointBackgroundColor: isDark ? '#FAFDEE' : '#1F3A4B',
      pointBorderColor: '#C2F84F',
      pointBorderWidth: 2,
      pointRadius: 5,
      tension: 0.45,
      backgroundColor: (context) => {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(194, 248, 79, 0.35)');
        gradient.addColorStop(1, 'rgba(194, 248, 79, 0)');
        return gradient;
      },
    }],
  }), [taskRawData, isDark]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 400,
        easing: 'easeInOutQuad'
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1F3A4B',
        titleColor: '#C2F84F',
        displayColors: false,
        padding: 12,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: { color: isDark ? 'rgba(250, 253, 238, 0.1)' : 'rgba(31, 58, 75, 0.04)', drawBorder: false },
        ticks: {
          color: isDark ? '#FAFDEE' : '#1F3A4B',
          font: { weight: '700', size: 9 }, // Fluid font
          callback: (v) => v + '%',
          maxTicksLimit: 6,
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? '#FAFDEE' : '#1F3A4B',
          font: { weight: '900', size: 10, style: 'italic' }, // Fluid font
        },
      },
    },
  }), [isDark]);

  if (loading) {
    return (
      <div className="w-full h-[24rem] md:h-[32rem] flex flex-col items-center justify-center p-6 md:p-8 bg-white/40 dark:bg-[#1F3A4B]/10 backdrop-blur-md rounded-[2.5rem] md:rounded-[4rem] border-2 border-dashed border-[#1F3A4B]/10 animate-pulse">
        <Activity className="text-[#1F3A4B] dark:text-[#C2F84F] animate-spin mb-4" size={32} />
        <p className="text-[10px] text-center font-black uppercase tracking-[0.2em] text-[#1F3A4B] dark:text-[#FAFDEE]">Loading chart...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[24rem] md:h-[32rem] flex flex-col items-center justify-center p-6 md:p-8 bg-rose-50 dark:bg-rose-900/10 backdrop-blur-md rounded-[2.5rem] md:rounded-[4rem] border-2 border-rose-500/20">
        <Activity className="text-rose-500 mb-4" size={32} />
        <p className="text-[10px] text-center font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-300">{error.message || error || 'Failed to load chart data.'}</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 md:p-10 h-[24rem] md:h-[32rem] bg-white dark:bg-[#1F3A4B]/20 backdrop-blur-2xl rounded-[2.5rem] md:rounded-[4rem] border-2 border-[#1F3A4B]/5 dark:border-white/5 shadow-3xl flex flex-col overflow-hidden group transition-[background-color,border-color] duration-500 relative">
      <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000 hidden sm:block">
        <ShieldCheck size={180} className="text-[#1F3A4B] dark:text-[#C2F84F]" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-4 relative z-10 w-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="h-2 w-2 rounded-full bg-[#C2F84F] shadow-[0_0_10px_#C2F84F]" />
               <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight">Task Progress</h2>
            </div>
            <p className="text-[8px] sm:text-[10px] font-black opacity-40 uppercase tracking-[0.2em] md:tracking-[0.25em] ml-4 text-[#1F3A4B] dark:text-[#FAFDEE]">Last 7 days completion</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] rounded-xl sm:rounded-2xl shadow-xl border border-[#C2F84F]/20 transition-all active:scale-95">
            <Zap size={12} fill="currentColor" />
            <span className="font-black text-[8px] sm:text-[10px] uppercase tracking-widest leading-none whitespace-nowrap">Synced to tasks</span>
          </div>
      </div>
      
      <div className="flex-1 w-full relative z-10 min-h-0">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}

export default DailyTaskCompletionChart;
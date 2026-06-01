import React, {
  useState, useEffect, useRef, useCallback, useContext, useMemo
} from 'react';
import { AIResponseContext } from '../../context/AIResponseContext';
import { TaskProgressContext } from '../../context/TaskProgressContext';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Circle,
  ListChecks, CalendarDays, ClipboardX, Activity, AlertCircle
} from 'lucide-react';
import { API_URL } from "../../config/api";

const getAuthToken = () => localStorage.getItem('userToken');

// Shorter date format so it never overflows the nav container
const formatDate = (dateString) => {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', opts);
};

const parseHTMLList = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return Array.from(doc.querySelectorAll('li')).map(li => li.textContent.trim());
};

const groupTasksByDate = (tasks) => {
  const grouped = {};
  tasks.forEach(task => {
    const date = task.date.split('T')[0];
    if (!grouped[date]) {
      grouped[date] = {
        date,
        tasks: [],
        summary: { totalTasks: 0, completedTasks: 0, completionPercentage: 0 }
      };
    }
    grouped[date].tasks.push({
      id: task._id,
      description: task.name,
      completed: task.completed
    });
    grouped[date].summary.totalTasks += 1;
    if (task.completed) grouped[date].summary.completedTasks += 1;
  });

  Object.values(grouped).forEach(group => {
    group.summary.completionPercentage = group.summary.totalTasks
      ? (group.summary.completedTasks / group.summary.totalTasks) * 100
      : 0;
  });

  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
};

const TaskItem = React.memo(({ task, onToggle }) => (
  <li
    onClick={() => onToggle(task.id, task.completed)}
    className={`group flex items-center p-4 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none mb-3
      ${task.completed
        ? "bg-emerald-500/10 border-emerald-500/30 grayscale opacity-60"
        : "bg-white dark:bg-[#1F3A4B]/40 border-[#1F3A4B]/10 dark:border-white/5 shadow-lg active:scale-95"}`}
  >
    <div className="mr-4 flex-shrink-0">
      {task.completed ? (
        <CheckCircle2 className="text-[#C2F84F]" size={22} />
      ) : (
        <Circle className="text-[#1F3A4B]/20 dark:text-white/20" size={22} />
      )}
    </div>
    <span className={`text-sm font-bold tracking-tight leading-snug transition-all
      ${task.completed ? "text-[#1F3A4B]/40 dark:text-white/30 line-through" : "text-[#1F3A4B] dark:text-[#FAFDEE]"}`}>
      {task.description}
    </span>
  </li>
));

function DailyTaskLog({ onTaskUpdate }) {
  const { lastAIMessage } = useContext(AIResponseContext);
  const { setCompletionPercentage } = useContext(TaskProgressContext);

  const [taskLogData, setTaskLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(null);

  const intervalRef = useRef(null);
  const todayDateString = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchTaskLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) { setLoading(false); return; }

      const res = await axios.get(`${API_URL}/api/v1/get-7days-tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        const grouped = groupTasksByDate(res.data.data);
        setTaskLogData(grouped);
        const todayIndex = grouped.findIndex(d => d.date === todayDateString);
        setCurrentIndex(todayIndex !== -1 ? todayIndex : grouped.length - 1);
      } else {
        throw new Error('Failed to load tasks');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [todayDateString]);

  const postNewTask = useCallback(async (description) => {
    const token = getAuthToken();
    const res = await axios.post(`${API_URL}/api/v1/post-tasks`,
      { name: description, date: todayDateString, completed: false },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  }, [todayDateString]);

  const updateTaskCompletion = useCallback(async (taskId, completed) => {
    const token = getAuthToken();
    const res = await axios.patch(`${API_URL}/api/v1/tasks/${taskId}`,
      { completed },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.data;
  }, []);

  useEffect(() => {
    fetchTaskLog();
    intervalRef.current = setInterval(fetchTaskLog, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, [fetchTaskLog]);

  useEffect(() => {
    if (!lastAIMessage) return;
    const aiItems = parseHTMLList(lastAIMessage);
    if (!aiItems.length) return;
    const postTasksAndRefresh = async () => {
      try {
        await Promise.all(aiItems.map(desc => postNewTask(desc)));
        fetchTaskLog();
      } catch (e) { console.error(e); }
    };
    postTasksAndRefresh();
  }, [lastAIMessage, postNewTask, fetchTaskLog]);

  useEffect(() => {
    const today = taskLogData.find(d => d.date === todayDateString);
    setCompletionPercentage(today ? today.summary.completionPercentage : 0);
  }, [taskLogData, todayDateString, setCompletionPercentage]);

  const handleTaskCheck = useCallback(async (taskId, wasCompleted) => {
    setTaskLogData(prev =>
      prev.map((day, idx) => {
        if (idx !== currentIndex) return day;
        const updatedTasks = day.tasks.map(t =>
          t.id === taskId ? { ...t, completed: !wasCompleted } : t
        );
        const done = updatedTasks.filter(t => t.completed).length;
        return {
          ...day,
          tasks: updatedTasks,
          summary: {
            ...day.summary,
            completedTasks: done,
            completionPercentage: (done / updatedTasks.length) * 100
          }
        };
      })
    );

    try {
      await updateTaskCompletion(taskId, !wasCompleted);
      if (onTaskUpdate) onTaskUpdate();
    } catch (e) {
      fetchTaskLog();
    }
  }, [currentIndex, onTaskUpdate, updateTaskCompletion, fetchTaskLog]);

  const currentDay = useMemo(() => (
    currentIndex !== null && taskLogData[currentIndex] ? taskLogData[currentIndex] : null
  ), [taskLogData, currentIndex]);

  return (
    <div className="w-full mx-auto p-4">

      {/* HEADER — title always on top, date nav always below (no overflow) */}
      <div className="flex flex-col gap-4 mb-6 px-1">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1F3A4B] dark:bg-[#C2F84F] rounded-2xl shadow-lg">
            <CalendarDays size={22} className="text-[#C2F84F] dark:text-[#1F3A4B]" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1F3A4B] dark:text-[#FAFDEE]">
              Daily Tasks
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-[#1F3A4B] dark:text-[#FAFDEE]">
              Track your health tasks
            </p>
          </div>
        </div>

        {/* Date navigator — on its own row, always centred, never overflows */}
        {taskLogData.length > 0 && (
          <div className="flex items-center justify-between gap-2 bg-white/60 dark:bg-white/10 rounded-2xl px-3 py-2 border border-[#1F3A4B]/10 dark:border-white/5 shadow-sm w-full">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="p-2 rounded-xl hover:bg-[#1F3A4B] hover:text-[#C2F84F] dark:hover:bg-[#C2F84F] dark:hover:text-[#1F3A4B] transition-all bg-[#1F3A4B]/5 dark:bg-white/5 disabled:opacity-20 shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[11px] font-black italic tracking-wide uppercase text-[#1F3A4B] dark:text-[#FAFDEE] text-center flex-1 truncate">
              {currentDay ? formatDate(currentDay.date) : '--'}
            </span>
            <button
              onClick={() => setCurrentIndex(i => Math.min(taskLogData.length - 1, i + 1))}
              disabled={currentIndex === taskLogData.length - 1}
              className="p-2 rounded-xl hover:bg-[#1F3A4B] hover:text-[#C2F84F] dark:hover:bg-[#C2F84F] dark:hover:text-[#1F3A4B] transition-all bg-[#1F3A4B]/5 dark:bg-white/5 disabled:opacity-20 shrink-0"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center bg-white/40 dark:bg-[#1F3A4B]/10 rounded-3xl border-2 border-dashed border-[#1F3A4B]/10 animate-pulse">
          <Activity className="animate-spin text-[#1F3A4B] dark:text-[#C2F84F] mb-3" size={32} />
          <p className="text-xs font-black tracking-widest uppercase opacity-40 text-[#1F3A4B] dark:text-[#FAFDEE]">Loading tasks...</p>
        </div>
      ) : error ? (
        <div className="h-48 flex flex-col items-center justify-center bg-rose-50 dark:bg-rose-900/10 rounded-3xl border-2 border-rose-500/20 p-6 text-center">
          <AlertCircle className="text-rose-500 mb-3" size={32} />
          <p className="text-sm font-black uppercase tracking-wide text-rose-600 dark:text-rose-300">{error}</p>
          <p className="text-[10px] uppercase opacity-40 mt-1">Please refresh and try again.</p>
        </div>
      ) : taskLogData.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center bg-white/40 dark:bg-white/5 border-2 border-dashed border-[#1F3A4B]/10 rounded-3xl p-8 group text-center">
          <ClipboardX size={40} className="text-[#1F3A4B]/20 dark:text-white/20 mb-3 group-hover:rotate-12 transition-transform duration-500" />
          <p className="text-base font-black italic uppercase opacity-50 text-[#1F3A4B] dark:text-white">No tasks yet</p>
          <p className="text-[10px] font-bold uppercase opacity-30 tracking-wide mt-1">Chat with AI to get your daily tasks</p>
        </div>
      ) : (
        <div className="space-y-6">
          <ul className="max-h-[28rem] overflow-y-auto pr-2 scrollbar-hide">
            {currentDay?.tasks.map(t => (
              <TaskItem key={t.id} task={t} onToggle={handleTaskCheck} />
            ))}
          </ul>

          {/* PROGRESS FOOTER */}
          <div className="p-6 rounded-3xl bg-[#1F3A4B] shadow-xl flex items-center justify-between border-t border-white/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:scale-150 transition-transform duration-1000 text-[#C2F84F]">
              <ListChecks size={100} />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#C2F84F]">
                <Activity size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-white/40 tracking-widest">Today's Progress</p>
                <p className="text-xl font-black italic uppercase text-white">
                  {currentDay?.summary.completedTasks} <span className="text-white/30 not-italic">/</span> {currentDay?.summary.totalTasks} Done
                </p>
              </div>
            </div>
            <div className="text-right relative z-10">
              <p className="text-4xl font-black italic tracking-tighter text-[#C2F84F] leading-none">
                {currentDay?.summary.completionPercentage.toFixed(0)}%
              </p>
              <p className="text-[9px] font-black uppercase opacity-60 text-white tracking-widest mt-1">Keep it up!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyTaskLog;
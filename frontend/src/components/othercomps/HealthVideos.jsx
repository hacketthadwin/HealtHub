import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Search } from 'lucide-react';
import { API_URL } from '../../config/api';

const HealthVideos = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('diabetes management');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const token = localStorage.getItem('userToken');

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/v1/videos/topics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTopics(data.topics || []);
      } catch (err) {
        console.error('Topics fetch error:', err);
      }
    };
    fetchTopics();
  }, [token]);

  const fetchVideos = async (topic) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/v1/videos/health`, {
        params: { topic, maxResults: 4 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideos(data.videos || []);
    } catch (err) {
      console.error('Videos fetch error:', err);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(selectedTopic);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedTopic(searchInput.trim());
      setSearchInput('');
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-6 md:p-8 border border-[#1F3A4B]/10 shadow-2xl">
      <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter mb-1 text-[#1F3A4B] dark:text-[#FAFDEE] uppercase">
        Health Education
      </h2>
      <p className="text-[10px] font-black uppercase tracking-widest text-[#1F3A4B]/40 dark:text-[#FAFDEE]/40 mb-5">
        Curated videos for your health journey
      </p>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search health topics..."
          className="flex-1 bg-[#1F3A4B]/5 dark:bg-white/5 px-4 py-3 rounded-full outline-none font-bold text-sm border border-[#1F3A4B]/10 dark:border-white/10 text-[#1F3A4B] dark:text-[#FAFDEE]"
        />
        <button
          type="submit"
          className="w-12 h-12 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center hover:scale-105 transition-all shadow-md"
        >
          <Search size={16} />
        </button>
      </form>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {topics.slice(0, 8).map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${
              selectedTopic === topic
                ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B]'
                : 'bg-[#1F3A4B]/5 dark:bg-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-[#1F3A4B]/10'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-[#1F3A4B]/5 animate-pulse h-28" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-8 text-[#1F3A4B]/40 dark:text-white/30">
          <p className="text-xs font-black uppercase italic">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {videos.map((video) => (
            <a
              key={video.videoId}
              href={video.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl overflow-hidden border border-[#1F3A4B]/10 dark:border-white/10 hover:border-[#C2F84F] transition-all shadow-sm"
            >
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-20 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-[#C2F84F] flex items-center justify-center">
                    <Play size={14} className="text-[#1F3A4B] ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-2.5">
                <p className="font-black text-[9px] text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight line-clamp-2">
                  {video.title}
                </p>
                <p className="text-[8px] opacity-40 uppercase font-bold mt-0.5">{video.channelTitle}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthVideos;

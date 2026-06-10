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
      setSelectedTopic(searchInput.trim().toLowerCase());
      setSearchInput('');
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-[2.5rem] p-6 md:p-10 border border-[#1F3A4B]/10 dark:border-white/5 shadow-2xl font-roboto-slab antialiased">
      
      {/* Container Header */}
      <h2 className="text-xl sm:text-3xl font-extrabold italic tracking-tighter mb-1 text-[#1F3A4B] dark:text-[#FAFDEE] uppercase font-sans leading-none">
        HEALTH EDUCATION
      </h2>
      <p className="text-xs font-bold uppercase tracking-widest text-[#1F3A4B]/50 dark:text-[#FAFDEE]/50 mb-6">
        CURATED VIDEOS FOR YOUR HEALTH JOURNEY
      </p>

      {/* Search Input Area */}
      <form onSubmit={handleSearch} className="flex gap-2.5 mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="SEARCH HEALTH TOPICS..."
          className="flex-1 bg-[#1F3A4B]/5 dark:bg-white/5 px-6 py-4 rounded-full outline-none font-bold text-base border border-[#1F3A4B]/10 dark:border-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] uppercase tracking-wide placeholder:text-sm"
        />
        <button
          type="submit"
          className="w-14 h-14 rounded-full bg-[#1F3A4B] dark:bg-[#C2F84F] text-[#C2F84F] dark:text-[#1F3A4B] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
        >
          <Search size={18} />
        </button>
      </form>

      {/* Filter Chips Track */}
      <div className="flex flex-wrap gap-2 mb-6">
        {topics.slice(0, 8).map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              selectedTopic === topic
                ? 'bg-[#1F3A4B] text-[#C2F84F] dark:bg-[#C2F84F] dark:text-[#1F3A4B] shadow-md scale-105'
                : 'bg-[#1F3A4B]/5 dark:bg-white/10 text-[#1F3A4B] dark:text-[#FAFDEE] hover:bg-[#1F3A4B]/10 border border-[#1F3A4B]/5'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Content Render Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            /* Scaled skeleton box layout parameters */
            <div key={i} className="rounded-2xl overflow-hidden bg-[#1F3A4B]/5 dark:bg-white/5 animate-pulse h-28 sm:h-36" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-10 text-[#1F3A4B]/40 dark:text-white/30">
          <p className="text-sm font-bold uppercase tracking-widest italic">NO VIDEOS FOUND</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {videos.map((video) => (
            <a
              key={video.videoId}
              href={video.watchUrl}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl overflow-hidden border border-[#1F3A4B]/10 dark:border-white/10 hover:border-[#C2F84F] transition-all shadow-sm flex flex-col bg-white dark:bg-transparent"
            >
              <div className="relative overflow-hidden shrink-0">
                {/* Scaled thumbnail dimensions for clean rendering on desktops */}
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-24 sm:h-32 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-11 h-11 rounded-full bg-[#C2F84F] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                    <Play size={16} className="text-[#1F3A4B] ml-0.5" />
                  </div>
                </div>
              </div>
              
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-1.5">
                {/* Title font footprints adjusted higher */}
                <p className="font-bold text-xs sm:text-sm text-[#1F3A4B] dark:text-[#FAFDEE] leading-tight line-clamp-2 uppercase tracking-wide">
                  {video.title.toUpperCase()}
                </p>
                <p className="text-[10px] opacity-50 uppercase font-bold tracking-widest truncate mt-auto">
                  {video.channelTitle.toUpperCase()}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealthVideos;
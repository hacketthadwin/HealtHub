import React, { useState, useEffect, useRef, useContext } from 'react';
import DOMPurify from 'dompurify';
import { AIResponseContext } from '../../context/AIResponseContext';
import { MessageSquare, X, Plus, Minus, Send, Bot } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config/api';

function AIChatButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [chatSize, setChatSize] = useState('medium');
    const [chatHistory, setChatHistory] = useState([]);

    const { setLastAIMessage, setAiTasks } = useContext(AIResponseContext);

    const getChatDimensions = () => {
        switch (chatSize) {
            case 'small': return 'w-[90vw] max-w-xs h-[50vh] max-h-[16rem]';
            case 'large': return 'w-[90vw] max-w-xl h-[80vh] max-h-[40rem]';
            default:      return 'w-[90vw] max-w-md h-[70vh] max-h-[28rem]';
        }
    };

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{ text: 'HI THERE! I AM YOUR CLINICAL ASSISTANT. HOW CAN I HELP?', sender: 'ai' }]);
        }
    }, [isOpen, messages.length]);

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const currentInput = inputMessage.trim();
        const newUserMessage = { text: currentInput, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setInputMessage('');

        const historyToSend = chatHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        try {
            const token = localStorage.getItem('userToken');
            const response = await axios.post(
                `${API_URL}/api/v1/ai/chat`,
                { prompt: currentInput, history: historyToSend },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const aiResponse = response.data.reply;

            setMessages(prev => [...prev, { text: aiResponse, sender: 'ai' }]);

            setChatHistory(prev => [
                ...prev,
                { sender: 'user', text: currentInput },
                { sender: 'ai', text: aiResponse },
            ]);

            const doTheseMatch = aiResponse.match(/<h4>Do these things:<\/h4>\s*(<ul>[\s\S]*?<\/ul>)/);
            if (doTheseMatch && doTheseMatch[1]) {
                const html = doTheseMatch[1].trim();
                setLastAIMessage(html);
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const listItems = Array.from(doc.querySelectorAll('li')).map(li => li.textContent.trim());
                setAiTasks(listItems);
            } else {
                setLastAIMessage('');
                setAiTasks([]);
            }

        } catch (err) {
            console.error('AI error:', err);
            const errMsg = err?.response?.data?.message || 'System connection error. Please try again.';
            setMessages(prev => [...prev, { text: errMsg, sender: 'ai' }]);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[200] select-none font-roboto-slab antialiased">
                {!isOpen ? (
                <button
                    onClick={toggleChat}
                    className="w-16 h-16 rounded-[2rem] flex items-center justify-center 
                    bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/30 
                    shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 
                    transition-all duration-300 group overflow-hidden relative"
                >
                    {/* Glass Glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-[#C2F84F]/30 to-transparent" />
                    
                    {/* Icon */}
                    <Bot 
                    className="relative z-10 text-[#1F3A4B] dark:text-[#C2F84F] group-hover:scale-110 transition-transform duration-300" 
                    size={28}
                    strokeWidth={2}
                />
                </button>
            ) : (
                <div className={`rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl border border-white/20 backdrop-blur-[24px] bg-white/70 dark:bg-[#0a111a]/70 transition-all duration-500 ${getChatDimensions()}`}>

                    {/* Header: Glassmorphic with translucent icons */}
                    <div className="p-5 flex justify-between items-center bg-white/10 dark:bg-black/20 border-b border-white/20 text-[#1F3A4B] dark:text-white">
                        <div className="flex items-center gap-3">
                            {/* Glassmorphic Icon Wrapper */}
                            <span className="p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-[#1F3A4B] dark:text-[#C2F84F]">
                                <MessageSquare size={18} />
                            </span>
                            <h3 className="font-extrabold italic uppercase text-xs tracking-widest leading-none mt-1 font-sans">CLINICAL AI</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Icon buttons with glass hover */}
                            <button onClick={() => setChatSize(s => s === 'large' ? 'medium' : 'small')} className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all"><Minus size={14} /></button>
                            <button onClick={() => setChatSize(s => s === 'small' ? 'medium' : 'large')} className="p-2 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all"><Plus size={14} /></button>
                            <button onClick={toggleChat} className="ml-2 p-2 hover:bg-rose-500/20 backdrop-blur-sm rounded-full transition-all"><X size={16} /></button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-5 py-3 rounded-[1.5rem] text-sm font-bold shadow-lg backdrop-blur-sm ${
                                    msg.sender === 'user'
                                        ? 'bg-[#1F3A4B] text-white rounded-tr-none'
                                        : 'bg-white/60 dark:bg-black/30 border border-white/20 text-[#1F3A4B] dark:text-[#C2F84F] rounded-tl-none'
                                }`}>
                                    <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.text) }} />
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-white/20 bg-white/40 dark:bg-black/20 backdrop-blur-md">
                        <div className="flex items-center gap-2 bg-white/50 dark:bg-black/30 p-1 rounded-2xl border border-white/30 shadow-inner">
                            <input
                                type="text"
                                className="flex-1 bg-transparent px-4 py-3 text-[#1F3A4B] dark:text-white outline-none font-bold text-sm uppercase tracking-wide placeholder:text-[#1F3A4B]/40"
                                placeholder="CONSULT AI..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            {/* Send Button: Glassmorphic hover */}
                            <button
                                onClick={handleSendMessage}
                                className="h-10 w-10 rounded-xl bg-white/30 hover:bg-[#1F3A4B] hover:text-[#C2F84F] dark:hover:bg-[#C2F84F] dark:hover:text-[#1F3A4B] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg border border-white/20"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AIChatButton;
// src/context/AIResponseContext.js
import React, { createContext, useState } from 'react';

export const AIResponseContext = createContext();

export const AIResponseProvider = ({ children }) => {
  const [lastAIMessage, setLastAIMessage] = useState(""); // Raw HTML <ul>...</ul>
  const [aiTasks, setAiTasks] = useState([]); // Parsed tasks from HTML as plain strings

  return (
    <AIResponseContext.Provider value={{ lastAIMessage, setLastAIMessage, aiTasks, setAiTasks }}>
      {children}
    </AIResponseContext.Provider>
  );
};

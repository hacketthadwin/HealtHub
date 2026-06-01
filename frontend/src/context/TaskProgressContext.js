// src/context/TaskProgressContext.js
import { createContext, useState } from 'react';

export const TaskProgressContext = createContext({
  completionPercentage: 0,
  setCompletionPercentage: () => {}
});

export const TaskProgressProvider = ({ children }) => {
  const [completionPercentage, setCompletionPercentage] = useState(0);

  return (
    <TaskProgressContext.Provider value={{ completionPercentage, setCompletionPercentage }}>
      {children}
    </TaskProgressContext.Provider>
  );
};

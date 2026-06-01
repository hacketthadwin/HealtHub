import { useId } from "react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useTheme } from '../../context/ThemeContext';

export default function Annual() {
  const id = useId();
  const { isDarkMode } = useTheme();

  const theme = {
    background: isDarkMode ? '#1F3A4B' : '#FAFDEE',
    cardBackground: isDarkMode ? '#476407' : '#C2F84F',
    textColor: isDarkMode ? '#FAFDEE' : '#1F3A4B',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Switch 
        className="rounded-sm [&_span]:rounded" 
        id={id}
        style={{
          backgroundColor: theme.cardBackground,
          '--switch-thumb-color': theme.textColor,
        }}
      />
      <Label 
        className="sr-only" 
        htmlFor={id}
        style={{ color: theme.textColor }}
      >
        Square switch
      </Label>
    </div>
  );
}
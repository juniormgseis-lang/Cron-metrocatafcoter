import { themes, type Theme, setStoredTheme } from '../lib/themes';
import { cn } from '../lib/utils';
import { Palette } from 'lucide-react';

interface ThemeSwitcherProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  const handleThemeChange = (theme: Theme) => {
    setStoredTheme(theme);
    onThemeChange(theme);
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-8">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        <Palette size={12} />
        Temas
      </div>
      <div className="flex gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={cn(
              "px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all border",
              currentTheme === theme.id 
                ? "bg-accent text-accent-foreground border-accent shadow-lg shadow-accent/20" 
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            )}
          >
            {theme.name}
          </button>
        ))}
      </div>
    </div>
  );
}

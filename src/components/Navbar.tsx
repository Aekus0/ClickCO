import { ShieldCheck, LogOut, ArrowLeftRight, Clock, Languages, FileCheck2, Sun, Moon } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface NavbarProps {
  onLock: () => void;
  conversionCount: number;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

export default function Navbar({ onLock, conversionCount, language, onLanguageChange, theme, onThemeChange }: NavbarProps) {
  const t = translations[language];

  const handleToggleLang = () => {
    onLanguageChange(language === 'tr' ? 'en' : 'tr');
  };

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md bg-opacity-90" id="main-navigation-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between" id="navbar-container">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-2.5" id="navbar-brand">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md border border-slate-700/60 bg-slate-950 flex items-center justify-center p-0.5" id="navbar-logo-box">
            <img 
              src="/src/assets/images/clickco_logo_1779887548019.png" 
              alt="ClickCO Logo"
              className="w-full h-full object-cover rounded-lg"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5" id="navbar-title">
              {t.title}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">{t.onlineConverter}</p>
          </div>
        </div>

        {/* Right Side: Language & Theme Switcher */}
        <div className="flex items-center gap-3" id="navbar-actions-right">
          {/* Theme Switch button */}
          <button
            type="button"
            onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all hover:text-white cursor-pointer"
            title={theme === 'light' ? t.themeDark : t.themeLight}
            id="nav-btn-switch-theme"
          >
            {theme === 'light' ? (
              <Moon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            )}
            <span className="font-mono text-[10px] uppercase">
              {theme === 'light' ? 'DARK' : 'LIGHT'}
            </span>
          </button>

          {/* Language Switch button */}
          <button
            type="button"
            onClick={handleToggleLang}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-300 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all hover:text-white cursor-pointer"
            title="Dili Değiştir / Switch Language"
            id="nav-btn-switch-lang"
          >
            <Languages className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono">{language.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, Info, CloudLightning, EyeOff
} from 'lucide-react';
import CaptchaGate from './components/CaptchaGate';
import Navbar from './components/Navbar';
import FileConverter from './components/FileConverter';
import FirebaseSyncWidget from './components/FirebaseSyncWidget';
import { useFirebase } from './contexts/FirebaseContext';
import { ConversionResult } from './types';
import { Language, translations } from './utils/translations';

export default function App() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [history, setHistory] = useState<ConversionResult[]>([]);
  const [language, setLanguage] = useState<Language>('tr');
  const [purgeAfterTimer, setPurgeAfterTimer] = useState<boolean>(true);
  const [purgeAfterDownload, setPurgeAfterDownload] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const { 
    user, 
    syncedHistory, 
    settings: dbSettings, 
    saveSettingsToDb, 
    addConversionToDb, 
    deleteConversionFromDb, 
    clearConversionsFromDb 
  } = useFirebase();

  // Load language, verified state and history from stores if present
  useEffect(() => {
    const savedLang = localStorage.getItem('clickco_language') as Language;
    if (savedLang === 'tr' || savedLang === 'en') {
      setLanguage(savedLang);
    }

    const savedTheme = localStorage.getItem('clickco_theme') as 'light' | 'dark' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }

    const savedVerify = sessionStorage.getItem('clickco_captcha_verified');
    if (savedVerify === 'true') {
      setIsVerified(true);
    }

    const savedHistory = localStorage.getItem('clickco_conversion_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (e) {
        // Clear corrupt state
        localStorage.removeItem('clickco_conversion_history');
      }
    }

    const savedPurgeTimer = localStorage.getItem('clickco_purge_after_timer');
    if (savedPurgeTimer !== null) {
      setPurgeAfterTimer(savedPurgeTimer === 'true');
    }

    const savedPurgeDownload = localStorage.getItem('clickco_purge_after_download');
    if (savedPurgeDownload !== null) {
      setPurgeAfterDownload(savedPurgeDownload === 'true');
    }
  }, []);

  // Sync settings FROM Firestore db user settings document when logged in
  useEffect(() => {
    if (user) {
      if (dbSettings) {
        setLanguage(dbSettings.language);
        setPurgeAfterTimer(dbSettings.purgeAfterTimer);
        setPurgeAfterDownload(dbSettings.purgeAfterDownload);
      } else {
        // Write active client state to newly registered Google profile
        saveSettingsToDb(language, purgeAfterTimer, purgeAfterDownload);
      }
    }
  }, [user, dbSettings]);

  // Migrate local guest conversion logs on successful Google Sign-In
  useEffect(() => {
    if (user && history.length > 0) {
      history.forEach((lhItem) => {
        addConversionToDb(lhItem);
      });
      // Clear client storage logs so they are fully synchronized with Firestore
      localStorage.removeItem('clickco_conversion_history');
      setHistory([]);
    }
  }, [user]);

  const displayedHistory = user ? syncedHistory : history;

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('clickco_language', newLanguage);
    if (user) {
      saveSettingsToDb(newLanguage, purgeAfterTimer, purgeAfterDownload);
    }
  };

  const handleTogglePurgeTimer = () => {
    const nextVal = !purgeAfterTimer;
    setPurgeAfterTimer(nextVal);
    localStorage.setItem('clickco_purge_after_timer', String(nextVal));
    if (user) {
      saveSettingsToDb(language, nextVal, purgeAfterDownload);
    }
  };

  const handleTogglePurgeDownload = () => {
    const nextVal = !purgeAfterDownload;
    setPurgeAfterDownload(nextVal);
    localStorage.setItem('clickco_purge_after_download', String(nextVal));
    if (user) {
      saveSettingsToDb(language, purgeAfterTimer, nextVal);
    }
  };

  // Save history state changes for local guest sessions
  const saveHistory = (newHistory: ConversionResult[]) => {
    setHistory(newHistory);
    localStorage.setItem('clickco_conversion_history', JSON.stringify(newHistory));
  };

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    sessionStorage.setItem('clickco_captcha_verified', 'true');
  };

  const handleLockSession = () => {
    setIsVerified(false);
    sessionStorage.removeItem('clickco_captcha_verified');
  };

  const handleAddHistory = (result: ConversionResult) => {
    if (user) {
      addConversionToDb(result);
    } else {
      const updated = [result, ...history];
      saveHistory(updated);
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const activeLogList = user ? syncedHistory : history;
    const target = activeLogList.find(item => item.id === id);
    if (target && target.downloadUrl) {
      try {
        URL.revokeObjectURL(target.downloadUrl);
      } catch (_) {}
    }

    if (user) {
      deleteConversionFromDb(id);
    } else {
      const filtered = history.filter(item => item.id !== id);
      saveHistory(filtered);
    }
  };

  const handleClearHistory = () => {
    const activeLogList = user ? syncedHistory : history;
    activeLogList.forEach(item => {
      if (item.downloadUrl) {
        try {
          URL.revokeObjectURL(item.downloadUrl);
        } catch (_) {}
      }
    });

    if (user) {
      clearConversionsFromDb();
    } else {
      saveHistory([]);
    }
  };

  const handleThemeChange = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    localStorage.setItem('clickco_theme', nextTheme);
  };

  const t = translations[language];

  if (!isVerified) {
    return (
      <div className={theme === 'light' ? 'light' : 'dark'} id="captcha-theme-wrapper">
        <CaptchaGate 
          onVerify={handleVerificationSuccess} 
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans transition-all duration-300`} id="main-application-view">
      {/* Top sticky Header */}
      <Navbar 
        onLock={handleLockSession} 
        conversionCount={displayedHistory.length} 
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="dashboard-content-grid">
        <div className="space-y-8" id="dashboard-stack">
          {/* Welcome Message Ribbon */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/10 rounded-2xl p-6 relative overflow-hidden"
            id="welcome-banner"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-400 pointer-events-none" id="decor-cloud">
              <svg className="w-40 h-40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
              </svg>
            </div>
            
            <div className="max-w-2xl" id="welcome-text-container">
              <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-blue-500/20 mb-3" id="verified-banner-chip">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 animate-bounce" /> {t.verificationSuccessBanner}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{t.welcomeBannerTitle}</h2>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                {t.welcomeBannerDesc}
              </p>
            </div>
          </motion.div>

          {/* Master Bento Layout Columns: Left Converter Workspace, Right Audit list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="master-dashboard-splits">
            {/* Left Workspace Panel */}
            <div className="lg:col-span-2 space-y-8" id="left-column">
              <FileConverter 
                onConversionSuccess={handleAddHistory} 
                language={language} 
                purgeAfterTimer={purgeAfterTimer}
                purgeAfterDownload={purgeAfterDownload}
                onDeleteItem={handleDeleteHistoryItem}
              />

              {/* Informative Bento Grid Cards detailing CloudConvert */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="bento-info-cards-row">
                {/* Micro bento 1 */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-900 transition-colors" id="bento-info-1">
                  <div className="p-2 w-fit bg-blue-500/10 text-blue-400 rounded-lg mb-4" id="bento-info-1-icon">
                    <CloudLightning className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-sm">{t.superFastTitle}</h4>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    {t.superFastDesc}
                  </p>
                </div>

                {/* Micro bento 2 */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 hover:bg-slate-900 transition-colors" id="bento-info-2">
                  <div className="p-2 w-fit bg-emerald-500/10 text-emerald-400 rounded-lg mb-4" id="bento-info-2-icon">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-sm">{t.privacyFocusedTitle}</h4>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    {t.privacyFocusedDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Audit/History Panel */}
            <div className="space-y-8" id="right-column">
              <FirebaseSyncWidget language={language} />

              {/* Privacy and Purging Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4" id="privacy-guard-widget">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5" id="privacy-widget-header">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">{t.autoPurgeTitle}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t.autoPurgeActive}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{t.autoPurgeDesc}</p>

                <div className="space-y-3.5 pt-1.5" id="privacy-toggle-list">
                  {/* Purge after download checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none group" id="label-toggle-download">
                    <input
                      type="checkbox"
                      checked={purgeAfterDownload}
                      onChange={handleTogglePurgeDownload}
                      className="mt-0.5 w-4 h-4 text-emerald-600 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                      id="checkbox-purge-download"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors block">{t.autoPurgeAfterDownload}</span>
                    </div>
                  </label>

                  {/* Purge after timer checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none group" id="label-toggle-timer">
                    <input
                      type="checkbox"
                      checked={purgeAfterTimer}
                      onChange={handleTogglePurgeTimer}
                      className="mt-0.5 w-4 h-4 text-emerald-600 bg-slate-950 border-slate-800 rounded focus:ring-emerald-500 accent-emerald-500 cursor-pointer"
                      id="checkbox-purge-timer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors block">{t.autoPurgeTimer}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Security Status Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4" id="captcha-audit-status-widget">
                <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2">{t.secureSessionTitle}</h4>
                
                <div className="space-y-3" id="audit-metrics">
                  <div className="flex justify-between items-center text-xs" id="metric-row-1">
                    <span className="text-slate-500">{t.secureSessionMetric1}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">{t.secureSessionMetric1Val}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs" id="metric-row-2">
                    <span className="text-slate-500">{t.secureSessionMetric2}</span>
                    <span className="text-slate-350 font-mono">{t.secureSessionMetric2Val}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs" id="metric-row-3">
                    <span className="text-slate-500">{t.secureSessionMetric3}</span>
                    <span className="text-emerald-400 font-bold">{t.secureSessionMetric3Val}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-[11px] text-slate-500 leading-normal flex items-start gap-1.5" id="audit-disclaimer-text">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    {t.secureSessionInfo}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Styled minimalistic Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-600 mt-auto" id="main-app-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="footer-container">
          <p>{t.footerText}</p>
        </div>
      </footer>
    </div>
  );
}

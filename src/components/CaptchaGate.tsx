import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, Check, RefreshCw, HelpCircle, Sparkles, Languages } from 'lucide-react';
import { Language, translations } from '../utils/translations';

interface CaptchaGateProps {
  onVerify: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

interface TileItem {
  id: number;
  emoji: string;
  labelTr: string;
  labelEn: string;
  isTarget: boolean;
}

interface Challenge {
  targetLabelTr: string;
  targetLabelEn: string;
  keyword: string;
  tiles: TileItem[];
}

const CHALLENGES: Challenge[] = [
  {
    targetLabelTr: "🚦 Trafik Lambası",
    targetLabelEn: "🚦 Traffic Light",
    keyword: "traffic",
    tiles: [
      { id: 1, emoji: "🚦", labelTr: "Trafik Lambası", labelEn: "Traffic Light", isTarget: true },
      { id: 2, emoji: "🚗", labelTr: "Otomobil", labelEn: "Automobile", isTarget: false },
      { id: 3, emoji: "🚲", labelTr: "Bisiklet", labelEn: "Bicycle", isTarget: false },
      { id: 4, emoji: "🚦", labelTr: "Trafik Lambası", labelEn: "Traffic Light", isTarget: true },
      { id: 5, emoji: "🏡", labelTr: "Ev", labelEn: "House", isTarget: false },
      { id: 6, emoji: "🚦", labelTr: "Sinyalizasyon", labelEn: "Light Indicator", isTarget: true },
      { id: 7, emoji: "🌴", labelTr: "Ağaç", labelEn: "Tree", isTarget: false },
      { id: 8, emoji: "🚦", labelTr: "Işık", labelEn: "Light", isTarget: true },
      { id: 9, emoji: "🛵", labelTr: "Motosiklet", labelEn: "Scooter", isTarget: false },
    ]
  },
  {
    targetLabelTr: "🚗 Otomobil / Araba",
    targetLabelEn: "🚗 Automobile / Car",
    keyword: "car",
    tiles: [
      { id: 1, emoji: "🚗", labelTr: "Kırmızı Araba", labelEn: "Red Car", isTarget: true },
      { id: 2, emoji: "🚶", labelTr: "Yaya", labelEn: "Pedestrian", isTarget: false },
      { id: 3, emoji: "🏡", labelTr: "Ev", labelEn: "House", isTarget: false },
      { id: 4, emoji: "🚲", labelTr: "Bisiklet", labelEn: "Bicycle", isTarget: false },
      { id: 5, emoji: "🚗", labelTr: "Mavi Sedan", labelEn: "Blue Sedan", isTarget: true },
      { id: 6, emoji: "🌴", labelTr: "Palmiye", labelEn: "Palm Tree", isTarget: false },
      { id: 7, emoji: "🚗", labelTr: "SUV", labelEn: "SUV Car", isTarget: true },
      { id: 8, emoji: "🚦", labelTr: "Işık", labelEn: "Light", isTarget: false },
      { id: 9, emoji: "🚃", labelTr: "Tramvay", labelEn: "Tram", isTarget: false },
    ]
  },
  {
    targetLabelTr: "🚲 Bisiklet",
    targetLabelEn: "🚲 Bicycle",
    keyword: "bicycle",
    tiles: [
      { id: 1, emoji: "⛵", labelTr: "Tekne", labelEn: "Boat", isTarget: false },
      { id: 2, emoji: "🚲", labelTr: "Bisiklet", labelEn: "Bicycle", isTarget: true },
      { id: 3, emoji: "🏡", labelTr: "Ev", labelEn: "House", isTarget: false },
      { id: 4, emoji: "🚲", labelTr: "Yarış Bisikleti", labelEn: "Racing Bike", isTarget: true },
      { id: 5, emoji: "🚗", labelTr: "Araba", labelEn: "Car", isTarget: false },
      { id: 6, emoji: "🚲", labelTr: "Dağ Bisikleti", labelEn: "Mountain Bike", isTarget: true },
      { id: 7, emoji: "🌴", labelTr: "Palmiye", labelEn: "Palm", isTarget: false },
      { id: 8, emoji: "🚦", labelTr: "Sinyal", labelEn: "Signal", isTarget: false },
      { id: 9, emoji: "🚲", labelTr: "Mavi Bisiklet", labelEn: "Blue Bicycle", isTarget: true },
    ]
  },
  {
    targetLabelTr: "🏡 Ev / Bina",
    targetLabelEn: "🏡 House / Building",
    keyword: "house",
    tiles: [
      { id: 1, emoji: "🏡", labelTr: "Müstakil Ev", labelEn: "Cottage", isTarget: true },
      { id: 2, emoji: "🚗", labelTr: "Araba", labelEn: "Car", isTarget: false },
      { id: 3, emoji: "🏢", labelTr: "Apartman", labelEn: "Apartment", isTarget: true },
      { id: 4, emoji: "🚶", labelTr: "Yaya", labelEn: "Pedestrian", isTarget: false },
      { id: 5, emoji: "🌲", labelTr: "Ağaç", labelEn: "Pine Tree", isTarget: false },
      { id: 6, emoji: "🏡", labelTr: "Villa", labelEn: "Villa", isTarget: true },
      { id: 7, emoji: "🚲", labelTr: "Bisiklet", labelEn: "Bicycle", isTarget: false },
      { id: 8, emoji: "⛵", labelTr: "Yelkenli", labelEn: "Sailboat", isTarget: false },
      { id: 9, emoji: "🏬", labelTr: "Mağaza", labelEn: "Storefront", isTarget: true },
    ]
  }
];

export default function CaptchaGate({ onVerify, language, onLanguageChange }: CaptchaGateProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [currentChallengeIdx, setCurrentChallengeIdx] = useState(0);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessfullyVerified, setIsSuccessfullyVerified] = useState(false);

  const t = translations[language];
  const challenge = CHALLENGES[currentChallengeIdx];

  const handleCheckboxClick = () => {
    if (isSuccessfullyVerified) return;
    setIsVerifying(true);
    setErrorMessage(null);
    
    // Simulate initial checking
    setTimeout(() => {
      setIsVerifying(false);
      setShowChallenge(true);
      // Select a random challenge
      setCurrentChallengeIdx(Math.floor(Math.random() * CHALLENGES.length));
      setSelectedTiles([]);
    }, 850);
  };

  const handleTileClick = (tileId: number) => {
    if (selectedTiles.includes(tileId)) {
      setSelectedTiles(selectedTiles.filter(id => id !== tileId));
    } else {
      setSelectedTiles([...selectedTiles, tileId]);
    }
  };

  const handleRefresh = () => {
    let nextIdx = (currentChallengeIdx + 1) % CHALLENGES.length;
    setCurrentChallengeIdx(nextIdx);
    setSelectedTiles([]);
    setErrorMessage(null);
  };

  const handleVerify = () => {
    // Check if the selection is correct
    // MUCH EASIER ALGORITHM requested:
    // Simply check that they selected at least ONE correct tile, and ZERO incorrect tiles!
    const selectedCorrectTiles = challenge.tiles.filter(
      tile => selectedTiles.includes(tile.id) && tile.isTarget
    );
    const selectedIncorrectTiles = challenge.tiles.filter(
      tile => selectedTiles.includes(tile.id) && !tile.isTarget
    );

    const hasAtLeastOneCorrect = selectedCorrectTiles.length >= 1;
    const hasZeroIncorrect = selectedIncorrectTiles.length === 0;

    if (hasAtLeastOneCorrect && hasZeroIncorrect) {
      setErrorMessage(null);
      setShowChallenge(false);
      setIsSuccessfullyVerified(true);
      
      setTimeout(() => {
        onVerify();
      }, 950);
    } else {
      setErrorMessage(t.verificationFailed);
      setSelectedTiles([]);
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
  };

  const toggleLanguage = () => {
    onLanguageChange(language === 'tr' ? 'en' : 'tr');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4 relative overflow-hidden" id="captcha-gate-screen">
      {/* Top Floating Language Switcher */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2" id="top-lang-bar">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs sm:text-sm text-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-semibold shadow-md active:scale-95"
          id="btn-switch-lang-captcha"
        >
          <Languages className="w-4 h-4 text-blue-400" />
          <span>{language === 'tr' ? 'English (EN)' : 'Türkçe (TR)'}</span>
        </button>
      </div>

      {/* Dynamic Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" id="bg-acc-1"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" id="bg-acc-2"></div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10 flex flex-col items-center"
        id="captcha-main-card"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 mb-8" id="captcha-logo-wrapper">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl border border-slate-700 bg-slate-950 flex items-center justify-center p-1" id="captcha-brand-logo">
            <img 
              src="/src/assets/images/clickco_logo_1779887548019.png" 
              alt="ClickCO Logo"
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-left" id="captcha-brand-text">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-200">
              {t.title}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider">{t.subtitle}</p>
          </div>
        </div>

        {/* Captcha Outer Frame */}
        <div className="w-full flex justify-center py-4" id="captcha-card-frame">
          {/* Authentic Google reCAPTCHA v2 Widget */}
          <div 
            onClick={handleCheckboxClick}
            className="w-[302px] h-[78px] bg-[#f9f9f9] border border-[#d3d3d3] rounded-[3px] shadow-[0_0_4px_rgba(0,0,0,0.08)] flex items-center justify-between px-[12px] py-[10px] select-none font-sans cursor-pointer transition-colors hover:bg-[#fcfcfc] active:bg-[#f6f6f6]"
            id="recaptcha-simulate-box"
          >
            <div className="flex items-center gap-3.5" id="recaptcha-left-side">
              {/* Authentically styled reCAPTCHA checkbox */}
              <div 
                className={`w-[24px] h-[24px] rounded-[2px] border-2 flex items-center justify-center transition-all bg-white relative ${
                  isSuccessfullyVerified 
                    ? 'border-transparent' 
                    : isVerifying 
                      ? 'border-[#4a90e2]' 
                      : 'border-[#c1c1c1] hover:border-[#b2b2b2]'
                }`}
                id="recaptcha-tick-container"
              >
                {isSuccessfullyVerified && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="absolute inset-0 flex items-center justify-center"
                    id="recaptcha-check-icon"
                  >
                    {/* Handmaded exact reCAPTCHA green tick marker */}
                    <svg className="w-[30px] h-[30px] text-[#009b00] shrink-0 fill-none stroke-[3.5] mt-[-6px]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
                {isVerifying && (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-[#f3f3f3] border-t-[#4a90e2] animate-spin" id="recaptcha-spinner"></div>
                )}
              </div>
              <span className="text-[14px] font-sans font-normal text-[#222222]" id="recaptcha-text-label">
                {isSuccessfullyVerified ? t.verified : t.imNotARobot}
              </span>
            </div>

            {/* Official-looking reCAPTCHA branding block */}
            <div className="flex flex-col items-center justify-center w-[60px]" id="recaptcha-badge">
              <svg className="w-[32px] h-[32px]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.9018 2.5323 15.6806 3.4563 17.2024L1.7214 20.3019C1.4883 20.7201 1.7774 21.2335 2.2575 21.2464L6.9654 21.373L7.7661 21.3946" stroke="#4a90e2" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M6 13C6 11.5 7.5 9.5 10 9.5C12.5 9.5 13.5 11 13.5 12" stroke="#4a90e2" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M16 11.5L18.5 14L21 11.5" stroke="#4a90e2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[8px] font-sans font-black text-[#555555] tracking-tight text-center mt-0.5 mt-[-1px] scale-90">reCAPTCHA</span>
              <div className="flex gap-1 text-[7.5px] font-sans font-normal text-[#9b9b9b] whitespace-nowrap leading-none mt-[2px]" id="recaptcha-links shadow-none">
                <span className="hover:underline">{language === 'tr' ? 'Gizlilik' : 'Privacy'}</span>
                <span>•</span>
                <span className="hover:underline">{language === 'tr' ? 'Koşullar' : 'Terms'}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Challenge Dialog Overlay */}
      <AnimatePresence>
        {showChallenge && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4" id="captcha-dialog-overlay">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-[352px] bg-white border border-[#ccc] shadow-[0_12px_36px_rgba(0,0,0,0.3)] select-none flex flex-col font-sans"
              id="captcha-dialog-box"
            >
              {/* Header block: Google reCAPTCHA style */}
              <div className="bg-[#1a73e8] text-white p-6 flex flex-col justify-start" id="captcha-dialog-header">
                <p className="text-[13px] tracking-wide text-white/95 leading-tight">{language === 'tr' ? 'Şunu içeren tüm resimleri seçin:' : 'Select all images with:'}</p>
                <h3 className="text-[25px] font-bold leading-normal mt-1 mb-2 tracking-tight">
                  {language === 'tr' ? challenge.targetLabelTr : challenge.targetLabelEn}
                </h3>
                <p className="text-[12px] text-white/90 leading-normal">{language === 'tr' ? 'Bulamazsanız atla seçeneğine tıklayın' : 'If there are none, click skip'}</p>
              </div>

              {/* Grid block: 3x3 tiles style */}
              <div className="p-2 bg-[#f4f4f4]" id="captcha-dialog-grid">
                <div className="grid grid-cols-3 gap-[4px] bg-white border border-[#ccc] p-1.5" id="captcha-grid-wrapper">
                  {challenge.tiles.map((tile, idx) => {
                    const isSelected = selectedTiles.includes(tile.id);
                    return (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => handleTileClick(tile.id)}
                        className={`aspect-square relative flex flex-col items-center justify-center transition-all outline-none overflow-hidden group cursor-pointer ${
                          isSelected 
                            ? 'scale-[0.9] border-2 border-[#1a73e8] z-10' 
                            : 'bg-[#fafafa] border border-[#e4e4e4] hover:brightness-95'
                        }`}
                        id={`captcha-tile-btn-${idx}`}
                      >
                        {/* Selected Checkmark overlay */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-[#1a73e8] text-white flex items-center justify-center z-20 shadow-md shadow-black/10" id={`captcha-tile-indicator-${idx}`}>
                            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                          </div>
                        )}

                        {/* Large Illustrative Emoji inside tile */}
                        <span className="text-4.5xl transition-transform duration-300 group-hover:scale-110 filter drop-shadow select-none mb-1">{tile.emoji}</span>
                        
                        {/* Language-dependent text label inside tile */}
                        <span className="text-[10px] text-[#555] font-semibold select-none block max-w-full px-1 text-center truncate">
                          {language === 'tr' ? tile.labelTr : tile.labelEn}
                        </span>

                        {/* Visual guidance dot for quick demo testing */}
                        {tile.isTarget && (
                          <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500/40 pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 flex items-center gap-2 text-[12px] text-red-650 bg-red-50 border border-red-200 rounded p-2"
                    id="captcha-error-card"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </div>

              {/* Action buttons footer aligned key by key with reCAPTCHA v2 layout */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#ccc]" id="captcha-dialog-footer">
                <div className="flex items-center gap-4 text-[#737373]" id="captcha-footer-tools">
                  <button 
                    type="button" 
                    onClick={handleRefresh}
                    className="p-1 rounded hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
                    title={t.newQuestion}
                    id="captcha-btn-reload"
                  >
                    <RefreshCw className="w-[20px] h-[20px] stroke-[2]" />
                  </button>
                  <button 
                    type="button"
                    className="p-1 rounded hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-not-allowed"
                    title={t.help}
                    id="captcha-btn-help"
                  >
                    <HelpCircle className="w-[20px] h-[20px] stroke-[2]" />
                  </button>
                </div>

                <div className="flex items-center gap-2" id="captcha-footer-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChallenge(false);
                      setIsVerifying(false);
                      setSelectedTiles([]);
                      setErrorMessage(null);
                    }}
                    className="px-4 py-2.5 text-[14px] font-sans font-medium text-[#737373] hover:text-[#333] hover:bg-stone-50 rounded transition-all cursor-pointer"
                    id="captcha-btn-cancel"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="px-6 py-2.5 text-[14px] font-bold tracking-wide uppercase bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-[2px] shadow hover:shadow-md transition-all cursor-pointer"
                    id="captcha-btn-verify"
                  >
                    {language === 'tr' ? 'DOĞRULA' : 'VERIFY'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

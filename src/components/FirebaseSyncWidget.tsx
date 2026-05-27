import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, LogIn, LogOut, CheckCircle, Database, Key, X, AlertTriangle
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { Language, translations } from '../utils/translations';
import { isUsingMockConfig } from '../lib/firebase';

interface FirebaseSyncWidgetProps {
  language: Language;
}

export default function FirebaseSyncWidget({ language }: FirebaseSyncWidgetProps) {
  const t = translations[language];
  const { 
    user, 
    loading, 
    signIn, 
    signOut, 
    syncedHistory, 
    isDbConnected 
  } = useFirebase();

  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignInClick = async () => {
    setAuthError(null);
    if (isUsingMockConfig) {
      setShowConfigHelper(true);
    } else {
      try {
        await signIn();
      } catch (err: any) {
        console.error("Sign-In action error details:", err);
        const errStr = err?.message || err?.code || String(err);
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        
        if (errStr.includes('auth/unauthorized-domain') || errStr.includes('unauthorized-domain')) {
          setAuthError(
            language === 'tr'
              ? `Alan adı (${hostname}) Firebase projenizde yetkilendirilmemiş (Unauthorized Domain)! Bu yetkilendirmeyi eklemek için:\n\n1. Firebase Konsoluna gidin (console.firebase.google.com)\n2. Authentication -> Settings (Ayarlar) sekmesini açın.\n3. Sol menüsünden 'Authorized domains' seçeneğine tıklayın.\n4. 'Add domain' butonuna basıp şu alan adını aynen ekleyin:\n👉 ${hostname}`
              : `The domain (${hostname}) is not authorized in your Firebase Project (Unauthorized Domain)! To authorize it:\n\n1. Go to Firebase Console (console.firebase.google.com)\n2. Navigate to Authentication -> Settings tab.\n3. Click on 'Authorized domains' in the left list.\n4. Click 'Add domain' and paste exactly this domain:\n👉 ${hostname}`
          );
          setShowConfigHelper(true);
        } else if (errStr.includes('auth/cancelled-popup-request') || errStr.includes('cancelled-popup-request') || errStr.includes('auth/popup-closed-by-user') || errStr.includes('popup-closed-by-user')) {
          setAuthError(
            language === 'tr'
              ? "Giriş penceresi kapatıldı veya başka bir işlem tarafından iptal edildi. Lütfen tekrar tıklayın, açılan pencereyi kapatmayın ve tarayıcınızın pop-up engelleyicisinin pencereleri engellemediğinden emin olun."
              : "The sign-in popup was closed or cancelled by a subsequent action. Please click again, keep the popup window open, and ensure your browser's popup blocker is disabled."
          );
        } else if (errStr.includes('auth/configuration-not-found') || errStr.includes('configuration-not-found')) {
          setAuthError(
            language === 'tr'
              ? "Google ile Giriş etkinleştirilmemiş! Firebase Konsolunda 'Authentication' -> 'Sign-in method' bölümünden Google seçeneğini aktif etmelisiniz."
              : "Google Sign-In is not enabled! Please enable the Google provider in your Firebase Console under Authentication -> Sign-in method."
          );
          setShowConfigHelper(true);
        } else if (errStr.includes('auth/api-key-not-valid') || errStr.includes('api-key-not-valid')) {
          setAuthError(
            language === 'tr'
              ? "Firebase sunucu bağlantı anahtarı (API Key) geçersiz! Lütfen Secrets bölümündeki VITE_FIREBASE_API_KEY değerini kontrol edin."
              : "Firebase API Key is invalid! Please verify your VITE_FIREBASE_API_KEY configuration inside the Settings/Secrets tab."
          );
          setShowConfigHelper(true);
        } else if (errStr.includes('auth/operation-not-allowed')) {
          setAuthError(
            language === 'tr'
              ? "Bu oturum açma yöntemi Firebase projenizde devre dışı kalmış. Lütfen Google Giriş Sağlayıcıyı aktif edin."
              : "This sign-in provider is disabled in your Firebase console. Please enable Google Sign-In."
          );
          setShowConfigHelper(true);
        } else {
          setAuthError(errStr);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-center gap-3" id="firebase-sync-loading">
        <div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Firebase loading...</span>
      </div>
    );
  }

  return (
    <div className="relative" id="firebase-sync-widget-wrapper">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl relative overflow-hidden group"
        id="firebase-cloud-sync-widget"
      >
        {/* Background radial accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500" />

        {/* Header Info */}
        <div className="flex items-center justify-between border-b border-slate-850 pb-3" id="sync-widget-header">
          <div className="flex items-center gap-2" id="sync-title-box">
            <Cloud className={`w-4 h-4 ${user ? "text-blue-400 animate-pulse" : "text-slate-500"}`} />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
              {user ? t.cloudSynced : t.localGuest}
            </span>
          </div>
          
          {/* Real-time sync connectivity chip */}
          <span className={`text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isDbConnected && !isUsingMockConfig
              ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
          }`}>
            <Database className="w-2.5 h-2.5" />
            {isDbConnected && !isUsingMockConfig ? t.firebaseConnected : t.firebaseUnconfigured}
          </span>
        </div>

        {/* Auth details / instructions */}
        {!user ? (
          <div className="space-y-4" id="firebase-guest-state">
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              {language === 'tr' 
                ? "Çevrimlerinizi güvenli Google Cloud veritabanımız üzerinden yedekleyin, birden fazla cihazda geçmişinizi ve seçimlerinizi anlık olarak senkronize edin."
                : "Back up your conversions securely to our Google Cloud datastore and sync settings instantly across multiple devices."}
            </p>

            {authError && (
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-start gap-2 text-[10.5px] text-rose-450 font-medium" id="guest-auth-error-block">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold mb-0.5">
                    {language === 'tr' ? "Giriş Başarısız" : "Sign-In Failed"}
                  </p>
                  <p className="text-slate-300 leading-normal text-[10px] whitespace-pre-line">{authError}</p>
                </div>
              </div>
            )}

            {isUsingMockConfig && !authError && (
              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-start gap-2 text-[10px] text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <p className="font-bold mb-0.5">
                    {language === 'tr' ? "Yedekleme Kurulumu Gerekli" : "Activation Required"}
                  </p>
                  <p className="text-slate-400 leading-normal">
                    {language === 'tr' 
                      ? "Veri tabanı bağlantısını etkinleştirmek için lütfen butona tıklayıp adımları uygulayın."
                      : "Please click the button to follow the easy Firebase activation steps."}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignInClick}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] cursor-pointer"
              id="btn-firebase-signin"
            >
              <LogIn className="w-4 h-4 text-blue-100" />
              <span>{t.signInWithGoogle}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4" id="firebase-authenticated-state">
            <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-850 p-3 rounded-xl" id="sync-profile-box">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-8 h-8 rounded-full border border-blue-500/30"
                  referrerPolicy="no-referrer"
                  id="user-profile-avatar"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono" id="avatar-fallback">
                  {user.displayName?.substring(0, 2).toUpperCase() || "US"}
                </div>
              )}
              
              <div className="min-w-0 flex-1" id="user-profile-details">
                <h5 className="text-white text-xs font-bold truncate leading-none mb-1">{user.displayName || user.email}</h5>
                <p className="text-[10px] text-slate-500 truncate font-mono leading-none">{user.email}</p>
              </div>

              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded border border-blue-500/20 font-mono" id="conversions-sync-badge">
                {syncedHistory.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-[10px] text-emerald-400 leading-normal" id="db-connected-disclaimer">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.syncedWithFirebase}</span>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-rose-400 bg-slate-950/40 hover:bg-rose-955/10 border border-slate-850 hover:border-rose-950/40 py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
              id="btn-firebase-signout"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.signOut}</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* Manual Configuration Step-By-Step Interactive Modal overlay */}
      <AnimatePresence>
        {showConfigHelper && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfigHelper(false)}
            id="config-helper-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
              id="config-helper-card"
            >
              {/* Header */}
              <div className="bg-slate-950 p-5 border-b border-slate-850 flex items-center justify-between" id="helper-header">
                <div className="flex items-center gap-2" id="helper-header-title">
                  <Key className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
                    {language === 'tr' ? "Firebase Bulut Entegrasyonu" : "Firebase Cloud Integration"}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowConfigHelper(false)}
                  className="p-1 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                  id="helper-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto" id="helper-body">
                {authError && (
                  <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-start gap-3 text-xs" id="modal-auth-error-block">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-rose-300 mb-1">
                        {language === 'tr' ? "Bağlantı/Yapılandırma Hatası Tespit Edildi" : "Firebase Connection Error Detected"}
                      </p>
                      <p className="text-slate-300 leading-relaxed font-medium whitespace-pre-line">{authError}</p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {language === 'tr' 
                    ? "Sandbox projelerinde otomatik veritabanı API sınırları mevcuttur. Çevrimlerinizin anlık bulut senkronizasyonunu başlatmak için kendi Firebase / Google Cloud projesini Secrets sekmesinde tanımlayabilirsiniz."
                    : "Automatic data channel activation has cloud-tenant limits. To enable instant, high-speed data sync across active user sessions, define your custom web properties inside the AI Studio Secrets panel."}
                </p>

                <div className="space-y-3" id="steps-container">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {language === 'tr' ? "🔐 Kurulum Adımları:" : "🔐 Activation Procedure:"}
                  </h4>
                  
                  <div className="space-y-2 text-xs" id="helper-steps">
                    <div className="flex items-start gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-850" id="step-1">
                      <span className="bg-blue-500/10 text-blue-400 font-mono font-bold w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0">1</span>
                      <p className="text-slate-300">
                        {language === 'tr'
                          ? "Kendi Firebase Konsolunuzda bir web projesi açın ve Firestore Veritabanı ile Google Auth sağlayıcısını (Google Sign-In) etkinleştirin."
                          : "Create a web project in your Firebase Console, then enable Firestore Database and Google Authentication."}
                      </p>
                    </div>

                    <div className="flex items-start gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-850" id="step-2">
                      <span className="bg-blue-500/10 text-blue-400 font-mono font-bold w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0">2</span>
                      <div>
                        <p className="text-slate-300 font-medium mb-1">
                          {language === 'tr'
                            ? "AI Studio sol panelindeki 'Settings' (Ayarlar) -> 'Secrets' panelini açın."
                            : "Navigate to the 'Settings' (Secrets tab) in the AI Studio sidebar."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-850" id="step-3">
                      <span className="bg-blue-500/10 text-blue-400 font-mono font-bold w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0">3</span>
                      <div className="space-y-1.5 w-full">
                        <p className="text-slate-300">
                          {language === 'tr'
                            ? "Aşağıdaki anahtarları kopyalayarak Firebase Web uygulamanızın değerlerini sırasıyla girin:"
                            : "Define the following environment variables using your web config parameters:"}
                        </p>
                        
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[9.5px] text-blue-300 space-y-1 overflow-x-auto select-all" id="keys-syntax-box">
                          <div>VITE_FIREBASE_API_KEY="..."</div>
                          <div>VITE_FIREBASE_AUTH_DOMAIN="..."</div>
                          <div>VITE_FIREBASE_PROJECT_ID="..."</div>
                          <div>VITE_FIREBASE_STORAGE_BUCKET="..."</div>
                          <div>VITE_FIREBASE_MESSAGING_SENDER_ID="..."</div>
                          <div>VITE_FIREBASE_APP_ID="..."</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 text-[10px] text-amber-500 leading-normal font-medium" id="help-footer-notice">
                  {language === 'tr'
                    ? "Not: Bilgileri girip kaydettiğinizde sunucu otomatik yenilenir ve bağlantı şifreli şekilde gerçek zamanlı kurulur!"
                    : "Note: The application reboots and adapts automatically once credentials are saved. Security auto-sync will launch instantly!"}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-950 p-4 border-t border-slate-850 flex justify-end" id="helper-footer">
                <button
                  onClick={() => setShowConfigHelper(false)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-5 rounded-xl transition-all cursor-pointer active:scale-[0.98]"
                  id="helper-confirm-btn"
                >
                  {language === 'tr' ? "Anladım, Kapat" : "Got it"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

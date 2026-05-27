import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileCheck, Download, Trash2, ArrowRight, Award, Zap } from 'lucide-react';
import JSZip from 'jszip';
import { ConversionResult } from '../types';
import { Language, translations } from '../utils/translations';

interface ConversionHistoryProps {
  history: ConversionResult[];
  onClearAll: () => void;
  onDeleteItem: (id: string) => void;
  language: Language;
  purgeAfterDownload: boolean;
}

export default function ConversionHistory({ history, onClearAll, onDeleteItem, language, purgeAfterDownload }: ConversionHistoryProps) {
  const t = translations[language];
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadAll = async () => {
    if (history.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const nameCounts: Record<string, number> = {};

      for (const item of history) {
        try {
          const response = await fetch(item.downloadUrl);
          const blob = await response.blob();
          
          let fileName = item.fileName;
          if (nameCounts[fileName] !== undefined) {
            nameCounts[fileName]++;
            const extIndex = fileName.lastIndexOf('.');
            if (extIndex !== -1) {
              const base = fileName.substring(0, extIndex);
              const ext = fileName.substring(extIndex);
              fileName = `${base} (${nameCounts[fileName]})${ext}`;
            } else {
              fileName = `${fileName} (${nameCounts[fileName]})`;
            }
          } else {
            nameCounts[fileName] = 0;
          }

          zip.file(fileName, blob);
        } catch (err) {
          console.error("Error zipping file:", item.fileName, err);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      
      const lnk = document.createElement('a');
      lnk.href = url;
      lnk.download = `clickco_conversions_${Date.now()}.zip`;
      document.body.appendChild(lnk);
      lnk.click();
      document.body.removeChild(lnk);
      
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

      if (purgeAfterDownload) {
        setTimeout(() => {
          onClearAll();
        }, 1200);
      }
    } catch (err) {
      console.error("Error creating zip file:", err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadClick = (id: string) => {
    if (purgeAfterDownload) {
      // Small buffer delay so browser starts streaming/downloading the blob first
      setTimeout(() => {
        onDeleteItem(id);
      }, 750);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSavings = (original: number, converted: number) => {
    if (converted >= original) return null;
    const diff = original - converted;
    const percentage = Math.round((diff / original) * 100);
    return percentage;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="conversion-history-component">
      <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4" id="history-section-header">
        <div className="flex items-center gap-2" id="history-label-box">
          <FileCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-white font-bold text-base">{t.historyTitle}</h3>
          <span className="bg-slate-800 text-slate-300 text-xs font-mono font-bold px-2 py-0.5 rounded-full" id="history-cnt-badge">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" id="history-header-actions">
            <button
              type="button"
              disabled={isZipping}
              onClick={handleDownloadAll}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-blue-500/10 active:scale-95"
              id="btn-download-all-zip"
            >
              {isZipping ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.zipping}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-100" />
                  <span>{t.downloadAll}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-rose-450 hover:text-rose-400 border border-slate-800 hover:border-rose-950/20 bg-slate-950/40 hover:bg-rose-955/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              id="btn-clear-history"
            >
              {t.clearHistory}
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-slate-505" id="empty-history-body">
          <div className="w-12 h-12 rounded-full bg-slate-950/40 border border-slate-800/80 flex items-center justify-center mx-auto mb-3" id="empty-history-icon">
            <Zap className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-sm font-semibold text-slate-400">{t.emptyHistory}</p>
          <p className="text-xs text-slate-600 mt-1">{t.emptyHistoryDesc}</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 sm:scrollbar-none" id="history-items-list">
          <AnimatePresence initial={false}>
            {history.map((item) => {
              const savings = getSavings(item.originalSize, item.convertedSize);
              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, height: 0, y: -10, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", y: 0, marginBottom: 12 }}
                  exit={{ opacity: 0, height: 0, y: 15, transition: { duration: 0.2 } }}
                  className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 hover:border-slate-750/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
                  id={`history-item-row-${item.id}`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0" id="hist-item-left">
                    <div className="flex items-center gap-2 flex-wrap" id="hist-item-formats-row">
                      {/* Directional formats */}
                      <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700/65 uppercase">
                        {item.originalFormat}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-450 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-555/20 uppercase">
                        {item.targetFormat}
                      </span>

                      {/* Savings Percentage tag if applicable */}
                      {savings && savings > 0 && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center gap-0.5" id="saving-pct">
                          <Award className="w-3 h-3 text-amber-500" />
                          %{savings} {t.savingsText}
                        </span>
                      )}
                    </div>

                    <h4 className="text-white text-xs font-semibold truncate hover:text-blue-400 transition-colors" title={item.fileName}>
                      {item.fileName}
                    </h4>

                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-mono" id="hist-item-sizes">
                      <span>{t.original}: {formatBytes(item.originalSize)}</span>
                      <span>•</span>
                      <span>{t.newSize}: {formatBytes(item.convertedSize)}</span>
                    </div>
                  </div>

                  {/* Operation downloads / deletes buttons */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/80 sm:pt-0 pt-3" id="hist-item-actions">
                    <a
                      href={item.downloadUrl}
                      download={item.fileName}
                      onClick={() => handleDownloadClick(item.id)}
                      className="flex-1 sm:flex-initial p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-250 hover:text-white border border-slate-800 hover:border-slate-700/80 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      id={`btn-hist-download-${item.id}`}
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>{t.download}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2.5 bg-slate-950 text-slate-505 hover:text-rose-400 border border-slate-850 hover:border-rose-955 hover:bg-rose-955/10 rounded-lg transition-all cursor-pointer animate-fade-in"
                      id={`btn-hist-delete-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

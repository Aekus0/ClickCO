import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, Image as ImageIcon, Settings, 
  RefreshCw, Download, 
  Check, FileText, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { FileItem, ConversionConfig, ConversionResult } from '../types';
import { convertFile } from '../utils/conversionApi';
import { Language, translations } from '../utils/translations';

interface FileConverterProps {
  onConversionSuccess: (result: ConversionResult) => void;
  language: Language;
  purgeAfterTimer: boolean;
  purgeAfterDownload: boolean;
  onDeleteItem: (id: string) => void;
}

export default function FileConverter({ 
  onConversionSuccess, 
  language, 
  purgeAfterTimer, 
  purgeAfterDownload, 
  onDeleteItem 
}: FileConverterProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [config, setConfig] = useState<ConversionConfig>({
    targetFormat: '',
    quality: 90,
    csvDelimiter: ',',
    width: undefined,
    height: undefined
  });
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'converting' | 'success' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  const [countdown, setCountdown] = useState<number | null>(null);

  // Countdown timer for secure auto-purge
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (result) {
        onDeleteItem(result.id);
        handleReset();
      }
      setCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, result, onDeleteItem]);

  const handleDownloadClick = () => {
    if (purgeAfterDownload && result) {
      const targetId = result.id;
      // Small buffer delay so browser starts downloading before item deletion
      setTimeout(() => {
        onDeleteItem(targetId);
        handleReset();
      }, 750);
    }
  };

  // Helper inside formatter
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get source properties
  const getFileCategory = (file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) return 'image';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['csv', 'json', 'xml', 'md', 'txt'].includes(ext || '')) return 'document';
    return 'other';
  };

  const getTargetFormats = (file: File): string[] => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (file.type.startsWith('image/')) {
      return ['PNG', 'JPG', 'WEBP', 'GIF', 'BMP'].filter(f => f.toLowerCase() !== ext);
    }
    
    switch (ext) {
      case 'json':
        return ['CSV', 'XML', 'TXT'];
      case 'csv':
        return ['JSON', 'TXT'];
      case 'md':
        return ['HTML', 'TXT'];
      case 'xml':
        return ['JSON', 'TXT'];
      default:
        return ['Base64', 'TXT'];
    }
  };

  // Drag and Drop triggers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setupFile(e.target.files[0]);
    }
  };

  const setupFile = (rawFile: File) => {
    const ext = rawFile.name.split('.').pop()?.toLowerCase() || '';
    const fileObj: FileItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      name: rawFile.name,
      size: rawFile.size,
      type: rawFile.type,
      extension: ext,
      file: rawFile
    };

    setSelectedFile(fileObj);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setErrorText(null);

    // Auto-select first target option
    const available = getTargetFormats(rawFile);
    setConfig(prev => ({
      ...prev,
      targetFormat: available[0] || 'TXT',
      quality: 90,
      width: undefined,
      height: undefined
    }));
  };

  const handleConvert = async () => {
    if (!selectedFile) return;
    setStatus('converting');
    setProgress(0);
    setErrorText(null);

    // Multilingual steps
    const stepsTr = [
      { prg: 20, msg: 'Dosya okunuyor ve yapısı inceleniyor...' },
      { prg: 50, msg: 'Format kod çözümleri uygulanıyor...' },
      { prg: 75, msg: 'Yeni veri yapısı paketleniyor ve kodlanıyor...' },
      { prg: 95, msg: 'Blob URL oluşturuluyor ve çıktı doğrulanıyor...' }
    ];

    const stepsEn = [
      { prg: 20, msg: 'Reading file and exploring key formats...' },
      { prg: 50, msg: 'Decoding original structures...' },
      { prg: 75, msg: 'Encoding output data model...' },
      { prg: 95, msg: 'Resolving downloadable stream link...' }
    ];

    const targetSteps = language === 'tr' ? stepsTr : stepsEn;

    for (const step of targetSteps) {
      await new Promise(r => setTimeout(r, 400));
      setProgress(step.prg);
      setProgressMsg(step.msg);
    }

    try {
      const res = await convertFile(selectedFile, config);
      setProgress(100);
      setProgressMsg(language === 'tr' ? 'Dönüştürme işlemi tamamlandı!' : 'Conversion complete!');
      
      if (res.status === 'success') {
        setStatus('success');
        setResult(res);
        onConversionSuccess(res);
        if (purgeAfterTimer) {
          setCountdown(10);
        }
      } else {
        setStatus('failed');
        setErrorText(res.error || t.verificationFailed);
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorText(err.message || 'Error occurred during parsing processing.');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setErrorText(null);
    setCountdown(null);
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="file-converter-component">
      <div className="mb-6 flex items-center justify-between" id="converter-box-header">
        <h2 className="text-lg font-bold text-white flex items-center gap-2" id="converter-label-heading">
          <Upload className="w-5 h-5 text-blue-500" /> {t.converterTitle}
        </h2>
        {selectedFile && (
          <button 
            type="button" 
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-rose-455 transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-slate-950/40 border border-slate-800 cursor-pointer"
            id="btn-upload-new"
          >
            {t.clearBtn}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!selectedFile ? (
                  <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            whileHover={{ y: -3, borderColor: "rgba(59, 130, 246, 0.4)", boxShadow: "0 12px 24px -10px rgba(59, 130, 246, 0.15)" }}
            whileTap={{ scale: 0.99 }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerSelect}
            className={`w-full min-h-[225px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors duration-300 relative group overflow-hidden ${
              isDragActive 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-slate-800 bg-slate-950/20'
            }`}
            id="converter-dropzone-frame"
          >
            {/* Ambient background aura animation when active or hovered */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-indigo-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.txt,.md,.csv,.json,.xml"
              id="hidden-web-file-input"
            />
            
            {/* Pulsing icon container */}
            <motion.div 
              animate={isDragActive ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="p-4 bg-slate-900 border border-slate-800/80 rounded-2xl mb-4 text-blue-400 shadow-md relative group-hover:bg-slate-850 transition-colors" 
              id="upload-icon-circle"
            >
              <Upload className="w-8 h-8 pointer-events-none" />
              {/* Ripple aura */}
              <span className="absolute -inset-1 rounded-2xl border border-blue-500/0 group-hover:border-blue-500/30 group-hover:scale-110 transition-all duration-300 pointer-events-none" />
            </motion.div>
            
            <h3 className="text-white font-semibold text-base transition-colors group-hover:text-blue-300">{t.dropzoneTitle}</h3>
            <p className="text-slate-400 text-xs max-w-sm mt-1 mx-auto leading-relaxed">
              {t.dropzoneDesc}
            </p>
            
            <div className="mt-5 flex flex-wrap justify-center gap-2 relative z-10" id="supported-chips">
              <span className="text-[10px] font-mono font-medium tracking-wider bg-slate-805 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full uppercase group-hover:border-slate-600 transition-colors">{t.imageGroup}</span>
              <span className="text-[10px] font-mono font-medium tracking-wider bg-slate-805 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full uppercase group-hover:border-slate-600 transition-colors">{t.docGroup}</span>
              <span className="text-[10px] font-mono font-medium tracking-wider bg-slate-805 border border-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full uppercase group-hover:border-slate-600 transition-colors">{t.textGroup}</span>
            </div>
          </motion.div>
        ) : (
          // Active conversion workspace
          <motion.div
            key="workspace"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
            id="converter-workspace-area"
          >
            {/* Selected File presentation row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 gap-4" id="metadata-display-row">
              <div className="flex items-center gap-3.5" id="meta-left-info">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400" id="file-icon-wrapper">
                  {getFileCategory(selectedFile.file) === 'image' ? (
                    <ImageIcon className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm leading-tight max-w-[200px] sm:max-w-xs md:max-w-md truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs font-mono" id="sub-meta-size">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span>•</span>
                    <span className="uppercase">{selectedFile.extension}</span>
                  </div>
                </div>
              </div>

              {/* Conversion target mapping select */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0" id="meta-right-action">
                <span className="text-slate-400 text-xs font-medium">{t.targetLabel}</span>
                <div className="relative flex-1 sm:flex-initial" id="target-format-picker">
                  <select
                    value={config.targetFormat}
                    onChange={(e) => setConfig({ ...config, targetFormat: e.target.value })}
                    className="w-full sm:w-28 text-white text-xs bg-slate-900 border border-slate-800 rounded-lg p-2.5 outline-none font-bold tracking-wide focus:border-blue-500 font-mono"
                    id="select-target-type"
                  >
                    {getTargetFormats(selectedFile.file).map((fmt) => (
                      <option key={fmt} value={fmt}>{fmt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced configurations accordion toggle */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden" id="adv-settings-collapsible">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-950/20 hover:bg-slate-950/40 text-xs text-slate-300 font-semibold cursor-pointer"
                id="btn-advanced-toggle"
              >
                <div className="flex items-center gap-1.5" id="adv-config-label">
                  <Settings className="w-4 h-4 text-blue-400" />
                  <span>{t.advancedBtn}</span>
                </div>
                {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {isAdvancedOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-t border-slate-800/80 bg-slate-950/30 p-4 space-y-4 text-xs"
                    id="adv-config-slider-panel"
                  >
                    {getFileCategory(selectedFile.file) === 'image' ? (
                      // Image configuration options
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="img-options-subgrid">
                        <div className="space-y-1.5" id="quality-range-slider">
                          <div className="flex justify-between" id="quality-label-row">
                            <span className="text-slate-450 text-[11px] font-medium">{t.imageQuality}</span>
                            <span className="text-blue-400 font-semibold font-mono">{config.quality}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="100"
                            value={config.quality || 90}
                            onChange={(e) => setConfig({ ...config, quality: parseInt(e.target.value) })}
                            className="w-full accent-blue-505 cursor-pointer text-slate-850 h-1 rounded"
                            id="img-quality-slider"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2" id="resize-inputs">
                          <div className="space-y-1" id="resize-width-box">
                            <label className="text-slate-450 text-[11px] font-medium block">{t.resizeLabel}</label>
                            <input
                              type="number"
                              placeholder="Width"
                              value={config.width || ''}
                              onChange={(e) => setConfig({ ...config, width: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1.5 outline-none focus:border-blue-500 font-mono text-[11px]"
                              id="input-resize-w"
                            />
                          </div>
                          <div className="space-y-1 flex flex-col justify-end" id="resize-height-box">
                            <input
                              type="number"
                              placeholder="Height"
                              value={config.height || ''}
                              onChange={(e) => setConfig({ ...config, height: e.target.value ? parseInt(e.target.value) : undefined })}
                              className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1.5 outline-none focus:border-blue-500 font-mono text-[11px]"
                              id="input-resize-h"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Document / code options
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="doc-options-subgrid">
                        {((selectedFile.extension === 'csv' && config.targetFormat === 'JSON') ||
                          (selectedFile.extension === 'json' && config.targetFormat === 'CSV')) && (
                          <div className="space-y-1.5" id="delimiter-char-box">
                            <label className="text-slate-450 font-medium block">{t.csvDelimiterLabel}</label>
                            <select
                              value={config.csvDelimiter || ','}
                              onChange={(e) => setConfig({ ...config, csvDelimiter: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 text-white rounded p-1.5 outline-none focus:border-blue-505 font-mono"
                              id="select-csv-delimiter"
                            >
                              <option value=",">{t.csvComma}</option>
                              <option value=";">{t.csvSemicolon}</option>
                              <option value="	">{t.csvTab}</option>
                              <option value="|">{t.csvPipe}</option>
                            </select>
                          </div>
                        )}
                        <p className="text-slate-500 text-[11px] leading-normal flex items-start gap-1 p-2 bg-slate-950/40 rounded border border-slate-900/60" id="doc-info-desc">
                          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                          {t.documentInfoTip}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Core Operation Status Panel */}
            <div className="space-y-4" id="conversion-operation-box">
              {status === 'idle' && (
                <button
                  type="button"
                  onClick={handleConvert}
                  className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/15 text-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
                  id="btn-convert-action"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                  <span>{t.startConversion} ({selectedFile.extension.toUpperCase()} → {config.targetFormat})</span>
                </button>
              )}

              {status === 'converting' && (
                <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800/80" id="progress-indicator-box">
                  <div className="flex items-center justify-between mb-3" id="prg-text-row">
                    <span className="text-slate-300 text-xs font-semibold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      {progressMsg}
                    </span>
                    <span className="text-blue-400 font-mono font-bold text-xs">{progress}%</span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden" id="prg-bar-b">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.2 }}
                      className="bg-gradient-to-r from-blue-500 to-indigo-505 h-full rounded-full"
                      id="prg-bar-filled"
                    ></motion.div>
                  </div>
                </div>
              )}

              {status === 'success' && result && (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-4" id="success-results-card">
                  <div className="flex items-start gap-3" id="success-header-row">
                    <div className="p-2 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 rounded-lg shrink-0" id="tick-box">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{t.conversionSuccess}</h4>
                      <p className="text-slate-300 text-xs mt-0.5" id="output-meta-row">
                        {language === 'tr' ? 'Hedef format:' : 'Target format:'} <span className="font-mono bg-slate-900 px-1 py-0.5 rounded text-emerald-400 font-bold">{result.targetFormat}</span> • {t.newSize}: <span className="text-slate-200 font-mono">{formatBytes(result.convertedSize)}</span>
                      </p>
                    </div>
                  </div>

                  {countdown !== null && (
                    <div className="bg-amber-500/10 border border-amber-555/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2" id="countdown-banner-alert">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-500" />
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-amber-450">{t.countdownText}</span>
                        <span className="font-mono bg-amber-950/40 border border-amber-555/35 px-1.5 py-0.5 rounded text-amber-400 font-bold">{countdown} {t.secondsText}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2" id="success-actions-row">
                    {/* Primary immediate download URL trigger */}
                    <a
                      href={result.downloadUrl}
                      download={result.fileName}
                      onClick={handleDownloadClick}
                      className="flex-1 p-3 bg-emerald-600 hover:bg-emerald-555 text-white font-bold rounded-lg text-xs tracking-wide shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-97 transition-all flex items-center justify-center gap-2"
                      id="link-download-output"
                    >
                      <Download className="w-4 h-4" />
                      {t.downloadNewFile}
                    </a>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="sm:px-5 py-3 h-full hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold rounded-lg text-xs tracking-wide transition-all cursor-pointer"
                      id="btn-convert-another"
                    >
                      {t.convertAnother}
                    </button>
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-3" id="error-results-card">
                  <div className="flex items-start gap-3" id="err-header-row">
                    <div className="p-2 bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-lg shrink-0" id="error-box">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{t.conversionFailed}</h4>
                      <p className="text-rose-300 text-xs mt-1 leading-relaxed">{errorText}</p>
                    </div>
                  </div>
                  <div className="pt-2" id="err-footer-act">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-800 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                      id="btn-retry-reset"
                    >
                      {t.selectNewFile}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

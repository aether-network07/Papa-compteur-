import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  Clock, 
  Type, 
  Download,
  FileText,
  BookOpen,
  Mic,
  Square,
  Play,
  Volume2,
  Loader2,
  Music,
  Wind,
  Sparkles as SparkleIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { estimateReadTime, cn } from '../lib/utils';

const SFX_MAP: Record<string, string> = {
  '[FORET]': 'https://assets.mixkit.co/sfx/preview/mixkit-forest-birds-and-crickets-ambience-1210.mp3',
  '[MAGIE]': 'https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkle-chime-2833.mp3',
  '[VENT]': 'https://assets.mixkit.co/sfx/preview/mixkit-wind-gust-heavy-1158.mp3',
  '[OISEAUX]': 'https://assets.mixkit.co/sfx/preview/mixkit-morning-birds-2472.mp3',
  '[NUIT]': 'https://assets.mixkit.co/sfx/preview/mixkit-crickets-and-insects-in-the-wild-ambience-39.mp3',
  '[EAU]': 'https://assets.mixkit.co/sfx/preview/mixkit-calm-river-ambience-loop-2384.mp3'
};

interface ReaderProps {
  user: User;
  scriptId: string | null;
  navigateTo: (page: string, id: string | null) => void;
}

export function Reader({ user, scriptId, navigateTo }: ReaderProps) {
  const [script, setScript] = useState<any>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [loading, setLoading] = useState(!!scriptId);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [pitch, setPitch] = useState(0.4); 
  const [rate, setRate] = useState(0.8);
  const [useSfx, setUseSfx] = useState(true);
  const [ambientAudio, setAmbientAudio] = useState<HTMLAudioElement | null>(null);
  const [activeAmbient, setActiveAmbient] = useState<string | null>(null);
  const [showVisuals, setShowVisuals] = useState(true);
  const gender = 'male';

  useEffect(() => {
    return () => {
      if (ambientAudio) {
        ambientAudio.pause();
        ambientAudio.src = '';
      }
    };
  }, [ambientAudio]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      const frVoices = availableVoices.filter(v => v.lang.includes('fr'));
      
      const maleVoices = frVoices.filter(v => {
        const name = v.name.toLowerCase();
        // Exclusion stricte des voix féminines connues
        if (name.includes('female') || name.includes('julie') || name.includes('amélie') || name.includes('hortense') || name.includes('clair') || name.includes('dénise')) {
          return false;
        }
        // Inclusion uniquement des voix masculines connues ou contenant 'google français'
        return name.includes('male') || 
               name.includes('thomas') || 
               name.includes('paul') || 
               name.includes('antoine') ||
               name.includes('henri') || 
               name.includes('tom') ||
               name.includes('belgi') || 
               name.includes('michel') ||
               name.includes('google français');
      });

      setVoices(maleVoices);
      
      const preferred = maleVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('thomas') || 
               name.includes('paul') || 
               name.includes('antoine') ||
               name.includes('google français');
      }) || maleVoices[0];

      if (preferred) {
        setSelectedVoice(preferred.name);
      } else if (availableVoices.length > 0) {
        // Fallback info if no male voices found but some voices exist
        console.warn("Aucune voix masculine locale détectée.");
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    if (scriptId) {
      const fetchScript = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, 'scripts', scriptId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setScript(docSnap.data());
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchScript();
    } else {
      setLoading(false);
    }
  }, [scriptId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err) {
      console.error("Erreur micro:", err);
      alert("Microphone non accessible. Vérifiez les permissions.");
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
    }
  };

  const speakText = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = script.rawContent.replace(/\[.*?\]/g, '');
    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    } else {
      // Si aucune voix de la liste filtrée n'est sélectionnée ou trouvée
      const isActuallyEmpty = voices.length === 0;
      if (isActuallyEmpty) {
        alert("Aucune voix masculine locale. Utilisez le bouton 'Générer Audio (IA)' pour obtenir un fichier audio avec une voix d'homme.");
        return;
      }
      utterance.lang = 'fr-FR';
    }
    
    utterance.pitch = pitch; 
    utterance.rate = rate; 

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const generateIAAudio = async () => {
    if (!script) return;
    setIsGenerating(true);
    setGeneratedAudioUrl(null);

    const textToRead = script.rawContent
      .replace(/\[.*?\]/g, '') 
      .replace(/\n/g, ' ')
      .substring(0, 5000);

    try {
      const response = await fetch(`/api/tts?text=${encodeURIComponent(textToRead)}`);
      if (!response.ok) throw new Error("Erreur serveur lors de la génération");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setGeneratedAudioUrl(url);
    } catch (err) {
      console.error("Erreur génération audio:", err);
      alert("Erreur lors de la génération. Le texte est peut-être trop long ou l'API est indisponible.");
    } finally {
      setIsGenerating(false);
    }
  };

  const playSfx = (tag: string) => {
    if (!useSfx) return;
    const url = SFX_MAP[tag];
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.4;
      audio.play().catch(e => console.error("SFX error:", e));
    }
  };

  const toggleAmbient = (tag: string) => {
    if (activeAmbient === tag) {
      ambientAudio?.pause();
      setActiveAmbient(null);
      return;
    }

    const url = SFX_MAP[tag];
    if (url) {
      if (ambientAudio) {
        ambientAudio.pause();
      }
      const newAudio = new Audio(url);
      newAudio.loop = true;
      newAudio.volume = 0.2;
      newAudio.play().catch(e => console.error("Ambient error:", e));
      setAmbientAudio(newAudio);
      setActiveAmbient(tag);
    }
  };

  const copyToClipboard = () => {
    const text = (script.adaptedContent || script.rawContent).replace(/\[.*?\]/g, '');
    navigator.clipboard.writeText(text);
    alert("Texte copié ! Tu peux le coller dans CapCut.");
  };

  const downloadAllVisuals = async () => {
    if (!script.visuals) return;
    const urls = script.visuals.filter((v: any) => v.url).map((v: any) => v.url);
    if (urls.length === 0) {
      alert("Aucune image n'a été générée pour ce script.");
      return;
    }

    alert("Le téléchargement de plusieurs images va commencer. Veuillez autoriser les téléchargements multiples si demandé.");
    
    for (let i = 0; i < urls.length; i++) {
      const response = await fetch(urls[i]);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${script.title}_img_${i + 1}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Small pause to help some browsers handle multiple downloads
      await new Promise(r => setTimeout(r, 500));
    }
  };

  if (loading) return null;
  if (!script) return <div className="text-center p-20">Script non trouvé.</div>;

  const duration = estimateReadTime(script.rawContent);
  const textToDisplay = script.rawContent;

  return (
    <div className={cn(
      "space-y-8",
      isFullScreen ? "fixed inset-0 z-[100] bg-warm-50 overflow-auto p-4 md:p-10" : ""
    )}>
      <header className="flex items-center justify-between gap-4 border-b border-warm-200 pb-6 mb-8">
        <div className="flex items-center gap-4">
          {!isFullScreen && (
            <button
              onClick={() => navigateTo('studio', scriptId)}
              className="p-2 hover:bg-warm-100 rounded-xl text-warm-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-serif font-bold text-warm-900">{script.title}</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs text-warm-500 font-bold uppercase tracking-wider">
                <Clock size={14} className="text-warm-400" />
                Durée estimée : {Math.ceil(duration / 60)} min
              </span>
              <span className="flex items-center gap-1.5 text-xs text-warm-500 font-bold uppercase tracking-wider">
                <BookOpen size={14} className="text-warm-400" />
                Ton : {script.tone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateIAAudio}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border bg-orange-600 text-white hover:bg-orange-700 shadow-md",
              isGenerating && "opacity-50 cursor-wait"
            )}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            Générer Audio (IA)
          </button>

          <button
            onClick={speakText}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              isSpeaking ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-white border-warm-200 text-warm-600 hover:bg-warm-50"
            )}
          >
            <Volume2 size={18} className={isSpeaking ? "animate-pulse" : ""} />
            {isSpeaking ? "Arrêter" : "Écouter l'IA"}
          </button>

          <button
            onClick={() => setUseSfx(!useSfx)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              useSfx ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-white border-warm-200 text-warm-600 hover:bg-warm-50"
            )}
            title="Effets sonores auto"
          >
            <SparkleIcon size={18} className={useSfx ? "text-orange-500" : ""} />
            SFX {useSfx ? "ON" : "OFF"}
          </button>

          <button
            onClick={() => setShowVisuals(!showVisuals)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              showVisuals ? "bg-orange-100 border-orange-200 text-orange-600" : "bg-white border-warm-200 text-warm-600 hover:bg-warm-50"
            )}
            title="Afficher les images"
          >
            <ImageIcon size={18} />
            Visuals {showVisuals ? "ON" : "OFF"}
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg",
              isRecording 
                ? "bg-red-500 text-white animate-pulse" 
                : "bg-warm-900 text-white hover:bg-warm-800"
            )}
          >
            {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
            {isRecording ? "Enregistrement..." : "Enregistrer"}
          </button>

          <div className="flex items-center bg-warm-100 rounded-xl p-1">
            <button 
              onClick={() => setFontSize(Math.max(16, fontSize - 2))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-warm-600 transition-all font-bold"
            >
              A-
            </button>
            <span className="w-8 text-center text-xs font-bold text-warm-500">{fontSize}</span>
            <button 
              onClick={() => setFontSize(Math.min(48, fontSize + 2))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-warm-600 transition-all font-bold"
            >
              A+
            </button>
          </div>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 bg-warm-900 text-white rounded-xl shadow-lg hover:bg-warm-800 transition-all"
            title="Plein écran"
          >
            {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </header>

      <div className={cn(
        "bg-white rounded-[40px] shadow-2xl border border-warm-100 mx-auto transition-all",
        isFullScreen ? "max-w-4xl" : "max-w-3xl"
      )}>
        <div className="flex flex-wrap items-center gap-4 px-8 py-4 bg-warm-100/50 border-b border-warm-200">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-warm-500 uppercase">Voix Système :</label>
            <div className="flex flex-col">
              {voices.length === 0 ? (
                <span className="text-[10px] text-red-500 font-bold">Aucune voix masculine trouvée. Essayez Chrome.</span>
              ) : (
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="bg-white border border-warm-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-orange-500 transition-all outline-none min-w-[220px]"
                >
                  {voices.map(v => {
                    let label = v.name;
                    const n = v.name.toLowerCase();
                    if (n.includes('thomas')) label = "🇫🇷 Voix masculine - Thomas (FR)";
                    else if (n.includes('paul')) label = "🇫🇷 Voix masculine - Paul (FR)";
                    else if (n.includes('antoine')) label = "🇨🇦 Voix masculine - Antoine (CA)";
                    else if (n.includes('google français')) label = "🇫🇷 Voix masculine - Google (FR)";
                    
                    return <option key={v.name} value={v.name}>{label}</option>
                  })}
                </select>
              )}
              {selectedVoice && (
                <span className="text-[8px] font-bold uppercase mt-0.5 px-1 tracking-wider text-orange-600">
                  ✓ Voix masculine (vibrante)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 border-l border-warm-200 ml-2">
              <label className="text-[10px] font-bold text-warm-500 uppercase">Ambiance :</label>
              <div className="flex gap-1">
                {Object.keys(SFX_MAP).filter(k => k === '[FORET]' || k === '[VENT]' || k === '[NUIT]' || k === '[EAU]').map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleAmbient(tag)}
                    className={cn(
                      "w-6 h-6 rounded flex items-center justify-center transition-all",
                      activeAmbient === tag ? "bg-orange-600 text-white" : "bg-white text-warm-400 hover:text-orange-600 border border-warm-100"
                    )}
                    title={tag.replace('[', '').replace(']', '')}
                  >
                    {tag === '[FORET]' && <Music size={12} />}
                    {tag === '[VENT]' && <Wind size={12} />}
                    {tag === '[NUIT]' && <div className="text-[8px]">🌙</div>}
                    {tag === '[EAU]' && <div className="text-[8px]">💧</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-warm-500 uppercase">Gravité :</label>
              <input 
                type="range" min="0.4" max="1.0" step="0.1" 
                value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-20 accent-orange-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-warm-500 uppercase">Vitesse :</label>
              <input 
                type="range" min="0.5" max="1.5" step="0.1" 
                value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-20 accent-orange-600"
              />
            </div>
          </div>

          <button 
            onClick={copyToClipboard}
            className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white border border-warm-200 rounded-lg text-xs font-bold text-warm-600 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
          >
            Copier pour CapCut
          </button>
        </div>

        {/* Audio Player if recorded or generated */}
        <AnimatePresence>
          {(audioUrl || generatedAudioUrl) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-orange-50 border-b border-orange-100 px-8 py-4 flex items-center justify-between rounded-t-[40px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center">
                  <Play size={14} fill="currentColor" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-900">
                    {generatedAudioUrl ? "Voix IA générée" : "Enregistrement terminé"}
                  </p>
                  <audio src={generatedAudioUrl || audioUrl || ''} controls className="h-8 mt-1 scale-90 origin-left" />
                </div>
              </div>
              <a 
                href={generatedAudioUrl || audioUrl || ''} 
                download={generatedAudioUrl ? `${script.title}_voix_IA.mp3` : `${script.title}_enregistrement.webm`}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-all shadow-md"
              >
                <Download size={14} />
                Télécharger pour CapCut
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Paper texture overlay */}
        <div className="relative flex flex-col md:flex-row min-h-[80vh]">
          {/* Main Content Area */}
          <div className={cn(
            "p-12 md:p-20 relative overflow-hidden transition-all duration-500",
            showVisuals && script.visuals?.length > 0 ? "md:w-2/3" : "w-full"
          )}>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/notebook.png")' }} />
            
            <div className="relative z-10 space-y-6">
              {textToDisplay.split('\n').map((line: string, i: number) => {
                if (!line.trim()) return <br key={i} />;
                
                const parts = line.split(/(\[.*?\])/);
                return (
                  <p 
                    key={i} 
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    className="font-serif text-warm-800 leading-relaxed tracking-tight"
                  >
                    {parts.map((p, j) => 
                      p.startsWith('[') ? (
                        <button 
                          key={j} 
                          onClick={() => playSfx(p)}
                          className="text-orange-500 font-sans font-bold italic inline-block mx-1.5 px-3 py-0.5 bg-orange-50 rounded-lg border border-orange-100 animate-pulse select-none hover:bg-orange-600 hover:text-white transition-colors"
                        >
                          {p}
                        </button>
                      ) : p
                    )}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Visuals Sidebar (Montage Timeline View) */}
          <AnimatePresence>
            {showVisuals && script.visuals?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="md:w-1/3 bg-warm-50/50 border-l border-warm-200 p-6 md:p-8 space-y-6 overflow-y-auto max-h-[80vh] md:max-h-none"
              >
                <div className="flex items-center justify-between sticky top-0 bg-warm-50/80 backdrop-blur-sm pb-4 mb-2 z-20">
                  <h3 className="text-xs font-black text-warm-400 uppercase tracking-widest">Storyboard IA</h3>
                  <button 
                    onClick={downloadAllVisuals}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full hover:bg-orange-100 transition-all border border-orange-100"
                  >
                    <Download size={10} /> Tout exporter
                  </button>
                </div>
                
                <div className="space-y-8">
                  {script.visuals.map((visual: any, idx: number) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="group flex flex-col gap-2"
                    >
                      <div className="relative aspect-[9/16] bg-warm-200 rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                        {visual.url ? (
                          <img 
                            src={visual.url} 
                            alt={`Scène ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-warm-300">
                            <ImageIcon size={32} strokeWidth={1} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Scène {idx + 1}
                        </div>
                      </div>
                      <p className="text-[10px] text-warm-400 italic line-clamp-2 px-1">
                        "{visual.text}"
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isFullScreen && (
        <div className="max-w-3xl mx-auto flex justify-between items-center py-10 opacity-60">
          <p className="text-xs text-warm-400 font-medium italic">"Lisez doucement, vivez chaque mot..."</p>
          <div className="flex gap-4">
             <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-warm-600 hover:text-warm-900 transition-colors">
               <Download size={14} />
               Export PDF
             </button>
             <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-warm-600 hover:text-warm-900 transition-colors">
               <FileText size={14} />
               Prompt seul
             </button>
          </div>
        </div>
      )}
    </div>
  );
}



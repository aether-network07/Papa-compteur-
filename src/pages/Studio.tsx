import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Wand2, 
  Save, 
  ChevronRight, 
  History, 
  Mic2, 
  Type, 
  AlertCircle,
  Loader2,
  Check,
  Sparkles,
  Clock,
  Image as ImageIcon,
  Download,
  RefreshCw,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { adaptScript } from '../lib/gemini';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface StudioProps {
  user: User;
  navigateTo: (page: string, id: string | null) => void;
  scriptId: string | null;
}

export function Studio({ user, navigateTo, scriptId }: StudioProps) {
  const [title, setTitle] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [tone, setTone] = useState('Mystérieux');
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Image Generation State
  const [segments, setSegments] = useState<{text: string, prompt: string, imageUrl: string, isGenerating: boolean}[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  useEffect(() => {
    // Extract paragraphs and initialize prompts when rawContent changes
    if (rawContent) {
      const paragraphs = rawContent
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 20 && !p.startsWith('[') && !p.endsWith(']'));
      
      // Limit to 5 paragraphs or adjust as needed
      const baseSegments = paragraphs.slice(0, 8).map((p, i) => {
        // Try to keep existing imagery if only minor text changes happened
        const existing = segments.find(s => s.text === p);
        if (existing) return existing;

        return {
          text: p,
          prompt: `Illustration de conte africain mystérieux, style sombre et envoûtant, clair de lune, couleurs profondes, ${p}. Format vertical, art numérique, ambiance mystique.`,
          imageUrl: '',
          isGenerating: false
        };
      });

      if (JSON.stringify(baseSegments.map(s => s.text)) !== JSON.stringify(segments.map(s => s.text))) {
        setSegments(baseSegments);
      }
    }
  }, [rawContent]);

  const generateImage = async (index: number) => {
    const segment = segments[index];
    if (!segment.prompt) return;

    const newSegments = [...segments];
    newSegments[index].isGenerating = true;
    setSegments(newSegments);

    // Pollinations URL
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(segment.prompt)}?width=576&height=1024&nologo=true&model=flux`;
    
    // Tiny delay to show animation context
    setTimeout(() => {
      const updatedSegments = [...newSegments];
      updatedSegments[index].imageUrl = imageUrl;
      updatedSegments[index].isGenerating = false;
      setSegments(updatedSegments);
    }, 500);
  };

  const generateAllImages = async () => {
    setIsGeneratingAll(true);
    for (let i = 0; i < segments.length; i++) {
      await generateImage(i);
      // Stagger slightly for UI flare
      await new Promise(r => setTimeout(r, 300));
    }
    setIsGeneratingAll(false);
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `episode_image_${index + 1}.webp`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
      alert("Erreur lors du téléchargement. Vous pouvez aussi faire un appui long sur l'image.");
    }
  };

  const tones = [
    { id: 'Papa conteur', label: 'Papa conteur', desc: 'Chaleureux, posé, captivant' },
    { id: 'Mystérieux', label: 'Mystérieux', desc: 'Lent, grave, suspense' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      // Fetch projects
      const projQ = query(collection(db, 'projects'), where('userId', '==', user.uid));
      const projSnap = await getDocs(projQ);
      setProjects(projSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();

    if (scriptId) {
      const fetchScript = async () => {
        const docRef = doc(db, 'scripts', scriptId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title);
          setRawContent(data.rawContent);
          setTone(data.tone || 'Mystérieux');
          setProjectId(data.projectId || '');
          if (data.visuals) {
            setSegments(data.visuals.map((v: any) => ({
              text: v.text,
              prompt: v.prompt,
              imageUrl: v.url,
              isGenerating: false
            })));
          }
        }
      };
      fetchScript();
    }
  }, [scriptId, user.uid]);

  const handleSave = async () => {
    const finalTitle = title.trim() || `Histoire du ${new Date().toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (!rawContent) {
      alert("Veuillez entrer un texte.");
      return null;
    }
    setIsSaving(true);
    try {
      const scriptData: any = {
        title: finalTitle,
        rawContent: rawContent.trim(),
        adaptedContent: '',
        tone,
        projectId: projectId || 'default',
        visuals: segments.map(s => ({
          prompt: s.prompt,
          url: s.imageUrl,
          text: s.text
        })),
        updatedAt: serverTimestamp(),
        userId: user.uid,
      };

      let finalId = scriptId;
      if (scriptId) {
        await updateDoc(doc(db, 'scripts', scriptId), scriptData);
      } else {
        scriptData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'scripts'), scriptData);
        finalId = docRef.id;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setTitle(finalTitle);
      return finalId;
    } catch (err) {
      console.error("Save error:", err);
      alert("Erreur de sauvegarde : " + (err instanceof Error ? err.message : "Inconnue"));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoToReader = async () => {
    const finalId = await handleSave();
    if (finalId) {
      navigateTo('reader', finalId);
    }
  };

  const handleAdapt = async () => {
    if (!rawContent) return;
    setIsAdapting(true);
    try {
      const result = await adaptScript(rawContent, tone);
      setRawContent(result);
    } catch (err) {
      console.error("Adapt error:", err);
      alert("Erreur lors de l'adaptation par l'IA.");
    } finally {
      setIsAdapting(false);
    }
  };

  const wordCount = rawContent.trim().split(/\s+/).length;
  const estimatedSeconds = Math.ceil((wordCount / 130) * 60);
  const isOverTime = estimatedSeconds > 110;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-warm-900">Studio de Voix Off</h2>
          <p className="text-warm-500">Préparez votre script pour une lecture inoubliable.</p>
        </div>
        <div className="flex gap-3">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border",
            isOverTime ? "bg-red-50 border-red-200 text-red-600" : "bg-green-50 border-green-200 text-green-600"
          )}>
            <Clock size={16} />
            Est. {Math.floor(estimatedSeconds / 60)}m {estimatedSeconds % 60}s
            {isOverTime && " (Trop long ! Max 1m50)"}
          </div>
          <button
            onClick={() => navigateTo('library', null)}
            className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:bg-warm-200 rounded-xl transition-colors text-sm font-medium"
          >
            <History size={18} />
            Mes Scripts
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title || !rawContent}
            className="flex items-center gap-2 px-6 py-2 bg-warm-900 text-white rounded-xl shadow-lg shadow-warm-900/20 hover:bg-warm-800 disabled:opacity-50 transition-all font-medium"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <Check size={18} /> : <Save size={18} />}
            {saveSuccess ? 'Enregistré' : 'Sauvegarder'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto">
        <section className="space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-warm-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-warm-700 uppercase tracking-wider">Projet associé</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400 focus:bg-white transition-all font-sans"
                >
                  <option value="">Aucun projet</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-warm-700 uppercase tracking-wider">Titre de l'épisode</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Le voyage de P'tit Ours..."
                  className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400 focus:bg-white transition-all text-lg font-serif"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-warm-700 uppercase tracking-wider">Votre Script</label>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Collez ici votre histoire..."
                className="w-full bg-warm-50 border-none rounded-xl px-4 py-6 focus:ring-2 focus:ring-warm-400 focus:bg-white transition-all h-[400px] resize-none font-sans leading-relaxed text-lg"
              />
            </div>

            <div className="pt-4 border-t border-warm-100">
              <div className="space-y-4 mb-8">
                <label className="text-sm font-bold text-warm-700 uppercase tracking-wider block text-center">Style de narration (Voix d'Homme)</label>
                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={cn(
                        "text-center p-4 rounded-2xl border transition-all duration-200",
                        tone === t.id
                          ? "bg-warm-900 border-warm-900 text-white shadow-xl"
                          : "border-warm-100 hover:border-warm-300 text-warm-600"
                      )}
                    >
                      <p className="text-sm font-bold">{t.label}</p>
                      <p className={cn(
                        "text-[10px] leading-tight mt-1",
                        tone === t.id ? "text-warm-300" : "text-warm-500"
                      )}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleAdapt}
                  disabled={isAdapting || !rawContent}
                  className="sm:w-[280px] flex items-center justify-center gap-3 bg-orange-100 text-orange-600 py-6 rounded-2xl font-bold text-lg hover:bg-orange-200 transition-all shadow-xl shadow-orange-600/5 disabled:opacity-50"
                  title="Améliorer le ton et ajouter des indications scéniques avec l'IA"
                >
                  {isAdapting ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                  <span>Adapter avec l'IA</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleGoToReader();
                  }}
                  disabled={isSaving || !rawContent}
                  className="flex-1 flex items-center justify-center gap-4 bg-orange-600 text-white py-6 rounded-2xl font-bold text-2xl hover:bg-orange-700 transition-all shadow-2xl shadow-orange-600/30 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={32} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Mic2 size={32} />
                      Démarrer la Voix Off
                    </>
                  )}
                </button>
              </div>
              <p className="text-center text-warm-400 text-sm mt-4 italic">
                Durée max recommandée : 1m50. Utilisez des balises comme <span className="text-orange-400 font-bold">[FORET]</span>, <span className="text-orange-400 font-bold">[MAGIE]</span> ou <span className="text-orange-400 font-bold">[VENT]</span> pour ajouter des sons !
              </p>
            </div>
          </div>

          {/* New Image Generation Section */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-warm-100 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-warm-900 flex items-center gap-2">
                  <ImageIcon className="text-orange-600" />
                  🖼️ Génération d'images pour l'épisode
                </h3>
                <p className="text-sm text-warm-500">Créez l'univers visuel de votre histoire.</p>
              </div>
              <button
                onClick={generateAllImages}
                disabled={isGeneratingAll || segments.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                {isGeneratingAll ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                Générer les {segments.length} images
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {segments.map((segment, idx) => (
                <div key={idx} className="bg-warm-50 rounded-2xl p-6 space-y-4 border border-warm-100 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-warm-400 uppercase tracking-widest">Séquence {idx + 1}</span>
                    <span className="text-[10px] font-bold text-warm-300">TikTok Vertical (576x1024)</span>
                  </div>
                  
                  <p className="text-xs text-warm-400 italic leading-relaxed line-clamp-3">
                    "{segment.text}"
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-warm-500 uppercase">Prompt Visuel IA</label>
                    <textarea 
                      value={segment.prompt}
                      onChange={(e) => {
                        const newSegs = [...segments];
                        newSegs[idx].prompt = e.target.value;
                        setSegments(newSegs);
                      }}
                      className="w-full bg-white border border-warm-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all min-h-[80px] resize-none font-sans"
                    />
                  </div>

                  <div className="relative aspect-[9/16] bg-warm-200 rounded-xl overflow-hidden shadow-inner group">
                    {segment.imageUrl ? (
                      <>
                        <img 
                          src={segment.imageUrl} 
                          alt={`Séquence ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button
                            onClick={() => generateImage(idx)}
                            className="p-3 bg-white text-orange-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Régénérer"
                          >
                            <RefreshCw size={20} />
                          </button>
                          <button
                            onClick={() => downloadImage(segment.imageUrl, idx)}
                            className="p-3 bg-white text-orange-600 rounded-full shadow-lg hover:scale-110 transition-transform"
                            title="Télécharger"
                          >
                            <Download size={20} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-warm-400 p-8 text-center space-y-4">
                        {segment.isGenerating ? (
                          <>
                            <Loader2 size={40} className="animate-spin text-orange-400" />
                            <p className="text-xs font-bold animate-pulse">L'IA dessine votre scène...</p>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={40} strokeWidth={1} />
                            <p className="text-xs">Aucune image générée pour ce segment.</p>
                            <button
                              onClick={() => generateImage(idx)}
                              className="px-4 py-2 bg-white text-warm-700 rounded-lg text-xs font-bold shadow-sm hover:bg-warm-100 transition-colors"
                            >
                              ✨ Créer l'image
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {segments.length === 0 && (
                <div className="col-span-full py-12 text-center bg-warm-50 rounded-3xl border border-dashed border-warm-200">
                  <Type className="mx-auto text-warm-300 mb-2" size={32} />
                  <p className="text-warm-500 font-medium">Écrivez un script pour commencer la génération d'images.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Search, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  FileText, 
  Plus,
  Filter,
  Calendar,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface LibraryProps {
  user: User;
  navigateTo: (page: string, id: string | null) => void;
}

export function Library({ user, navigateTo }: LibraryProps) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchScripts = async () => {
      const q = query(
        collection(db, 'scripts'), 
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScripts(results);
      setLoading(false);
    };
    fetchScripts();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce script ?')) {
      await deleteDoc(doc(db, 'scripts', id));
      setScripts(scripts.filter(s => s.id !== id));
    }
  };

  const filteredScripts = scripts.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-warm-900">Bibliothèque de Scripts</h2>
          <p className="text-warm-500">Retrouvez toutes vos histoires au même endroit.</p>
        </div>
        <button
          onClick={() => navigateTo('studio', null)}
          className="flex items-center gap-2 px-6 py-3 bg-warm-600 text-white rounded-2xl shadow-lg hover:bg-warm-700 transition-all font-bold"
        >
          <Plus size={20} />
          Nouveau script
        </button>
      </header>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-warm-100 mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par titre ou par ton..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-warm-50 border-none rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-warm-400 focus:bg-white transition-all"
          />
        </div>
        <button className="hidden md:flex items-center gap-2 px-4 py-3 text-warm-600 font-medium hover:bg-warm-50 rounded-xl transition-all">
          <Filter size={18} />
          Filtrer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-warm-100 space-y-4 animate-pulse">
              <div className="h-6 w-3/4 bg-warm-50 rounded" />
              <div className="h-4 w-1/2 bg-warm-50 rounded" />
              <div className="flex justify-between mt-6">
                <div className="h-8 w-20 bg-warm-50 rounded-lg" />
                <div className="h-8 w-20 bg-warm-50 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredScripts.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50 bg-warm-100 rounded-3xl border-2 border-dashed border-warm-200">
            <FileText size={48} className="mx-auto" />
            <p className="font-serif italic text-xl">Aucun script trouvé...</p>
            <button onClick={() => navigateTo('studio', null)} className="text-warm-600 font-bold underline">Créer votre première histoire</button>
          </div>
        ) : (
          filteredScripts.map((script) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={script.id}
              className="bg-white p-6 rounded-3xl border border-warm-100 hover:shadow-xl hover:shadow-warm-200/50 transition-all group flex flex-col h-full"
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    script.tone === 'Papa conteur' ? "bg-orange-100 text-orange-700" :
                    script.tone === 'Aventure' ? "bg-blue-100 text-blue-700" :
                    script.tone === 'Mystérieux' ? "bg-purple-100 text-purple-700" :
                    "bg-green-100 text-green-700"
                  )}>
                    {script.tone}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigateTo('studio', script.id)}
                      className="p-2 hover:bg-warm-100 rounded-lg text-warm-600"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(script.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-serif font-bold group-hover:text-warm-600 transition-colors leading-tight">
                  {script.title}
                </h3>
                <div className="flex items-center gap-4 text-xs text-warm-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {script.updatedAt?.toDate().toLocaleDateString()}
                  </span>
                  {script.adaptedContent && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {Math.ceil(script.rawContent.split(/\s+/).length / 130)} min
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-warm-50">
                <button
                  onClick={() => navigateTo('reader', script.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-warm-50 text-warm-900 rounded-xl font-bold hover:bg-warm-900 hover:text-white transition-all text-sm shadow-sm"
                >
                  Lire & Enregistrer
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

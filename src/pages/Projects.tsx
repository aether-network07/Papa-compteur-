import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  FolderHeart, 
  Plus, 
  Trash2, 
  FolderOpen, 
  ChevronRight,
  Book,
  StickyNote,
  Loader2,
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

interface ProjectsProps {
  user: User;
}

export function Projects({ user }: ProjectsProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', notes: '' });

  useEffect(() => {
    fetchProjects();
  }, [user.uid]);

  const fetchProjects = async () => {
    const q = query(collection(db, 'projects'), where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    setProjects(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleOpenModal = (proj: any = null) => {
    if (proj) {
      setEditingId(proj.id);
      setFormData({ name: proj.name, notes: proj.notes || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, 'projects', editingId), formData);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...formData,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer ce projet ?')) {
      await deleteDoc(doc(db, 'projects', id));
      fetchProjects();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-warm-900">Vos Projets Créatifs</h2>
          <p className="text-warm-500">Regroupez vos histoires par séries ou thématiques.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-warm-600 text-white rounded-2xl shadow-lg hover:bg-warm-700 transition-all font-bold"
        >
          <Plus size={20} />
          Nouveau Projet
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-warm-500" size={40} />
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50 bg-warm-50 rounded-3xl border-2 border-dashed border-warm-200">
            <FolderHeart size={48} className="mx-auto" />
            <p className="font-serif italic text-xl">Aucun projet pour le moment...</p>
            <p className="text-sm">Créez un projet pour organiser vos épisodes.</p>
          </div>
        ) : (
          projects.map((proj) => (
            <motion.div
              layout
              key={proj.id}
              className="bg-white rounded-3xl border border-warm-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="bg-warm-100 p-6 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-warm-600 rounded-xl flex items-center justify-center text-white shadow-md">
                    <Book size={20} />
                  </div>
                  <h3 className="text-xl font-serif font-bold group-hover:text-warm-700 transition-colors">{proj.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => handleOpenModal(proj)} className="p-2 hover:bg-white/50 rounded-lg text-warm-600">
                    <History size={16} />
                  </button>
                  <button onClick={() => handleDelete(proj.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 space-y-4">
                {proj.notes ? (
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warm-400">
                       <StickyNote size={14} />
                       Notes de projet
                     </div>
                     <p className="text-sm text-warm-600 line-clamp-3 leading-relaxed">{proj.notes}</p>
                   </div>
                ) : (
                  <p className="text-xs text-warm-400 italic">Aucune note pour ce projet.</p>
                )}
              </div>

              <div className="p-6 pt-0 mt-auto">
                <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-warm-100 rounded-xl font-bold text-warm-600 hover:bg-warm-50 hover:border-warm-200 transition-all text-sm">
                  Voir les scripts
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-warm-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-serif font-bold">
                  {editingId ? 'Modifier' : 'Nouveau'} Projet
                </h3>
                <button onClick={() => setShowModal(false)} className="text-warm-400 hover:text-warm-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Nom du projet</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Les aventures de Lucas"
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Notes du projet</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Fil rouge, ambiance, personnages récurrents..."
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 h-32 focus:ring-2 focus:ring-warm-400 resize-none"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-warm-200 rounded-xl font-bold text-warm-500 hover:bg-warm-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-2 py-3 bg-warm-900 text-white rounded-xl font-bold hover:bg-warm-800 transition-all shadow-lg"
                  >
                    Enregistrer le projet
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

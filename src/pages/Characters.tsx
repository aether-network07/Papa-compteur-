import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  Users, 
  Plus, 
  Trash2, 
  Save, 
  UserCircle, 
  Mic, 
  MessageSquare,
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface CharactersProps {
  user: User;
}

export function Characters({ user }: CharactersProps) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    personality: '',
    vocalTraits: '',
    notes: ''
  });

  useEffect(() => {
    fetchCharacters();
  }, [user.uid]);

  const fetchCharacters = async () => {
    const q = query(collection(db, 'characters'), where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    setCharacters(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleOpenModal = (char: any = null) => {
    if (char) {
      setEditingId(char.id);
      setFormData({
        name: char.name,
        personality: char.personality,
        vocalTraits: char.vocalTraits,
        notes: char.notes
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', personality: '', vocalTraits: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    try {
      if (editingId) {
        await updateDoc(doc(db, 'characters', editingId), formData);
      } else {
        await addDoc(collection(db, 'characters'), {
          ...formData,
          userId: user.uid
        });
      }
      setShowModal(false);
      fetchCharacters();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer ce personnage ?')) {
      await deleteDoc(doc(db, 'characters', id));
      fetchCharacters();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-warm-900">Fiches Personnages</h2>
          <p className="text-warm-500">Définissez l'identité vocale de vos héros.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-warm-900 text-white rounded-2xl shadow-lg hover:bg-warm-800 transition-all font-bold"
        >
          <Plus size={20} />
          Nouveau Personnage
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader2 className="animate-spin text-warm-500" size={40} />
          </div>
        ) : characters.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 opacity-50 bg-warm-100 rounded-3xl border-2 border-dashed border-warm-200">
            <Users size={48} className="mx-auto" />
            <p className="font-serif italic text-xl">Aucun personnage créé...</p>
            <p className="text-sm">Commencez par donner vie à vos personnages pour guider l'IA.</p>
          </div>
        ) : (
          characters.map((char) => (
            <motion.div
              layout
              key={char.id}
              className="bg-white p-6 rounded-3xl border border-warm-100 hover:shadow-xl transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-warm-100 rounded-2xl flex items-center justify-center text-warm-600">
                    <UserCircle size={28} />
                  </div>
                  <h3 className="text-xl font-serif font-bold">{char.name}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenModal(char)} className="p-2 hover:bg-warm-100 rounded-lg text-warm-600">
                    <Save size={16} />
                  </button>
                  <button onClick={() => handleDelete(char.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Sparkles size={14} className="text-warm-400 mt-1 shrink-0" />
                  <p className="text-sm text-warm-700 italic">"{char.personality}"</p>
                </div>
                <div className="flex gap-2">
                  <Mic size={14} className="text-warm-400 mt-1 shrink-0" />
                  <p className="text-sm font-medium">{char.vocalTraits}</p>
                </div>
                {char.notes && (
                  <div className="flex gap-2 p-3 bg-warm-50 rounded-xl">
                    <MessageSquare size={14} className="text-warm-400 mt-1 shrink-0" />
                    <p className="text-xs text-warm-600">{char.notes}</p>
                  </div>
                )}
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
                  {editingId ? 'Modifier' : 'Nouveau'} Personnage
                </h3>
                <button onClick={() => setShowModal(false)} className="text-warm-400 hover:text-warm-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Nom</label>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Papa Ours"
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Personnalité</label>
                  <input
                    value={formData.personality}
                    onChange={(e) => setFormData({...formData, personality: e.target.value})}
                    placeholder="Ex: Calme, protecteur, un peu distrait"
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Traits vocaux</label>
                  <input
                    value={formData.vocalTraits}
                    onChange={(e) => setFormData({...formData, vocalTraits: e.target.value})}
                    placeholder="Ex: Voix grave, traînante, petit rire étouffé"
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-warm-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-warm-500">Notes additionnelles</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Ex: Accent particulier, tics de langage..."
                    className="w-full bg-warm-50 border-none rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-warm-400 resize-none"
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
                    Enregistrer le personnage
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

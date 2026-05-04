import React from 'react';
import { BookOpen, Sparkles, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onSignIn: () => void;
}

export function Auth({ onSignIn }: AuthProps) {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_0%,_var(--color-warm-200),_transparent)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-warm-600 rounded-2xl flex items-center justify-center text-white shadow-2xl mx-auto shadow-warm-600/30">
            <BookOpen size={40} />
          </div>
          <h1 className="text-4xl font-serif font-bold text-warm-900">Papa Conteur</h1>
          <p className="text-warm-600 text-lg leading-relaxed font-serif italic">
            "Chaque histoire mérite d'être racontée avec le cœur."
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-warm-200 border border-warm-100 space-y-6">
          <p className="text-warm-500 text-sm">
            Connectez-vous pour retrouver vos scripts, vos personnages et votre studio personnalisé.
          </p>
          
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-3 bg-warm-900 text-white py-4 rounded-2xl font-semibold hover:bg-warm-800 transition-all hover:shadow-lg active:scale-[0.98]"
          >
            <LogIn size={20} />
            Se connecter avec Google
          </button>

          <div className="flex items-center gap-2 justify-center text-warm-400 text-xs">
            <Sparkles size={14} />
            Production Voix Off & Contes
          </div>
        </div>
      </motion.div>
    </div>
  );
}

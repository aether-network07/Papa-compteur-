import React from 'react';
import { User } from 'firebase/auth';
import { 
  BookOpen, 
  Library as LibraryIcon, 
  Mic2, 
  Users, 
  FolderHeart, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Layout({ children, user, currentPage, onNavigate, onLogout }: LayoutProps) {
  const menuItems = [
    { id: 'studio', label: 'Studio', icon: Mic2 },
    { id: 'library', label: 'Bibliothèque', icon: LibraryIcon },
    { id: 'characters', label: 'Personnages', icon: Users },
    { id: 'projects', label: 'Projets', icon: FolderHeart },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-warm-50 text-warm-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-warm-100 border-b md:border-b-0 md:border-r border-warm-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-warm-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-warm-600/20">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold leading-tight">Papa Conteur</h1>
            <p className="text-xs text-warm-500 font-medium tracking-wide uppercase">Studio Voix Off</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                currentPage === item.id 
                  ? "bg-warm-600 text-white shadow-md shadow-warm-600/10" 
                  : "text-warm-600 hover:bg-warm-200"
              )}
            >
              <item.icon size={18} className={cn(currentPage === item.id ? "text-white" : "text-warm-500 group-hover:text-warm-700")} />
              {item.label}
              {currentPage === item.id && (
                <motion.div layoutId="nav-glow" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-warm-200 space-y-4">
          <div className="flex items-center gap-3 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-warm-300" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-warm-300 rounded-full flex items-center justify-center text-warm-600 text-xs">
                {user.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.displayName}</p>
              <p className="text-[10px] text-warm-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-warm-500 hover:text-warm-700 hover:bg-warm-200 rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-10">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

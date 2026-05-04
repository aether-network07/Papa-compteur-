import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Layout } from './components/Layout';
import { Studio } from './pages/Studio';
import { Library } from './pages/Library';
import { Characters } from './pages/Characters';
import { Reader } from './pages/Reader';
import { Projects } from './pages/Projects';
import { Auth } from './pages/Auth';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('studio');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-warm-200 rounded-full"></div>
          <p className="text-warm-500 font-serif italic text-lg">Préparation au coin du feu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignIn={signInWithGoogle} />;
  }

  const navigateTo = (page: string, scriptId: string | null = null) => {
    setCurrentPage(page);
    setSelectedScriptId(scriptId);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'studio':
        return <Studio user={user} navigateTo={navigateTo} scriptId={selectedScriptId} />;
      case 'library':
        return <Library user={user} navigateTo={navigateTo} />;
      case 'characters':
        return <Characters user={user} />;
      case 'reader':
        return <Reader user={user} scriptId={selectedScriptId} navigateTo={navigateTo} />;
      case 'projects':
        return <Projects user={user} />;
      default:
        return <Studio user={user} navigateTo={navigateTo} scriptId={null} />;
    }
  };

  return (
    <Layout user={user} currentPage={currentPage} onNavigate={navigateTo} onLogout={logout}>
      {renderPage()}
    </Layout>
  );
}

import { useState } from 'react';
import Admin from './components/Admin';
import Enrollment from './components/Enrollment';
import Session from './components/Session';

export default function App() {
  const [view, setView] = useState('session');

  const navItems = [
    { id: 'session', label: 'Session', icon: '📹' },
    { id: 'enroll', label: 'Enrôler', icon: '➕' },
    { id: 'admin', label: 'Admin', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-violet-50 to-blue-100 relative overflow-hidden">
      {/* Fond animé soft avec bleus/violet dégradés */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient de base */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-violet-50 to-indigo-100 opacity-100"></div>
        
        {/* Blobs animés */}
        <div className="absolute top-0 -left-32 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob opacity-30"></div>
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000 opacity-25"></div>
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000 opacity-20"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-6000 opacity-25"></div>
        
        {/* Overlay gradient subtil */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/60 border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-violet-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
                <span className="text-white text-xl font-bold">👤</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:via-violet-700 group-hover:to-indigo-800 transition-all duration-300">
                  FaceCheck
                </h1>
                <p className="text-xs text-gray-500 font-bold tracking-wider">RECONNAISSANCE FACIALE</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2 bg-white/40 backdrop-blur-lg p-1.5 rounded-full border border-white/40 shadow-lg">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`px-6 py-2.5 rounded-full font-bold transition-all duration-300 whitespace-nowrap transform hover:scale-105 active:scale-95 ${
                    view === item.id
                      ? 'bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 text-white shadow-lg scale-105 ring-2 ring-white/50'
                      : 'text-gray-700 hover:bg-white/50 hover:text-blue-700 hover:shadow-md'
                  }`}
                >
                  <span className="mr-2 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden flex gap-2 mt-4">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  view === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'bg-white/50 text-gray-700 border border-white/20'
                }`}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-4">
          {/* Animated transition */}
          <div className="animate-fadeIn">
            {view === 'session' && <Session />}
            {view === 'enroll' && <Enrollment />}
            {view === 'admin' && <Admin />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 py-8 border-t border-white/30 bg-gradient-to-r from-white/50 via-blue-50/50 to-white/50 backdrop-blur-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-700 text-sm font-bold tracking-wide mb-2">
            © 2025 <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">FaceCheck</span>
          </p>
          <p className="text-gray-600 text-xs font-medium">IHM Exceptionnelle pour Reconnaissance Faciale en Temps Réel</p>
        </div>
      </footer>
    </div>
  );
}

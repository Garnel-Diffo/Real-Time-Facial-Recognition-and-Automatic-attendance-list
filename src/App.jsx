// src/App.jsx
import { useState } from 'react';
import Admin from './components/Admin';
import Enrollment from './components/Enrollment';
import Session from './components/Session';

/*
  Composant principal `App` qui affiche la navigation et bascule
  entre les vues : Enrôlement, Session (détection en temps réel) et Admin.
*/

export default function App() {
  // État pour gérer la vue active (enroll, session ou admin)
  const [view, setView] = useState('session');

  return (
    <div className="min-h-screen p-8 bg-bg">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application de détection de présence</h1>
        {/* Barre de navigation pour basculer entre les vues */}
        <nav className="space-x-3">
          <button onClick={() => setView('enroll')} className="btn bg-white">Enrôlement</button>
          <button onClick={() => setView('session')} className="btn bg-white">Session</button>
          <button onClick={() => setView('admin')} className="btn bg-white">Admin</button>
        </nav>
      </header>

      <main>
        {/* Afficher le composant correspondant à la vue active */}
        {view === 'enroll' && <Enrollment />}
        {view === 'session' && <Session />}
        {view === 'admin' && <Admin />}
      </main>
    </div>
  );
}

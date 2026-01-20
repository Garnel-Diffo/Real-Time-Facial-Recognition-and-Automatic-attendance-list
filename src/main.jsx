import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/*
  Point d'entrée de l'application React.
  Ce fichier monte le composant racine `App` dans l'élément DOM #root.
  Les commentaires ici expliquent le rôle et facilitent la lecture pour
  toute personne qui ouvre le projet.
*/
const rootEl = document.getElementById('root');
const root = createRoot(rootEl);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

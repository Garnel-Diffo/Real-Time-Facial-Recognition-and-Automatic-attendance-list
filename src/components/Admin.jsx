// src/components/Admin.jsx
import { useEffect, useState } from 'react';
import { clearEnrollments, deleteEnrollment, loadEnrollments } from '../services/faceService';

/*
  Composant `Admin` : interface simple pour gérer les enrôlements stockés.
  - Affiche la liste des personnes enrôlées et le nombre de photos enregistrées.
  - Permet de supprimer tous les enrôlements (clear).
*/

export default function Admin() {
  // État pour stocker la liste des enrôlements
  const [list, setList] = useState([]);

  // Au montage du composant, charger la liste des enrôlements depuis la base locale
  useEffect(() => {
    (async () => {
      const enrolls = await loadEnrollments();
      setList(enrolls);
    })();
  }, []);

  // Fonction pour supprimer tous les enrôlements stockés
  async function purgeAll() {
    if (window.confirm('Êtes-vous sûr ? Cette action est irréversible.')) {
      await clearEnrollments();
      setList([]);
    }
  }

  // Fonction pour supprimer un enrôlement individuel
  async function deleteOne(label) {
    if (window.confirm(`Supprimer l'enrôlement de "${label}" ?`)) {
      await deleteEnrollment(label);
      setList(list.filter(e => e.label !== label));
    }
  }

  return (
    <div className="card max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Administration</h2>
      <div className="mb-4">
        <ul>
          {list.length === 0 && <li className="text-gray-500 py-2">Aucun enrôlement</li>}
          {list.map(e => (
            <li key={e.label} className="py-3 px-3 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 rounded">
              <span className="font-medium">{e.label} <span className="text-gray-500 text-sm">({e.descriptors.length} photos)</span></span>
              <button 
                onClick={() => deleteOne(e.label)}
                className="btn bg-red-400 hover:bg-red-500 text-white text-sm px-3 py-1 rounded"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-3">
        <button className="btn bg-red-500 text-white" onClick={purgeAll}>Supprimer tout</button>
        <button className="btn bg-white text-black" onClick={() => alert('Fonction d’export backup non implémentée')}>Exporter backup</button>
      </div>
    </div>
  );
}

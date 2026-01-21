import { useEffect, useState } from 'react';
import { clearEnrollments, deleteEnrollment, getEnrollmentStats } from '../services/faceService';

export default function Admin() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log('[Admin] Chargement des enrollments...');
        const stats = await getEnrollmentStats();
        console.log('[Admin] Stats chargées:', stats);
        setList(stats.enrollments || []);
      } catch (err) {
        console.error('[Admin] Erreur chargement:', err);
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function deleteOne(label) {
    if (window.confirm(`❌ Supprimer l'enrôlement de "${label}" ?\nCette action est irréversible.`)) {
      setIsDeleting(label);
      try {
        await deleteEnrollment(label);
        setList(list.filter(e => e.label !== label));
      } finally {
        setIsDeleting(null);
      }
    }
  }

  async function purgeAll() {
    if (window.confirm('⚠️ ATTENTION: Supprimer TOUS les enrôlements?\nCette action est irréversible!')) {
      setIsDeleting('all');
      try {
        await clearEnrollments();
        setList([]);
      } finally {
        setIsDeleting(null);
      }
    }
  }

  return (
    <div className="w-full">
      {/* Titre */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent mb-2">
          ⚙️ Administration
        </h2>
        <p className="text-gray-600 font-medium">Gérer les enrôlements du système</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-lg p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <p className="text-gray-700 text-sm font-bold mb-1">👥 Personnes</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {list.length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-violet-100 to-purple-100 border-2 border-violet-300 rounded-lg p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <p className="text-gray-700 text-sm font-bold mb-1">📸 Photos</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            {list.reduce((sum, e) => sum + (e.descriptors?.length || 0), 0)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-100 to-emerald-100 border-2 border-teal-300 rounded-lg p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <p className="text-gray-700 text-sm font-bold mb-1">📅 Statut</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            {list.length > 0 ? '✅' : '⏳'}
          </p>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center">
            <p className="text-gray-600 font-semibold">⏳ Chargement...</p>
          </div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-gray-700 font-bold mb-1">Aucun enrôlement</p>
            <p className="text-gray-600 text-sm">Allez à l'onglet "Enrôler" pour ajouter des personnes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gradient-to-r from-blue-100 via-violet-100 to-indigo-100">
                  <th className="px-6 py-4 text-left font-bold text-gray-700">👤 Nom</th>
                  <th className="px-6 py-4 text-center font-bold text-gray-700">📸 Photos</th>
                  <th className="px-6 py-4 text-right font-bold text-gray-700">⚙️ Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((enrollment, idx) => {
                  const label = String(enrollment?.label || 'Inconnu');
                  const firstChar = label.charAt(0).toUpperCase() || '?';
                  return (
                    <tr
                      key={label}
                      className={`border-b border-gray-200 transition-all duration-200 ${
                        idx % 2 === 0 ? 'bg-white/50' : 'bg-blue-50/40'
                      } hover:bg-blue-100/50`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-violet-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-sm">
                              {firstChar}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500">ID unique</p>
                          </div>
                        </div>
                      </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-gradient-to-r from-blue-100 to-violet-100 text-blue-700 px-3 py-1 rounded-full font-bold text-sm border border-blue-300">
                        {enrollment.descriptors?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteOne(label)}
                        disabled={isDeleting !== null}
                        className="px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border border-red-300 shadow-md hover:shadow-lg"
                      >
                        {isDeleting === label ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bouton Purge */}
      {list.length > 0 && (
        <div className="mt-8 flex gap-4">
          <button
            onClick={purgeAll}
            disabled={isDeleting !== null}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-red-500 via-pink-600 to-rose-700 hover:from-red-600 hover:via-pink-700 hover:to-rose-800 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 active:scale-95 shadow-lg"
          >
            {isDeleting === 'all' ? '⏳ Suppression...' : '🗑️ Supprimer TOUS'}
          </button>
        </div>
      )}
    </div>
  );
}

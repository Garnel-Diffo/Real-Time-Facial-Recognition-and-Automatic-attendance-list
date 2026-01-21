import { useEffect, useRef, useState } from 'react';
import { computeDescriptorFromCanvas, loadFaceApiModels, saveEnrollment } from '../services/faceService';

async function waitForVideoToBeReady(video, timeout = 2000) {
  if (!video) return;
  if (video.readyState >= 3) return;
  return new Promise((resolve) => {
    const onCanPlay = () => {
      video.removeEventListener('canplay', onCanPlay);
      resolve();
    };
    video.addEventListener('canplay', onCanPlay);
    setTimeout(() => {
      video.removeEventListener('canplay', onCanPlay);
      resolve();
    }, timeout);
  });
}

export default function Enrollment() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState('🔄 Initialisation...');
  const [label, setLabel] = useState('');
  const [captures, setCaptures] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontale, 'environment' = arrière

  const initCamera = async (facing = 'user') => {
    try {
      // Arrêter le flux existant
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      setStatus(`🎥 Activation caméra ${facing === 'user' ? 'frontale' : 'arrière'}...`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: facing }
      });

      streamRef.current = stream;
      setFacingMode(facing);

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await waitForVideoToBeReady(v, 2000);
        try {
          await v.play();
        } catch (err) {
          console.warn('Play failed:', err?.message);
        }
      }

      setStatus('✅ Prêt • Saisis le nom et capture 5-10 photos');
    } catch (err) {
      console.error('Camera init error:', err);
      setStatus('❌ Erreur caméra: ' + (err?.message || 'inconnue'));
    }
  };

  const toggleCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    await initCamera(newFacing);
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setStatus('📦 Chargement modèles...');
        await loadFaceApiModels('/models');
        if (!mounted) return;
        setModelsLoaded(true);
        await initCamera('user');
      } catch (err) {
        if (mounted) {
          setStatus('❌ Erreur: ' + (err?.message || 'inconnue'));
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function captureOne() {
    try {
      if (!modelsLoaded) {
        setStatus('⏳ Modèles pas encore chargés...');
        return;
      }
      if (!label.trim()) {
        setStatus('⚠️ Entre le nom ou ID de la personne');
        return;
      }

      setIsProcessing(true);
      const vid = videoRef.current;
      if (!vid || vid.readyState < 2) {
        setStatus('⏳ Caméra pas prête...');
        await new Promise(r => setTimeout(r, 500));
        setIsProcessing(false);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus('❌ Canvas error');
        setIsProcessing(false);
        return;
      }

      // Dessiner la vidéo sur le canvas AVANT de détecter
      const ctx = canvas.getContext('2d');
      canvas.width = vid.videoWidth;
      canvas.height = vid.videoHeight;
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);

      const desc = await computeDescriptorFromCanvas(canvas);
      if (!desc) {
        setStatus('❌ Pas de visage détecté');
        setIsProcessing(false);
        return;
      }

      const newCaptures = [...captures, desc];
      setCaptures(newCaptures);
      setStatus(`✅ Photo ${newCaptures.length} capturée • ${Math.max(5 - newCaptures.length, 0)} minimum requis`);
      setIsProcessing(false);
    } catch (err) {
      setStatus('❌ ' + (err?.message || 'Erreur capture'));
      setIsProcessing(false);
    }
  }

  async function save() {
    try {
      if (!label.trim()) {
        setStatus('⚠️ Entre le nom');
        return;
      }
      if (captures.length < 5) {
        setStatus(`⚠️ Minimum 5 photos (tu en as ${captures.length})`);
        return;
      }

      setIsProcessing(true);
      setStatus('💾 Sauvegarde...');
      console.log(`[Enrollment] Sauvegarde de ${label} avec ${captures.length} descriptors`);

      await saveEnrollment(label.trim(), captures);

      setStatus('✅ Enrôlement réussi! Réinitialisation...');
      console.log(`[Enrollment] ✓ ${label} enrôlé avec succès`);
      setLabel('');
      setCaptures([]);

      setTimeout(() => {
        setStatus('✅ Prêt • Saisis le nom et capture 5-10 photos');
        setIsProcessing(false);
      }, 2000);
    } catch (err) {
      console.error('[Enrollment Save]', err);
      setStatus('❌ ' + (err?.message || 'Erreur save'));
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full">
      {/* Titre */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent mb-2">
          ➕ Enrôler Personne
        </h2>
        <p className="text-gray-600 font-medium">Ajouter une nouvelle personne au système</p>
      </div>

      {/* Layout responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
        {/* GAUCHE: Vidéo + Conseil (conseil maintenant au-dessus) */}
        <div className="space-y-4">
          {/* Info utile (placée au-dessus de la vidéo) */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4 shadow-md">
            <p className="text-sm text-amber-900 font-bold">
              💡 <strong>Conseil:</strong> Capture 8-10 photos de différents angles
            </p>
          </div>

          {/* Card Vidéo */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 relative group">
            {/* Bouton basculer caméra - SUPERPOSÉ EN HAUT À DROITE */}
            <button
              onClick={toggleCamera}
              disabled={isProcessing}
              title={`Passer à caméra ${facingMode === 'user' ? 'arrière' : 'frontale'}`}
              className="absolute top-3 right-3 z-20 bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl" role="img" aria-label="Basculer caméra">
                {facingMode === 'user' ? '🔄' : '🔄'}
              </span>
            </button>

            <video
              ref={videoRef}
              className="w-full aspect-video bg-black"
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Info sous vidéo */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-violet-50">
              <p className="text-sm text-gray-700 font-bold">
                🎬 Caméra {facingMode === 'user' ? 'frontale' : 'arrière'} active • Assure une bonne luminosité
              </p>
            </div>
          </div>
        </div>

        {/* DROITE: Inputs & Contrôles */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-gradient-to-r from-blue-100 via-violet-100 to-indigo-100 border-2 border-blue-300 rounded-2xl p-6 shadow-lg">
            <p className="text-lg font-semibold text-gray-800">
              {status}
            </p>
          </div>

          {/* Inputs */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 space-y-4 shadow-lg">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                👤 Nom / ID
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Jean Dupont"
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium disabled:opacity-50 transition-all duration-300 hover:border-blue-300"
              />
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">
                  📸 Photos
                </label>
                <span className={`text-sm font-bold ${captures.length >= 5 ? 'text-green-600' : 'text-orange-600'}`}>
                  {captures.length} / 5-10
                </span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 h-full transition-all duration-300"
                  style={{ width: `${Math.min((captures.length / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={captureOne}
              disabled={isProcessing || !modelsLoaded}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 hover:from-blue-700 hover:via-violet-700 hover:to-indigo-800 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isProcessing ? '⏳ Capture...' : '📸 Capturer Photo'}
            </button>

            <button
              onClick={save}
              disabled={isProcessing || captures.length < 5}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-700 hover:from-green-600 hover:via-emerald-700 hover:to-teal-800 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isProcessing ? '💾 Sauvegarde...' : '✅ Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

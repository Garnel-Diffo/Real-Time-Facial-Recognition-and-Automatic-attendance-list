// src/components/Enrollment.jsx
/*
  Composant `Enrollment` : interface pour enrôler une personne.
  - Active la caméra, capture plusieurs photos, calcule les descripteurs de visage
    et les sauvegarde en local via `saveEnrollment`.
  - Fournit des messages d'état clairs pour guider l'utilisateur.
*/
import { useEffect, useRef, useState } from 'react';
import { computeDescriptorFromCanvas, loadFaceApiModels, saveEnrollment } from '../services/faceService';
import Button from './ui/Button';

// Fonction auxiliaire : attendre que la vidéo soit prête avant de la lancer
// Placée au niveau du module pour éviter l'imbrication profonde dans les hooks
async function waitForVideoToBeReady(video, timeout = 2000) {
  if (!video) return;
  if (video.readyState >= 3) return; // Données vidéo suffisantes (HAVE_FUTURE_DATA / HAVE_ENOUGH_DATA)
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
  // Références vers les éléments DOM
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // États du composant
  const [status, setStatus] = useState('Initialisation...');
  const [label, setLabel] = useState(''); // Nom ou ID de la personne à enrôler
  const [captures, setCaptures] = useState([]); // Tableau des descripteurs capturés
  const [modelsLoaded, setModelsLoaded] = useState(false); // Indicateur : modèles chargés ?

  useEffect(() => {
    let mounted = true;
    let localStream = null;

    

    async function init() {
      try {
        // Étape 1 : Charger les modèles de reconnaissance faciale
        setStatus('Chargement des modèles (cela peut prendre quelques secondes)...');
        await loadFaceApiModels('/models');
        if (!mounted) return;
        setModelsLoaded(true);
        setStatus('Modèles chargés. Activation caméra...');
      } catch (e) {
        setStatus('Erreur chargement modèles: ' + e.message);
        return;
      }

      try {
        // Étape 2 : Accéder à la caméra de l'appareil
        localStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
        const v = videoRef.current;
        if (v) {
          v.srcObject = localStream;
          // Attendre que la caméra soit prête avant de la lancer
          await waitForVideoToBeReady(v, 2000);
          try {
            await v.play();
          } catch (err) {
            // La lecture vidéo peut échouer dans certains navigateurs sans action utilisateur
            console.warn('video.play() failed:', err?.message || err);
          }
        }
        if (!mounted) return;
        setStatus('Caméra prête. Saisis le nom et prends des photos.');
      } catch (err) {
        setStatus('Caméra indisponible: ' + (err?.message || 'inconnue'));
      }
    }

    init();

    return () => {
      mounted = false;
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    };
  }, []);

  async function captureOne() {
    try {
      if (!modelsLoaded) { setStatus('Modèles non chargés. Patiente...'); return; }
      if (!label.trim()) { setStatus('Saisis le nom / id avant de prendre la photo'); return; }
      const vid = videoRef.current;
      if (!vid) { setStatus('Vidéo non prête'); return; }
      // Vérifier que la vidéo a des données avant de capturer
      if (vid.readyState < 2) { // HAVE_CURRENT_DATA
        setStatus('Caméra pas encore prête, attends un instant...');
        await new Promise(r => setTimeout(r, 500));
      }

      const c = canvasRef.current;
      c.width = vid.videoWidth || 640;
      c.height = vid.videoHeight || 480;
      const ctx = c.getContext('2d');
      // Copier le frame vidéo actuel sur le canvas
      ctx.drawImage(vid, 0, 0, c.width, c.height);

      setStatus('Analyse image...');
      // Détection avec timeout gérée dans le service
      const descriptor = await computeDescriptorFromCanvas(c, 4500);
      if (!descriptor) {
        setStatus('Aucun visage détecté / délai dépassé. Repositionne la personne et réessaie.');
        return;
      }

      setCaptures(prev => {
        const next = [...prev, Array.from(descriptor)];
        setStatus(`Photo capturée (${next.length})`);
        return next;
      });
    } catch (err) {
      console.error('captureOne error', err);
      setStatus('Erreur lors de l’analyse : ' + (err?.message || 'inconnue'));
    }
  }

  async function finalize() {
    try {
      if (captures.length < 3) { setStatus('Prends au moins 3 photos pour fiabilité'); return; }
      await saveEnrollment(label.trim(), captures);
      setStatus('Enrôlement enregistré.');
      setLabel('');
      setCaptures([]);
    } catch (err) {
      setStatus('Erreur sauvegarde enrôlement: ' + (err?.message || 'inconnue'));
    }
  }

  return (
    <div className="card max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Enrôlement étudiant</h2>
      <p className="text-sm text-gray-600 mb-2">{status}</p>

      <div className="flex gap-6">
        <div>
          <video ref={videoRef} className="rounded-lg shadow-md" autoPlay muted playsInline style={{ width: 480, height: 360 }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="flex-1">
          <label htmlFor="enroll-label" className="block mb-2">Nom complet / ID</label>
          <input id="enroll-label" value={label} onChange={e => setLabel(e.target.value)} className="w-full p-2 border rounded mb-3" placeholder="Ex: KENNE DIFFO" />

          <div className="space-y-2">
            <Button onClick={captureOne} className="bg-primary text-white">Prendre une photo</Button>
            <Button onClick={finalize} className="bg-accent text-white">Enregistrer enrôlement</Button>
            <button onClick={() => setCaptures([])} className="btn bg-gray-200 text-black px-3 py-2 rounded">Reset photos</button>
            <div>Photos capturées : {captures.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

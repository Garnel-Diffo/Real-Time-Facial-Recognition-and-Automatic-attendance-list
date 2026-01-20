// src/components/Session.jsx
import { Camera } from '@mediapipe/camera_utils';
import { FaceDetection } from '@mediapipe/face_detection';
import { useEffect, useRef, useState } from 'react';
import { buildMatcherFromEnrollments, computeDescriptorFromCanvas, loadEnrollments, loadFaceApiModels } from '../services/faceService';
import Button from './ui/Button';

/*
  Composant `Session` : gère la détection en temps réel pendant une session.
  - Initialise les modèles et MediaPipe.
  - Capture les visages depuis la vidéo, calcule des descripteurs,
    et compare avec les enrôlements connus via `FaceMatcher`.
  - Affiche un overlay avec les boîtes et libellés, et maintien la liste des présents.
*/

export default function Session() {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const offscreenRef = useRef(null);
  const [message, setMessage] = useState('Initialisation...');
  const [presentSet, setPresentSet] = useState(new Set());
  const matcherRef = useRef(null);
  const cameraControllerRef = useRef(null);
  const detectorRef = useRef(null);

  useEffect(() => {
    let running = true;
    let isProcessing = false; // Gate pour éviter les appels parallèles à detector.send()
    
    // Effet d'initialisation : charge modèles, enrôlements, configure MediaPipe
    (async () => {
      try {
        // Étape 1 : Charger les modèles avec le bon chemin (/models)
        console.log('Étape 1: Chargement des modèles...');
        await loadFaceApiModels('/models');
        console.log('✓ Modèles chargés avec succès');
        
        // Étape 2 : Charger les enrôlements depuis IndexedDB
        console.log('Étape 2: Chargement des enrôlements...');
        const enrolls = await loadEnrollments();
        console.log(`✓ Enrôlements chargés: ${enrolls.length} personne(s)`);
        
        // Étape 3 : Construire le matcher (même si aucun enrôlement, pour éviter null)
        console.log('Étape 3: Construction du matcher...');
        matcherRef.current = buildMatcherFromEnrollments(enrolls, 0.55);
        
        if (enrolls.length === 0) {
          console.warn('⚠ Aucun enrôlement trouvé - les visages seront tous marqués comme "Inconnu"');
          setMessage('Aucun enrôlement. Les visages détectés seront marqués comme "Inconnu".');
        } else {
          console.log(`✓ Matcher prêt avec ${enrolls.length} enrôlement(s)`);
        }
        
        setMessage('Modèles chargés. Initialisation MediaPipe...');
      } catch (e) {
        console.error('Erreur lors de l\'initialisation:', e);
        setMessage('Erreur: ' + (e?.message || 'Erreur inconnue'));
        return;
      }

      // Configuration et utilisation de MediaPipe FaceDetection
      // Nous utilisons la version CDN pour récupérer les fichiers nécessaires.
      // Le detector appelle `onResults` pour chaque frame traitée.
      try {
        console.log('Étape 4: Initialisation de MediaPipe FaceDetection...');
        const detector = new FaceDetection({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        });
        detector.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
          maxNumFaces: 8
        });
        console.log('✓ MediaPipe FaceDetection créé');

        // Callback appelé quand MediaPipe fournit des résultats de détection
        detector.onResults(async results => {
          if (!running) return;
          const canvas = overlayRef.current;
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          const video = videoRef.current;
          if (!video || !ctx) return;
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const newPresent = new Set(presentSet);

          // Logs de débogage pour vérifier que le callback est appelé
          console.log(`[onResults] Détections reçues: ${results?.detections?.length || 0}`);

          if (results.detections && results.detections.length) {
            for (const d of results.detections) {
              // Récupérer la boîte englobante de MediaPipe (coordonnées relatives 0..1)
              const bb = d.boundingBox;
              
              // Ajouter du padding (20%) pour avoir du contexte autour du visage
              const padding = 0.20;
              const paddedWidth = bb.width * (1 + padding);
              const paddedHeight = bb.height * (1 + padding);
              
              const x = Math.round((bb.xCenter - paddedWidth / 2) * canvas.width);
              const y = Math.round((bb.yCenter - paddedHeight / 2) * canvas.height);
              const w = Math.round(paddedWidth * canvas.width);
              const h = Math.round(paddedHeight * canvas.height);
              const px = Math.max(0, x);
              const py = Math.max(0, y);
              const pw = Math.min(canvas.width - px, Math.max(60, w));
              const ph = Math.min(canvas.height - py, Math.max(60, h));

              // Tracer le cadre du visage détecté
              ctx.strokeStyle = '#21a366';
              ctx.lineWidth = 2;
              ctx.strokeRect(px, py, pw, ph);

              // Découper la région du visage avec padding dans un canvas hors écran
              const off = offscreenRef.current;
              if (!off) continue;
              
              off.width = pw;
              off.height = ph;
              const offCtx = off.getContext('2d');
              if (!offCtx) continue;
              
              offCtx.drawImage(video, px, py, pw, ph, 0, 0, pw, ph);

              // Calcul du descripteur: UNIQUEMENT sur la région cropped
              // Sans appel à detectAllFaces() pour éviter conflit WASM avec MediaPipe
              let labelText = 'Inconnu';
              let faceId = `Inconnu_${Math.round(px / 50)}_${Math.round(py / 50)}`;
              
              try {
                const desc = await computeDescriptorFromCanvas(off);
                console.log(`[Descripteur] ${desc ? 'Calculé' : 'Échec du calcul'}`);
                
                if (desc && matcherRef.current) {
                  const best = matcherRef.current.findBestMatch(desc);
                  console.log(`[Match] label=${best.label}, distance=${best.distance.toFixed(4)}`);
                  
                  if (best.label !== 'unknown') {
                    labelText = `${best.label} (${best.distance.toFixed(2)})`;
                    faceId = best.label;
                    console.log(`✓ Reconnu: ${best.label}`);
                  } else {
                    console.log(`? Visage inconnu`);
                  }
                } else {
                  console.log(`⚠ Matcher indisponible`);
                }
              } catch (err) {
                console.error(`[Erreur descripteur] ${err.message}`);
              }
              
              // Ajouter le visage à la liste des présents (reconnu ou inconnu)
              newPresent.add(faceId);

              // Dessiner le fond du libellé avec meilleure visibilité
              ctx.font = 'bold 18px Arial';
              ctx.fillStyle = 'rgba(0,0,0,0.8)';
              const textMetrics = ctx.measureText(labelText);
              ctx.fillRect(px, py - 28, textMetrics.width + 12, 25);
              
              // Afficher le libellé en blanc et gras
              ctx.fillStyle = '#fff';
              ctx.fillText(labelText, px + 6, py - 8);
            }
          }

          setPresentSet(newPresent);
          setMessage(`Présents: ${newPresent.size}`);
        });

        // Stocker le detector et démarrer la caméra
        detectorRef.current = detector;

        // Initialiser et démarrer la caméra avec l'utilitaire Camera de MediaPipe
        console.log('Étape 5: Initialisation de la caméra...');
        const videoElement = videoRef.current;
        if (!videoElement) {
          throw new Error('Élément vidéo non disponible');
        }

        cameraControllerRef.current = new Camera(videoElement, {
          onFrame: async () => {
            // Gate: ignorer si déjà en cours de traitement
            if (isProcessing) return;
            
            isProcessing = true;
            try {
              await detector.send({ image: videoElement });
            } catch (err) {
              console.error('[Camera.onFrame] Erreur detector.send():', err?.message || err);
            } finally {
              isProcessing = false;
            }
          },
          width: 960,
          height: 540
        });
        
        console.log('[Camera] Avant start()');
        try {
          await cameraControllerRef.current.start();
          console.log('✓ Caméra démarrée avec succès');
          setMessage('Session prête. Présentez-vous à la caméra...');
        } catch (cameraErr) {
          console.error('[Camera.start] Erreur:', cameraErr);
          
          // Gestion spécifique des erreurs de permission
          if (cameraErr?.message?.includes('Permission') || 
              cameraErr?.message?.includes('NotAllowed') ||
              cameraErr?.name === 'NotAllowedError') {
            console.error('❌ Permission d\'accès à la caméra refusée');
            setMessage('❌ Accès caméra refusé. Vérifiez les permissions du navigateur.');
          } else if (cameraErr?.message?.includes('NotFound') ||
                     cameraErr?.name === 'NotFoundError') {
            console.error('❌ Aucune caméra détectée');
            setMessage('❌ Aucune caméra détectée sur cet appareil.');
          } else {
            console.error('Erreur caméra:', cameraErr?.message);
            setMessage('Erreur caméra: ' + (cameraErr?.message || 'Erreur inconnue'));
          }
          throw cameraErr;
        }
      } catch (err) {
        console.error('Erreur lors de l\'initialisation de MediaPipe:', err);
        setMessage('Erreur MediaPipe: ' + (err?.message || 'Erreur inconnue'));
      }
    })();

    return () => {
      running = false;
      // arrêt du contrôleur caméra (silencieux en cas d'erreur)
      try { 
        cameraControllerRef.current?.stop(); 
      // eslint-disable-next-line no-unused-vars
      } catch (_) { 
        /* no-op */ 
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCSV() {
    const arr = Array.from(presentSet);
    const csv = 'Nom\n' + arr.join('\n') + `\n\nTotal,${arr.length}\nTimestamp,${new Date().toISOString()}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `presence_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-3">Session — Scan en temps réel</h2>
      <p className="text-sm text-gray-600 mb-2">{message}</p>

      <div className="video-wrapper">
        <video ref={videoRef} className="rounded-lg shadow-md" autoPlay muted playsInline style={{ width: 960, height: 540 }} />
        <canvas ref={overlayRef} className="overlay-canvas" style={{ width: 960, height: 540 }} />
      </div>

      <canvas ref={offscreenRef} style={{ display: 'none' }} />

      <div className="mt-4 flex gap-3 items-center">
        <Button onClick={exportCSV} className="bg-primary text-white">Exporter CSV</Button>
        <div>Nombre total présent : {presentSet.size}</div>
      </div>
    </div>
  );
}

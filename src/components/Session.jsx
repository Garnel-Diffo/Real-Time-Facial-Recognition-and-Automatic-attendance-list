import * as faceapi from '@vladmandic/face-api';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { buildMatcherFromEnrollments, loadEnrollments, loadFaceApiModels } from '../services/faceService';

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;
const DETECTION_INTERVAL = 1; // set to 1 for near-instant feedback
const RECOGNITION_THRESHOLD = 0.6;
const UNKNOWN_FACE_DISTANCE_THRESHOLD = 80; // pixels: min distance to consider different unknown face

function drawDetectionBox(ctx, box, label, isKnown) {
  const color = isKnown ? '#00FF00' : '#FF0000';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Improved label styling for better visibility
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.font = 'bold 18px Arial';
  const metrics = ctx.measureText(label || '');
  const paddingH = 10;
  const paddingV = 8;
  const labelX = box.x;
  const labelY = Math.max(box.y - (paddingV * 2 + 18), 0);
  const labelWidth = metrics.width + paddingH * 2;
  const labelHeight = 18 + paddingV * 2;

  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(label, labelX + paddingH, labelY + (labelHeight + 6) / 2 - 6);
}

// Helper: calculate Euclidean distance between two points
function distanceBetweenPoints(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function Session() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const processingFrameRef = useRef(null);
  const matcherRef = useRef(null);
  const streamRef = useRef(null);
  const stateRef = useRef({
    frameCounter: 0,
    fpsCounter: 0,
    lastFpsTime: Date.now(),
    processing: false,
    modelsLoaded: false
  });
  // Track unknown face positions to avoid counting same unknown person multiple times
  const unknownFacesRef = useRef([]); // Array of {x, y, count}

  const [message, setMessage] = useState('⏳ Initialisation...');
  const [presentSet, setPresentSet] = useState(new Set()); // Known recognized people
  const [unknownCount, setUnknownCount] = useState(0); // Unique unknown faces
  const [detectedNames, setDetectedNames] = useState([]);
  const [fps, setFps] = useState(0);
  const presentSetRef = useRef(new Set());
  const fpsRef = useRef(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = frontale, 'environment' = arrière

  const toggleCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      if (processingFrameRef.current) {
        cancelAnimationFrame(processingFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      setMessage(`🎥 Basculement vers caméra ${newFacing === 'user' ? 'frontale' : 'arrière'}...`);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: newFacing }
      });

      streamRef.current = stream;
      setFacingMode(newFacing);

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 2000);
          const handler = () => {
            clearTimeout(timeout);
            v.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          v.addEventListener('loadedmetadata', handler);
        });
        try {
          await v.play();
        } catch (e) {
          console.warn('[Session] Play:', e?.message);
        }
      }

      setMessage('✅ SESSION PRÊTE - Présentez-vous');
      processingFrameRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('[Session Camera Toggle]', err);
      setMessage(`❌ Erreur basculement caméra: ${err?.message || 'inconnue'}`);
    }
  };

  const updateDetectedNames = useCallback((name) => {
    if (!name || name === 'Inconnu') return;
    const cleanName = name.split('(')[0].trim();
    setDetectedNames(prev => prev.includes(cleanName) ? prev : [...prev, cleanName]);
  }, []);

  const updatePresentSet = (newSet) => {
    presentSetRef.current = newSet;
    setPresentSet(newSet);
  };

  const updateFps = (v) => {
    fpsRef.current = v;
    setFps(v);
  };

  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const state = stateRef.current;

    if (!video || !canvas || !state.modelsLoaded || video.readyState < 2) {
      processingFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      processingFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    // FPS counter
    state.frameCounter++;
    state.fpsCounter++;
    const now = Date.now();
    if (now - state.lastFpsTime >= 1000) {
      updateFps(state.fpsCounter);
      state.fpsCounter = 0;
      state.lastFpsTime = now;
    }

    // Throttle detection
    if (state.frameCounter % DETECTION_INTERVAL !== 0) {
      processingFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    if (state.processing) {
      processingFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    state.processing = true;

    try {
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections || detections.length === 0) {
        setMessage(`⏳ Recherche... | ${fps} fps`);
      } else {
        const newPresent = new Set(presentSet);
        let knownCount = 0;
        const currentUnknownPositions = []; // Track unknown faces this frame

        for (const detection of detections) {
          if (!detection.descriptor) continue;

          let match = { label: 'Inconnu', distance: Infinity };
          if (matcherRef.current) {
            match = matcherRef.current.findBestMatch(detection.descriptor);
          }

          const box = detection.detection.box;
          const faceCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
          const isKnown = match.label !== 'Inconnu';
          // Show only the name in the overlay for instant clarity
          const labelText = isKnown ? `${match.label}` : 'Inconnu';

          drawDetectionBox(ctx, box, labelText, isKnown);

          if (isKnown) {
            newPresent.add(match.label);
            updateDetectedNames(match.label);
            knownCount++;
          } else {
            // Check if this unknown face matches any previously detected unknown face
            let foundMatch = false;
            for (const prevUnknown of unknownFacesRef.current) {
              const dist = distanceBetweenPoints(faceCenter, { x: prevUnknown.x, y: prevUnknown.y });
              if (dist < UNKNOWN_FACE_DISTANCE_THRESHOLD) {
                // Same unknown person detected again
                prevUnknown.lastSeen = Date.now();
                foundMatch = true;
                break;
              }
            }

            if (!foundMatch) {
              // New unique unknown face
              currentUnknownPositions.push({
                x: faceCenter.x,
                y: faceCenter.y,
                id: Date.now() + Math.random(),
                firstSeen: Date.now(),
                lastSeen: Date.now()
              });
            }
          }
        }

        updatePresentSet(newPresent);

        // Clean old unknown faces (not seen in last 5 seconds) and add new ones
        const now = Date.now();
        unknownFacesRef.current = unknownFacesRef.current.filter(f => now - f.lastSeen < 5000);
        unknownFacesRef.current.push(...currentUnknownPositions);

        // Update unknown count with unique faces
        setUnknownCount(unknownFacesRef.current.length);

        let msg = `🎬 ${detections.length} détecté(s)`;
        if (knownCount > 0) msg += ` | ✅ ${knownCount} reconnu(s)`;
        if (unknownFacesRef.current.length > 0) msg += ` | ❓ ${unknownFacesRef.current.length} inconnu(s)`;
        msg += ` | ${fpsRef.current} fps`;
        setMessage(msg);
      }
    } catch (err) {
      console.error('[processFrame]', err);
      setMessage(`⚠️ Erreur: ${err?.message || 'unknown'}`);
    } finally {
      state.processing = false;
      processingFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        setMessage('📦 Chargement modèles...');
        await loadFaceApiModels('/models');
        if (!mounted) return;
        stateRef.current.modelsLoaded = true;

        setMessage('⏳ Chargement enrôlements...');
        const enrolls = await loadEnrollments();

        const matcher = buildMatcherFromEnrollments(enrolls, RECOGNITION_THRESHOLD);
        matcherRef.current = matcher;

        if (enrolls.length === 0) {
          setMessage('⚠️ Aucun enrôlement - allez à l\'onglet "Enrôler"');
          processingFrameRef.current = requestAnimationFrame(processFrame);
          return;
        }

        setMessage('🎥 Accès caméra...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT }, facingMode: 'user' },
          audio: false
        });

        if (!mounted) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        setFacingMode('user');

        const video = videoRef.current;
        if (!video) {
          stream?.getTracks().forEach(t => t.stop());
          return;
        }

        video.srcObject = stream;
        video.play().catch(e => console.warn('[Session] Play:', e?.message));

        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 10000);
          const handler = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', handler);
            resolve();
          };
          video.addEventListener('loadedmetadata', handler);
        });

        if (!mounted) return;

        setMessage('✅ SESSION PRÊTE - Présentez-vous');
        processingFrameRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        if (!mounted) return;
        console.error('[Session]', err);
        setMessage(`❌ ${err?.message || 'Erreur'}`);
      }
    };

    initSession();

    return () => {
      mounted = false;
      if (processingFrameRef.current) cancelAnimationFrame(processingFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => {
          try { t.stop(); } catch (e) {
            // Silencer
          }
        });
      }
    };
  }, [processFrame]);

  const exportXLSX = () => {
    const allPeople = Array.from(presentSet);
    const unknownsTotal = unknownFacesRef.current.length; // Use current unknown count
    const totalPresence = allPeople.length + unknownsTotal; // Total = known + unknown

    if (totalPresence === 0) {
      alert('Aucune personne détectée');
      return;
    }

    const data = allPeople.map((name, i) => ({
      'Index': i + 1,
      'Nom': name,
      'Statut': 'Présent - Reconnu'
    }));

    if (unknownsTotal > 0) {
      data.push({
        'Index': allPeople.length + 1,
        'Nom': 'Visiteurs Inconnus',
        'Statut': `${unknownsTotal} détecté(s)`
      });
    }

    data.push({ 'Index': '', 'Nom': '', 'Statut': '' });
    data.push({ 'Index': 'TOTAL PRÉSENCE', 'Nom': totalPresence, 'Statut': '' });
    data.push({ 'Index': 'Reconnus', 'Nom': allPeople.length, 'Statut': '' });
    data.push({ 'Index': 'Inconnus', 'Nom': unknownsTotal, 'Statut': '' });
    data.push({ 'Index': 'Date', 'Nom': new Date().toLocaleString('fr-FR'), 'Statut': '' });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 8 }, { wch: 30 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Présence');
    XLSX.writeFile(wb, `Liste_de_presence_${Date.now()}.xlsx`);
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent mb-2">
          📹 Reconnaissance Faciale
        </h2>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-6">
        <div className="space-y-4">
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden shadow-xl relative group">
            {/* Bouton basculer caméra - SUPERPOSÉ EN HAUT À DROITE */}
            <button
              onClick={toggleCamera}
              title={`Passer à caméra ${facingMode === 'user' ? 'arrière' : 'frontale'}`}
              className="absolute top-3 right-3 z-20 bg-gradient-to-br from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            >
              <span className="text-xl" role="img" aria-label="Basculer caméra">
                {facingMode === 'user' ? '🔄' : '🔄'}
              </span>
            </button>

            <canvas ref={canvasRef} className="w-full aspect-video bg-black rounded-2xl" />
          </div>

          <video ref={videoRef} autoPlay muted playsInline className="hidden" />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-lg p-4 text-center shadow-md">
              <p className="text-sm font-bold text-gray-700">🎬 FPS</p>
              <p className="text-2xl font-bold text-blue-700">{fps}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300 rounded-lg p-4 text-center shadow-md">
              <p className="text-sm font-bold text-gray-700">👥 TOTAL</p>
              <p className="text-2xl font-bold text-purple-700">{presentSet.size + unknownCount}</p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg p-4 text-center shadow-md">
              <p className="text-sm font-bold text-gray-700">✅ Reconnus</p>
              <p className="text-2xl font-bold text-green-700">{presentSet.size}</p>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-pink-100 border-2 border-red-300 rounded-lg p-4 text-center shadow-md">
              <p className="text-sm font-bold text-gray-700">❓ Inconnus</p>
              <p className="text-2xl font-bold text-red-700">{unknownCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={exportXLSX}
            className="w-full py-4 px-6 bg-gradient-to-r from-green-500 via-emerald-600 to-teal-700 hover:from-green-600 hover:via-emerald-700 hover:to-teal-800 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            📥 Exporter XLSX
          </button>

          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-xl mb-4 text-gray-800">✅ Présents</h3>
            {detectedNames.length === 0 ? (
              <p className="text-gray-500 italic text-center py-6">⏳ En attente de détection...</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {detectedNames.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    {i + 1}. {name} ✓
                  </li>
                ))}
              </ul>
            )}
          </div>

          {unknownCount > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-red-300/50 rounded-2xl p-6 shadow-xl bg-red-50/50">
              <h3 className="font-bold text-xl mb-2 text-red-700">❓ Visiteurs Inconnus</h3>
              <p className="text-2xl font-bold text-red-600">{unknownCount} personne(s)</p>
              <p className="text-sm text-gray-600 mt-2">Non reconnus par le système</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                  setDetectedNames([]);
                  // keep ref in sync
                  presentSetRef.current = new Set();
                  setPresentSet(new Set());
                setUnknownCount(0);
              }}
              className="py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-lg shadow-md transition-all"
            >
              🔄 Réinitialiser
            </button>
            <button
              onClick={() => globalThis.location.reload()}
              className="py-3 px-4 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 text-white font-bold rounded-lg shadow-md transition-all"
            >
              ↻ Nouveau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

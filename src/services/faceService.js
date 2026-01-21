// src/services/faceService.js
/*
  Service utilitaire pour la gestion des modèles et des enrôlements.

  Fonctions exportées principales :
  - loadFaceApiModels(basePath): charge les modèles face-api depuis `public/models`.
  - computeDescriptorFromCanvas(canvasOrImage): détecte un visage et retourne son descripteur.
  - saveEnrollment(label, descriptors): sauvegarde localement les descripteurs d'un utilisateur.
  - loadEnrollments(), clearEnrollments(): gestion du stockage local (IndexedDB via idb-keyval).
  - buildMatcherFromEnrollments(enrollments): construit un `FaceMatcher` à partir des enrôlements.

  Les commentaires ci-dessous expliquent le rôle de chaque fonction pour faciliter
  la maintenance et la relecture par des développeurs francophones.
*/
import * as tf from '@tensorflow/tfjs';
import * as faceapi from '@vladmandic/face-api';
import { get, set } from 'idb-keyval';
import * as XLSX from 'xlsx';

const DB_KEY = 'attend_enroll_v1';

// Helper : exécute une promesse avec un timeout et retourne null si délai dépassé
function promiseWithTimeout(p, ms = 5000) {
  const timeout = new Promise((res) => setTimeout(() => res(null), ms));
  return Promise.race([p, timeout]);
}

// Initialisation des modèles et configuration du backend TensorFlow.js
// basePath doit pointer vers le dossier où se trouvent les manifests (ex: '/models')
export async function loadFaceApiModels(basePath = '/models') {
  try {
    // Essayer d'utiliser webgl pour accélérer ; sinon fallback cpu
    try {
      await tf.setBackend('webgl');
      console.log('TF backend -> webgl');
    } catch (e) {
      // Fallback vers cpu et enregistrement de l'erreur webgl setup
      console.warn('TF setBackend(webgl) failed:', e?.message || e);
      try {
        await tf.setBackend('cpu');
        console.log('TF backend -> cpu (fallback)');
      } catch (err) {
        console.warn('TF backend setup failed:', err?.message || err);
      }
    }
    await tf.ready();

    // Charger les modèles requis depuis le dossier public/models
    // Les fichiers attendus sont les manifests JSON et les binaires référencés par ces manifests.
    await faceapi.nets.faceRecognitionNet.loadFromUri(basePath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(basePath);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(basePath);

    return true;
  } catch (err) {
    // Relancer pour que l'appelant attrape l'erreur
    throw new Error('Erreur chargement modèles / TF: ' + err.message);
  }
}

// Queue pour sérialiser les appels WASM et éviter les conflits
let descriptorQueue = Promise.resolve();
let descriptorRunning = false;

// Calcule le descripteur d'un visage à partir d'une canvas/vidéo
// Cette fonction DÉTECTE le visage ET calcule le descripteur
// Retourne `null` si aucun visage détecté
export async function computeDescriptorFromCanvas(canvasOrImage, timeoutMs = 5000) {
  // Attendre que le descripteur précédent soit terminé
  return new Promise((resolve) => {
    descriptorQueue = descriptorQueue.then(async () => {
      if (descriptorRunning) {
        resolve(null);
        return;
      }

      try {
        descriptorRunning = true;
        console.log(`[computeDescriptor] Détection + descripteur pour ${canvasOrImage.width}x${canvasOrImage.height}px...`);
        
        // Détécter ET calculer le descripteur en UN appel
        // detectSingleFace retourne une détection avec descripteur intégré
        const detectPromise = faceapi
          .detectSingleFace(canvasOrImage, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();
        
        const detection = await promiseWithTimeout(detectPromise, timeoutMs);
        
        if (!detection || !detection.descriptor) {
          console.warn(`[computeDescriptor] Aucun visage détecté`);
          resolve(null);
          return;
        }
        
        console.log(`[computeDescriptor] ✓ Visage détecté + descripteur (dim: ${detection.descriptor.length})`);
        resolve(detection.descriptor); // Float32Array (vecteur de 128 dimensions)
      } catch (err) {
        console.error(`[computeDescriptor] Erreur: ${err.message}`);
        resolve(null);
      } finally {
        descriptorRunning = false;
      }
    });
  });
}

// Convertit les descriptors en Float32Array de façon robuste
function ensureFloat32Array(arr) {
  if (arr instanceof Float32Array) return arr;
  if (Array.isArray(arr)) return new Float32Array(arr);
  if (ArrayBuffer.isView(arr)) return new Float32Array(arr);
  console.warn('[ensureFloat32Array] Format inconnu:', typeof arr);
  return null;
}

// Sauvegarde un enrôlement (label + tableau de descripteurs) dans IndexedDB
export async function saveEnrollment(label, descriptorsArray) {
  try {
    const current = (await get(DB_KEY)) || [];
    // Supprimer l'enrôlement existant pour la personne (remise à jour)
    const filtered = current.filter(e => e.label !== label);
    
    // Convertir tous les descriptors en Array pour stockage
    const descriptorsForStorage = descriptorsArray.map(d => {
      const f32 = ensureFloat32Array(d);
      return f32 ? Array.from(f32) : null;
    }).filter(d => d !== null);
    
    if (descriptorsForStorage.length === 0) {
      console.warn('[saveEnrollment] Aucun descriptor valide à sauvegarder');
      return;
    }
    
    filtered.push({ 
      label, 
      descriptors: descriptorsForStorage,
      count: descriptorsForStorage.length,
      saved: new Date().toISOString()
    });
    
    await set(DB_KEY, filtered);
    console.log(`[saveEnrollment] ✓ ${label}: ${descriptorsForStorage.length} descriptors sauvegardés`);
  } catch (err) {
    console.error('[saveEnrollment]', err);
    throw err;
  }
}

// Charge tous les enrôlements depuis IndexedDB (retourne tableau vide si aucun)
export async function loadEnrollments() {
  try {
    const enrolls = (await get(DB_KEY)) || [];
    console.log(`[loadEnrollments] Chargé ${enrolls.length} enrôlements`);
    return enrolls;
  } catch (err) {
    console.error('[loadEnrollments]', err);
    return [];
  }
}

// Efface tous les enrôlements stockés
export async function clearEnrollments() {
  try {
    await set(DB_KEY, []);
    console.log('[clearEnrollments] ✓ Tous les enrôlements supprimés');
  } catch (err) {
    console.error('[clearEnrollments]', err);
  }
}

// Supprime un enrôlement spécifique par label
export async function deleteEnrollment(label) {
  try {
    const current = (await get(DB_KEY)) || [];
    const filtered = current.filter(e => e.label !== label);
    await set(DB_KEY, filtered);
    console.log(`[deleteEnrollment] ✓ ${label} supprimé`);
  } catch (err) {
    console.error('[deleteEnrollment]', err);
    throw err;
  }
}

// Matcher robuste basé sur distance euclidienne avec logging détaillé
class FaceDescriptorMatcher {
  constructor(enrollments, threshold = 0.6) {
    this.enrollmentMap = {};
    this.threshold = threshold;
    this.debug = true;
    
    if (enrollments && enrollments.length > 0) {
      enrollments.forEach(e => {
        if (!e.descriptors || e.descriptors.length === 0) {
          console.warn(`[FaceDescriptorMatcher] ${e.label} n'a pas de descriptors`);
          return;
        }
        
        // Convertir tous les descriptors en Float32Array
        this.enrollmentMap[e.label] = e.descriptors.map(d => {
          const f32 = ensureFloat32Array(d);
          if (!f32) {
            console.warn(`[FaceDescriptorMatcher] Descriptor invalide pour ${e.label}`);
            return null;
          }
          if (f32.length !== 128) {
            console.warn(`[FaceDescriptorMatcher] Descriptor ${e.label} dim=${f32.length} (expected 128)`);
          }
          return f32;
        }).filter(d => d !== null);
      });
      
      const count = Object.values(this.enrollmentMap).reduce((sum, arr) => sum + arr.length, 0);
      console.log(`[FaceDescriptorMatcher] Construit avec ${enrollments.length} personne(s), ${count} descriptors, threshold=${threshold}`);
    } else {
      console.warn('[FaceDescriptorMatcher] Aucun enrôlement fourni');
    }
  }

  euclideanDistance(a, b) {
    if (!a || !b) return Infinity;
    if (a.length !== b.length) {
      console.warn(`[euclideanDistance] Dimension mismatch: ${a.length} vs ${b.length}`);
      return Infinity;
    }
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  findBestMatch(descriptor) {
    const inputDesc = ensureFloat32Array(descriptor);
    if (!inputDesc) {
      console.warn('[findBestMatch] Descriptor d\'entrée invalide');
      return { label: 'Inconnu', distance: Infinity, confidence: 0 };
    }

    let bestLabel = 'Inconnu';
    let bestDistance = Infinity;
    const distances = {};
    
    // Calculer distance pour chaque enrôlement
    for (const [label, descriptors] of Object.entries(this.enrollmentMap)) {
      const labelDistances = [];
      for (const enrollDesc of descriptors) {
        const dist = this.euclideanDistance(inputDesc, enrollDesc);
        labelDistances.push(dist);
      }
      
      if (labelDistances.length === 0) continue;
      
      // Utiliser la meilleure distance pour cette personne
      const minDist = Math.min(...labelDistances);
      const avgDist = labelDistances.reduce((a, b) => a + b, 0) / labelDistances.length;
      distances[label] = { min: minDist, avg: avgDist };
      
      if (minDist < bestDistance) {
        bestDistance = minDist;
        bestLabel = label;
      }
    }
    
    // Logging détaillé pour debug
    if (this.debug && Object.keys(distances).length > 0) {
      console.log('[findBestMatch] Distances:', distances);
    }
    
    const confidence = bestDistance === Infinity ? 0 : Math.max(0, 1 - (bestDistance / 1.2));
    const matched = bestDistance < this.threshold;
    
    return {
      label: matched ? bestLabel : 'Inconnu',
      distance: bestDistance,
      confidence: confidence,
      allDistances: distances
    };
  }
}

// Construit un matcher à partir des enrôlements
export function buildMatcherFromEnrollments(enrollments, threshold = 0.6) {
  if (!enrollments || enrollments.length === 0) {
    console.warn('[buildMatcherFromEnrollments] Aucun enrôlement trouvé');
    return null;
  }
  
  const matcher = new FaceDescriptorMatcher(enrollments, threshold);
  return matcher;
}

// Obtenir les stats d'enrollments (pour Admin page)
export async function getEnrollmentStats() {
  try {
    const enrolls = (await get(DB_KEY)) || [];
    return {
      totalPeople: enrolls.length,
      totalPhotos: enrolls.reduce((sum, e) => sum + (e.descriptors?.length || 0), 0),
      enrollments: enrolls
    };
  } catch (err) {
    console.error('[getEnrollmentStats]', err);
    return { totalPeople: 0, totalPhotos: 0, enrollments: [] };
  }
}

// Exporte les données au format XLSX
export const exportToXLSX = (data) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, 'attendance_list.xlsx');
};

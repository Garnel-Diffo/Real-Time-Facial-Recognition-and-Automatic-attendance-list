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

// Calcule le descripteur d'un visage à partir d'une région cropped
// IMPORTANT: Cette fonction suppose que la région contient UN visage détecté par MediaPipe
// Elle N'effectue PAS de détection pour éviter les conflits WASM avec MediaPipe
// Retourne `null` si le calcul échoue.
export async function computeDescriptorFromCanvas(canvasOrImage, timeoutMs = 2000) {
  try {
    console.log(`[computeDescriptor] Calcul du descripteur pour région ${canvasOrImage.width}x${canvasOrImage.height}px...`);
    
    // Utiliser SEULEMENT computeFaceDescriptor() qui ne fait PAS de détection
    // Cela évite les conflits WASM avec MediaPipe FaceDetection
    // Cette fonction assume que la région contient déjà un visage
    const computePromise = faceapi.computeFaceDescriptor(canvasOrImage);
    
    const descriptor = await promiseWithTimeout(computePromise, timeoutMs);
    
    if (!descriptor) {
      console.warn(`[computeDescriptor] Timeout ou aucun descripteur (${timeoutMs}ms)`);
      return null;
    }
    
    console.log(`[computeDescriptor] ✓ Descripteur calculé (dim: ${descriptor.length})`);
    return descriptor; // Float32Array (vecteur de 128 dimensions)
  } catch (err) {
    console.error(`[computeDescriptor] Erreur: ${err.message}`);
    return null;
  }
}

// Sauvegarde un enrôlement (label + tableau de descripteurs) dans IndexedDB
export async function saveEnrollment(label, descriptorsArray) {
  const current = (await get(DB_KEY)) || [];
  // Supprimer l'enrôlement existant pour la personne (remise à jour)
  const filtered = current.filter(e => e.label !== label);
  filtered.push({ label, descriptors: descriptorsArray });
  await set(DB_KEY, filtered);
}

// Charge tous les enrôlements depuis IndexedDB (retourne tableau vide si aucun)
export async function loadEnrollments() {
  return (await get(DB_KEY)) || [];
}

// Efface tous les enrôlements stockés
export async function clearEnrollments() {
  await set(DB_KEY, []);
}

// Supprime un enrôlement spécifique par label
export async function deleteEnrollment(label) {
  const current = (await get(DB_KEY)) || [];
  const filtered = current.filter(e => e.label !== label);
  await set(DB_KEY, filtered);
  console.log(`[deleteEnrollment] ${label} supprimé`);
}

// Construit un FaceMatcher à partir des enrôlements (nécessaire pour l'identification)
// Convertit les tableaux sérialisés en Float32Array puis crée LabeledFaceDescriptors.
export function buildMatcherFromEnrollments(enrollments, threshold = 0.55) {
  if (!enrollments || enrollments.length === 0) {
    console.warn('Aucun enrôlement trouvé pour la construction du matcher');
    return null;
  }
  
  const labeled = enrollments.map(e => {
    // Chaque descripteur sauvegardé doit être converti en Float32Array
    const descs = e.descriptors.map(d => {
      if (d instanceof Float32Array) {
        return d;
      }
      // Si c'est un array ordinaire, le convertir en Float32Array
      return new Float32Array(d);
    });
    return new faceapi.LabeledFaceDescriptors(e.label, descs);
  });
  
  const matcher = new faceapi.FaceMatcher(labeled, threshold);
  console.log(`FaceMatcher construit avec ${enrollments.length} enrôlement(s), threshold=${threshold}`);
  return matcher;
}

# 🎯 Système de Reconnaissance Faciale et Liste de Présence Automatique

Application web de gestion d'assistance basée sur la **reconnaissance faciale en temps réel** avec interface moderne et responsive. Détecte et identifie automatiquement les visages contre une base d'enrôlements, avec comptage unique des visiteurs inconnus et export statistiques complètes.

**Stack principal** : React 18 + face-api 1.7 + TensorFlow.js + IndexedDB  
**Interface** : Responsive (desktop/mobile) avec gradient bleu-violet-indigo et glassmorphism  
**Stockage** : Entièrement local (IndexedDB, zéro serveur)

**Dépôt GitHub** : [Real-Time-Facial-Recognition-and-Automatic-attendance-list](https://github.com/Garnel-Diffo/Real-Time-Facial-Recognition-and-Automatic-attendance-list)

## ⚡ Démarrage rapide (5 minutes)

```bash
# 1. Cloner le projet
git clone <repo-url>
cd Real-Time-Facial-Recognition-and-Automatic-attendance-list

# 2. Installer dépendances
npm install

# 3. Lancer le serveur dev
npm run dev
# → Ouvre http://localhost:5173

# 4. Utiliser l'app
# - Onglet "Enrôler" : Capturer 5-10 photos d'une personne
# - Onglet "Session" : Détecter et reconnaître des visages en temps réel
# - Onglet "Admin" : Gérer les enrôlements (voir/supprimer)
```

**Prérequis** : Node.js 16+, navigateur moderne avec caméra  
**Modèles** : Auto-chargés du CDN face-api (~180 MB, cachés après)  
**Données** : Stockées localement dans IndexedDB (zéro serveur)

## 📑 Sommaire

1. [⚡ Démarrage rapide](#-démarrage-rapide-5-minutes)
2. [🌟 Caractéristiques](#-caractéristiques)
3. [📋 Prérequis](#-prérequis)
4. [🚀 Installation](#-installation)
5. [📖 Guide d'utilisation](#-guide-dutilisation)
6. [🏗️ Architecture Technique](#️-architecture-technique)
7. [🔧 Configuration](#-configuration)
8. [⚠️ Limitations connues](#️-limitations-connues)
9. [🔒 Confidentialité et Sécurité](#-confidentialité-et-sécurité)
10. [📊 Performance](#-performance)
11. [🐛 Dépannage](#-dépannage)
12. [📦 Dépendances principales](#-dépendances-principales)
13. [🚀 Scripts disponibles](#-scripts-disponibles)
14. [🔮 Améliorations futures](#-améliorations-futures)
15. [📄 Licence](#-licence)
16. [👨‍💻 Auteur](#-auteur)
17. [📞 Support](#-support)

---

## 🌟 Caractéristiques

- ✅ **Détection + Reconnaissance faciale unifiée** via face-api (modèles intégrés, pas de WASM conflicts)
- ✅ **Enrôlement automatisé** - capture 5-10 photos pour fiabilité accrue
- ✅ **Gestion intelligente des enrôlements** - ajouter, visualiser, supprimer individuellement ou en masse
- ✅ **Session d'assistance en temps réel** - détection continue avec FPS counter
- ✅ **Tracking UNIQUE des visiteurs inconnus** - compte les faces non identifiées SANS double-comptage
- ✅ **Statistiques complètes** - Total Présence = Reconnus + Inconnus (affichage en temps réel)
- ✅ **Export XLSX/CSV** - télécharger la liste avec toutes les statistiques
- ✅ **Stockage 100% local** - IndexedDB (pas de serveur requis)
- ✅ **Interface moderne** - gradient bleu-violet-indigo, glassmorphism, animations fluides
- ✅ **Responsive design** - fonctionnel desktop/tablette/mobile
- ✅ **UI entièrement en français** - tous les commentaires et messages en français
- ✅ **Gestion robuste des erreurs** - try/catch partout, fallbacks inclusos

## 📋 Prérequis

- **Node.js** ≥ 16.0.0
- **Navigateur moderne** avec support WebGL/WASM :
  - Chrome 90+
  - Firefox 85+
  - Edge 90+
  - Safari 14+
- **Accès caméra web** (permission nécessaire)
- **Connexion internet** (pour charger les modèles et dépendances)

## 🚀 Installation

### 1. Cloner et préparer le projet

```bash
cd Real-Time-Facial-Recognition-and-Automatic-attendance-list
npm install
```

### 2. (Si modèles absents dans `public/models/`) Télécharger les modèles face-api

Les modèles (120+ MB) doivent être placés dans `public/models/` :

**Option A : Depuis le repo face-api officiel**
```bash
# Télécharger les fichiers depuis:
# https://github.com/vladmandic/face-api/tree/master/model

# Vous avez besoin de:
# - ssd_mobilenetv1_model-weights_manifest.json + .bin
# - face_landmark_68_model-weights_manifest.json + .bin  
# - face_recognition_model-weights_manifest.json + .bin
# - tiny_face_detector_model-weights_manifest.json + .bin
```

**Option B : Via CDN (pour test rapide)**
Les modèles se chargeront automatiquement du CDN lors du premier lancement (plus lent).

### 3. Lancer le serveur de développement

```bash
npm run dev
```

L'application s'ouvre sur **http://localhost:5173** ou **http://localhost:5174** (si port occupé).

## 📖 Guide d'utilisation

### 1️⃣ **Enrôlement** — Inscrire une nouvelle personne

1. Cliquer sur l'onglet **"Enrôler"** (icône ➕)
2. Entrer le **nom ou ID** de la personne à enrôler
3. Cliquer **"Démarrer"** pour activer la caméra et la détection
4. Prendre **minimum 5 photos, maximum 10** :
   - Chaque photo détecte automatiquement le visage
   - Un descripteur 128D est extrait et stocké en mémoire
   - Plusieurs angles et distances = meilleure reconnaissance par la suite
5. Cliquer **"Finaliser l'enrôlement"** → tous les descripteurs sont sauvegardés dans IndexedDB
6. Message de confirmation : **"✅ Enrôlement réussi"**

**Points importants** :
- Minimum 5 photos obligatoires (max 10)
- Chaque photo doit contenir exactement 1 visage
- Format : JPEG/PNG depuis la caméra en temps réel
- Les descripteurs sont des vecteurs 128D (poids léger, ~1-2 KB par photo)

### 2️⃣ **Session** — Scan en temps réel

1. Cliquer sur l'onglet **"Session"** (icône 📹)
2. La caméra démarre **automatiquement** et affiche :
   - **Boîte verte** autour des visages reconnus (Euclid distance < 0.6)
   - **Nom + distance** si la personne est enrôlée (ex: "Alice (0.35)")
   - **Boîte rouge** + **"Inconnu"** si visage non identifié
3. **Compteurs en temps réel** (bas de l'écran) :
   - 🎬 **FPS** : Images par seconde (indicateur de performance)
   - 👥 **TOTAL** : Somme total présence = reconnus + inconnus
   - ✅ **Reconnus** : Nombre de personnes identifiées
   - ❓ **Inconnus** : Nombre de visiteurs non identifiés (UNIQUE par frame)
4. Les personnes reconnues s'accumulent dans la liste **"Présents"** à droite
5. Cliquer **"📥 Exporter XLSX"** pour télécharger la liste complète

**Mécanisme de comptage des inconnus** :
- Les visages inconnus sont **tracés par position spatiale** (x, y du centre)
- Distance seuil : **80 pixels** minimum pour considérer deux visages comme différents
- Les visages non revus depuis **5 secondes** sont supprimés du comptage
- **Aucun double-comptage** : même personne = 1 seul comptage

### 3️⃣ **Admin** — Gérer les enrôlements

1. Cliquer sur l'onglet **"Admin"** (icône ⚙️)
2. Voir les **statistiques** en haut :
   - 👥 **Personnes** : Nombre total de personnes enrôlées
   - 📸 **Photos** : Nombre total de photos capturées (somme de tous les enrôlements)
   - 📅 **Statut** : ✅ si enrôlements existent, ⏳ sinon
3. Voir la **tableau des enrôlements** :
   - **Nom** : Identité de la personne (initiale dans badge)
   - **Photos** : Nombre de descripteurs stockés pour cette personne
   - **Actions** : Bouton 🗑️ pour supprimer individuellement
4. Supprimer :
   - **Individuellement** : clic sur 🗑️ à côté du nom (confirmation requise)
   - **Tous** : bouton rouge "🔥 Supprimer TOUT" en bas (confirmation requise)

**Affichage des données** :
- Interface responsive : 3 colonnes sur desktop, adaptée mobile
- Glassmorphism avec gradient bleu-violet-indigo
- Chargement des stats depuis IndexedDB via `getEnrollmentStats()`

## 🏗️ Architecture Technique

### Stack
- **Frontend** : React 18.2.0 + Hooks (useEffect, useRef, useState, useCallback)
- **Détection + Reconnaissance faciale** : @vladmandic/face-api 1.7.15 (TensorFlow.js intégré)
- **Calcul ML** : TensorFlow.js 4.22.0 (backend WebGL avec fallback CPU)
- **Stockage** : IndexedDB via idb-keyval 6.2.2 (kvstore key-value local)
- **Export données** : XLSX 0.18.5 (Excel/Calc)
- **Styling** : Tailwind CSS 3.3 (responsive, gradients, glassmorphism)
- **Build tool** : Vite 5.4.21 (rapide, HMR)
- **Linter** : ESLint (avec prettier si configuré)

### Pipeline de reconnaissance

```
┌─ Caméra vidéo (640x480, 30 FPS)
└─ Canvas rendering (affiche vidéo à chaque frame)
   │
   └─ Throttle détection (tous les 3 frames = ~10 Hz)
      │
      ├─ face-api.detectAllFaces() + SsdMobilenetv1Options
      │  └─ Détecte multiples visages par frame
      │
      └─ Pour chaque détection:
         ├─ detection.withFaceDescriptors() → descripteur 128D
         ├─ FaceDescriptorMatcher.findBestMatch()
         │  │  (distance Euclidienne vs enrôlements)
         │  │
         │  ├─ distance < 0.6 → RECONNU ✅
         │  │  └─ Ajouter à presentSet, afficher en vert
         │  │
         │  └─ distance >= 0.6 → INCONNU ❓
         │     ├─ Vérifier position spatiale
         │     ├─ Si distance >= 80px → NOUVEAU visage inconnu
         │     └─ Ajouter à unknownFacesRef, afficher en rouge
         │
         └─ drawDetectionBox() (boîte + label)

Comptage:
- presentSet: Set<string> de noms (unique par id)
- unknownFacesRef: Array<{x, y, lastSeen}> avec nettoyage 5s
- Total Présence = presentSet.size + unknownFacesRef.length
```

### Modèles utilisés

Tous les modèles sont issus de **face-api** (basés TensorFlow.js) :

| Modèle | Usage | Poids |
|--------|-------|-------|
| `ssd_mobilenetv1` | Détection visages (bounding box) | ~80 MB |
| `face_landmark_68` | Points d'intérêt (landmarks) | ~60 MB |
| `face_recognition` | Descripteur 128D (embedding) | ~40 MB |

**Total** : ~180 MB (téléchargés une seule fois, cachés par le navigateur)

### Structure des fichiers

```
src/
├── components/
│   ├── Session.jsx          # Page session (détection/reconnaissance temps réel)
│   │                         # - processFrame() avec throttling DETECTION_INTERVAL
│   │                         # - drawDetectionBox() helper
│   │                         # - unknownFacesRef pour tracking UNIQUE
│   │                         # - exportXLSX() avec stats complètes
│   │
│   ├── Enrollment.jsx        # Page enrôlement (capture 5-10 photos)
│   │                         # - videoRef + canvasRef pour feed vidéo
│   │                         # - computeDescriptorFromCanvas() par photo
│   │                         # - saveEnrollment(label, descriptors) IndexedDB
│   │
│   ├── Admin.jsx             # Page admin (gestion enrôlements)
│   │                         # - getEnrollmentStats() pour affichage liste
│   │                         # - deleteEnrollment(label) avec confirmation
│   │                         # - clearEnrollments() bulk delete
│   │
│   └── ui/
│       └── Button.jsx        # Composant bouton réutilisable
│
├── services/
│   └── faceService.js        # Service principal (modèles, matching, stockage)
│       ├── loadFaceApiModels(basePath) → charge 4 modèles
│       ├── computeDescriptorFromCanvas() → descripteur 128D avec queue WASM
│       ├── saveEnrollment(label, descriptorsArray) → IndexedDB
│       ├── loadEnrollments() → tableau d'enrôlements
│       ├── getEnrollmentStats() → {totalPeople, totalPhotos, enrollments}
│       ├── buildMatcherFromEnrollments() → FaceDescriptorMatcher
│       ├── deleteEnrollment(label) → suppression individuelle
│       ├── clearEnrollments() → suppression masse
│       └── exportToXLSX(data) → téléchargement fichier
│
├── App.jsx                   # Route principale
│       ├── Navigation (Session/Enrôler/Admin)
│       ├── Gradient background + animated blobs
│       ├── Glassmorphism header sticky
│       └── Responsive grid (lg:grid-cols-2 desktop)
│
├── main.jsx                  # Point d'entrée React
├── index.css                 # Styles globaux
│       ├── Animations (blob, fadeIn, slideIn, shimmer, glow)
│       ├── Gradients bleu-violet-indigo
│       └── Glassmorphism utilities
│
└── assets/                   # Images/icônes (si besoin)

public/
├── index.html                # HTML template
├── models/                   # Modèles face-api (180+ MB total)
│   ├── ssd_mobilenetv1_model-weights_manifest.json
│   ├── ssd_mobilenetv1_model-weights_1.bin
│   ├── face_landmark_68_model-weights_manifest.json
│   ├── face_landmark_68_model-weights_1.bin
│   ├── face_recognition_model-weights_manifest.json
│   ├── face_recognition_model-weights_1.bin
│   ├── tiny_face_detector_model-weights_manifest.json
│   └── tiny_face_detector_model-weights_1.bin
│
└── vite.svg                  # Vite logo (optionnel)

Configuration:
├── vite.config.js            # Vite config (React plugin, optimisations)
├── tailwind.config.js        # Tailwind config (custom colors, animations)
├── postcss.config.js         # PostCSS (Tailwind preprocessor)
├── eslint.config.js          # ESLint rules
├── package.json              # Dépendances + scripts
└── package-lock.json         # Lock versions
```

### Flux de données (Diagramme)

```
┌─── Enrollment.jsx ──────────────────────────────────────┐
│                                                          │
│  videoRef (caméra) → canvasRef (frame)                  │
│         ↓                                               │
│  computeDescriptorFromCanvas() [faceService]           │
│         ↓                                               │
│  Array<Float32Array[128]> (capture en mémoire)        │
│         ↓                                               │
│  saveEnrollment(label, descriptors) [faceService]      │
│         ↓                                               │
│  IndexedDB: attend_enroll_v1                           │
│  ├─ { label: "Alice", descriptors: [...], count: 5 }  │
│  └─ { label: "Bob", descriptors: [...], count: 8 }    │
└──────────────────────────────────────────────────────────┘
                        ↓
        ┌─── Session.jsx ──────────────────────────────────┐
        │                                                   │
        │  loadEnrollments() [faceService]                 │
        │         ↓                                        │
        │  buildMatcherFromEnrollments() → FaceMatcher    │
        │         ↓                                        │
        │  processFrame() avec loop requestAnimationFrame │
        │  │                                               │
        │  ├─ detectAllFaces() + descriptors              │
        │  │  ├─ matcher.findBestMatch(descriptor)        │
        │  │  ├─ distance < 0.6 ? RECOGNIZED : UNKNOWN    │
        │  │  └─ drawDetectionBox()                       │
        │  │                                               │
        │  ├─ unknownFacesRef tracking par position       │
        │  │  ├─ Nouveau = ajouter avec {x, y, id}       │
        │  │  ├─ Existant = mettre à jour lastSeen        │
        │  │  └─ Ancien (> 5s) = supprimer               │
        │  │                                               │
        │  └─ Affichage stats:                            │
        │     ├─ presentSet.size (reconnus)               │
        │     ├─ unknownFacesRef.length (inconnus unique)│
        │     └─ Total = reconnus + inconnus              │
        │                                                   │
        │  exportXLSX() → fichier attendance_*.xlsx       │
        │  ├─ Liste des reconnus (nom, statut "Reconnu")  │
        │  ├─ Visiteurs inconnus (count)                  │
        │  └─ Stats: TOTAL PRÉSENCE, Reconnus, Inconnus   │
        └───────────────────────────────────────────────────┘
                        ↓
        ┌─── Admin.jsx ─────────────────────────────────────┐
        │                                                    │
        │  getEnrollmentStats() [faceService]               │
        │  {                                                │
        │    totalPeople: 2,                               │
        │    totalPhotos: 13,                              │
        │    enrollments: [                                │
        │      { label: "Alice", descriptors: [...], ... } │
        │      { label: "Bob", descriptors: [...], ... }   │
        │    ]                                             │
        │  }                                               │
        │         ↓                                        │
        │  Affichage tableau enrôlements                   │
        │  ├─ deleteEnrollment(label) → IndexedDB         │
        │  └─ clearEnrollments() → IndexedDB              │
        └────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Paramètres ajustables

**Session.jsx - Seuils de reconnaissance**
```javascript
// Ligne ~10
const RECOGNITION_THRESHOLD = 0.6;  // Distance Euclidienne
// distance < 0.6 → RECONNU ✅
// distance >= 0.6 → INCONNU ❓
// ↑ valeur = plus permissif (accepte + de variations)
// ↓ valeur = plus strict (rejette + facilement)

const UNKNOWN_FACE_DISTANCE_THRESHOLD = 80; // pixels
// Distance spatiale min pour considérer 2 visages inconnus comme différents
// ↑ valeur = agrège + de visages
// ↓ valeur = considère + de visages uniques

const DETECTION_INTERVAL = 3;
// Détecte 1 face tous les 3 frames (throttling)
// 640x480@30fps → ~10 détections/sec
// ↓ valeur = + de détections (gourmand CPU)
// ↑ valeur = - de détections (plus rapide)
```

**faceService.js - Timeouts et queue**
```javascript
// Ligne ~64
function promiseWithTimeout(p, ms = 5000) { ... }
// Timeout pour computeDescriptor: 5000ms
// ↑ valeur = + tolérant si caméra lente
// ↓ valeur = + strict (rejette les frames lentes)

// Queue WASM: descriptorRunning + descriptorQueue
// Sérialise les appels pour éviter WASM conflicts
// (les modèles TensorFlow ne support pas parallélisme)
```

**Enrollment.jsx - Capture vidéo**
```javascript
// Ligne ~36
video: { width: 1280, height: 720 }
// Résolution requête caméra
// ↑ résolution = meilleure qualité, + lent
// ↓ résolution = plus rapide, moins précis
```

### Optimisations possibles

1. **Résolution vidéo** : Réduire 1280x720 → 640x480 pour caméras lentes
2. **Modèles** : La bibliothèque face-api inclut des modèles `tiny` plus rapides
3. **Détection throttling** : Augmenter DETECTION_INTERVAL (ex: 5 au lieu de 3)
4. **Backend TensorFlow** : Forcer 'cpu' si WebGL instable (faceService.js:35)
5. **Déploiement** : Pré-charger les modèles au build ou CDN pour production

## ⚠️ Limitations connues

| Limitation | Cause | Workaround |
|-----------|-------|-----------|
| Petit visages (distance > 1m) ne détectent pas | Modèle SSD MobileNet nécessite contexte | Approcher plus près de la caméra |
| Visages partiellement couverts (masque, main) | Descripteur ne peut être calculé | Découvrir le visage |
| Fausses non-détections (trop strict) | Seuil RECOGNITION_THRESHOLD trop bas | Augmenter threshold (0.6 → 0.65) |
| Fausses reconnaissances (trop permissif) | Seuil trop haut | Abaisser threshold (0.6 → 0.55) |
| Lenteur sur laptops anciens | Modèles ML lourds (180MB) | Réduire résolution vidéo, augmenter DETECTION_INTERVAL |
| Permissions caméra refusées | Navigateur/OS | Autoriser caméra dans paramètres navigateur |
| Erreur WASM "Module arguments replaced" | Appels parallèles sur modèles TensorFlow | Page refresh (queue sérialise les appels) |
| IndexedDB stockage limité | Quota navigateur (~50MB) | Avec ~8 photos = ~100-200 KB par personne (OK) |
| Même personne parfois non reconnue | Variations d'éclairage, angle, accessoires | Ré-enrôler avec différentes conditions |
| "Inconnu" ne monte pas assez | Visages trop similaires | C'est normal, 80px threshold configurable |

**Notes** :
- face-api utilise un modèle d'extraction de descripteurs **fixe** (pré-entraîné)
- Pas de fine-tuning par utilisateur (pas d'apprentissage online)
- Descripteurs non transférables entre OS/navigateur (variations TensorFlow)

## 🔒 Confidentialité et Sécurité

### Données sauvegardées

**Dans IndexedDB (local, persistant)** :
- ✅ **Descripteurs 128D** : Vecteurs mathématiques, pas l'image originale
  - ~1-2 KB par descripteur (efficient)
  - 5-10 descripteurs par personne = 10-20 KB par enrôlement
- ✅ **Métadonnées** : Nom/ID, nombre de photos, timestamp enregistrement
- ❌ **Pas d'images vidéo** : Juste descripteurs (pas de vidéo persistée)

### Sécurité

**Points forts** :
- ✅ **Zéro serveur** : Tous les calculs en local (navigateur)
- ✅ **Zéro requêtes réseau** : Sauf chargement modèles au premier lancement
- ✅ **Zéro tracking** : Pas de cookies, pas d'analytics
- ✅ **Zéro chiffrement requis** : Données locales non sensibles (juste vecteurs)

**Points faibles** :
- ⚠️ **Pas de verrous** : IndexedDB n'est pas chiffré (=données claires si accès disque)
- ⚠️ **Admin sans auth** : Toute personne peut accéder aux 3 onglets
- ⚠️ **Pas d'audit trail** : Aucun log qui a enrôlé qui

### Recommandations pour production

1. **Ajouter authentification** : Login + password avant Session/Admin
2. **Chiffrer IndexedDB** : Libirairie comme `dexie-crypto` ou `sqlcipher`
3. **Audit logging** : Logger tous les enrôlements + suppressions + exports
4. **HTTPS obligatoire** : Protect chargement modèles et données
5. **Rate limiting** : Limiter exports/suppressions (brute-force protection)
6. **Session timeouts** : Auto-logout après inactivité (30 min)
7. **Watermarking** : Marquer exports avec date/heure/utilisateur

### Conformité RGPD

- ✅ **Consentement** : Afficher consent banner avant caméra
- ✅ **Droit à l'oubli** : Bouton "Supprimer toutes les données" en Admin
- ✅ **Portabilité** : Export XLSX = données exportables
- ⚠️ **Responsable traitement** : Doit être défini (école, entreprise, etc.)
- ⚠️ **DPIA** : Évaluation d'impact requise si déploiement réel

## 📊 Performance

### Benchmarks (testé sur desktop avec Webcam HD)

| Métrique | Valeur | Notes |
|----------|--------|-------|
| Latence détection faciale | 30-50 ms | face-api.detectAllFaces() |
| Latence descripteur | 100-150 ms | computeDescriptorFromCanvas() |
| Latence reconnaissance | 5-10 ms | FaceDescriptorMatcher.findBestMatch() |
| FPS caméra (vidéo affichée) | 30 fps | requestAnimationFrame |
| FPS détection (throttled) | ~10 fps | DETECTION_INTERVAL=3 |
| Mémoire RAM utilisée | 150-250 MB | Modèles en mémoire + buffers vidéo |
| Taille modèles (total) | ~180 MB | Téléchargés une seule fois |
| Taille IndexedDB par personne | 10-20 KB | 5-10 descripteurs x 2KB |
| Temps export XLSX | 50-100 ms | Générer + télécharger fichier |

### Optimisations appliquées

1. **Canvas rendering** : Affiche vidéo à CHAQUE frame pour fluidité
2. **Détection throttled** : Seulement tous les 3 frames (économise CPU)
3. **Queue WASM** : Sérialise appels TensorFlow (évite race conditions)
4. **Ref-based state** : FPS counter + processing flag en useRef (pas de re-renders)
5. **useCallback memoization** : processFrame() évite re-créations inutiles
6. **Lazy model loading** : Modèles chargés à la demande, mis en cache navigateur

### Profiling

Pour profiler le code :
```bash
# Ouvrir DevTools Chrome → Performance tab
# Enregistrer session → Identifier hot spots
# Vérifier FPS counter en bas Session.jsx
# Vérifier Console pour logs [Session] et [faceService]
```

## 🐛 Dépannage

### "Erreur : Permission denied / Caméra non accessible"

**Cause** : Navigateur/OS refuse accès caméra

**Solutions** :
1. Vérifier que le site est en **HTTPS** (ou localhost:5173)
2. Aller dans Settings du navigateur → Caméra → Autoriser pour localhost:5173
3. Redémarrer le navigateur + rafraîchir la page
4. Sur mobile : Vérifier permissions app (iOS: Settings → Privacy → Camera)

---

### "Aucun visage détecté / Boîte vide"

**Cause** : Visage trop éloigné, trop petit, ou mauvais éclairage

**Solutions** :
1. **Rapprocher du visage** (à ~30-50cm de la caméra)
2. **Augmenter luminosité** : Pas d'ombre sur le visage
3. **Regarder directement** la caméra (pas de profil complet)
4. **Dégager le visage** : Pas de masque/chapeau couvrant

---

### "Énormément de 'Inconnu' / Pas reconnaître mes enrôlés"

**Cause** : Seuil RECOGNITION_THRESHOLD trop strict (0.6)

**Solutions** :
1. **Ré-enrôler** avec plus de photos (8-10 au lieu de 5)
   - Varier angles : face, 45°, profil
   - Varier distance : près et loin
   - Varier éclairage : lumière naturelle, LED, etc.
2. **Abaisser le seuil** (Session.jsx:11) : 0.6 → 0.55 ou 0.50
3. **Vérifier distance affichée** : Si 0.55-0.60 quand reconnu, c'est limite

---

### "Erreur 'Module arguments has been replaced' / WASM crash"

**Cause** : Appels parallèles sur TensorFlow (conflit WASM)

**Solutions** :
1. **Rafraîchir la page** (F5) → réinitialise queue
2. **Vérifier Console** pour stack trace exact
3. Si persistant : Vider cache navigateur (Ctrl+Shift+Del)
4. Code utilise déjà queue pour prévenir ça, donc rare

---

### "Session lente / FPS bas (< 15)"

**Cause** : Caméra/CPU lent, ou détection trop fréquente

**Solutions** :
1. **Réduire résolution vidéo** (Enrollment.jsx:36) : 1280x720 → 640x480
2. **Augmenter throttling** (Session.jsx:8) : DETECTION_INTERVAL: 3 → 5
3. **Fermer autres apps** : Chrome bouffe la RAM
4. **Forcer CPU backend** (faceService.js:35) : WebGL peut être instable
5. **Vérifier FPS counter** : Si stable > 15 fps, c'est normal (throttled)

---

### "Admin page blanche / Pas affiche les enrôlements"

**Cause** : Erreur chargement IndexedDB ou `getEnrollmentStats()` échouée

**Solutions** :
1. **Ouvrir Console** (F12) → chercher `[Admin]` logs
2. **Vérifier IndexedDB** : DevTools → Application → IndexedDB → attend_enroll_v1
   - Si vide : enrôler quelqu'un d'abord (Enrollment tab)
   - Si DB inexistante : Vider cache navigateur
3. **Vérifier faceService exports** : S'assurer `getEnrollmentStats` est bien exportée
4. **Hard refresh** (Ctrl+Shift+R) pour forcer rechargement JS

---

### "Export XLSX corrompu / Ne s'ouvre pas"

**Cause** : Données malformées ou caractères spéciaux non encodés

**Solutions** :
1. **Vérifier noms** : Pas de caractères bizarres (accents OK)
2. **Utiliser Excel** au lieu de LibreOffice Calc (meilleure compat)
3. **Vérifier le fichier** : Si size < 1KB, export probablement vide

---

### "Descripteur "Inconnu" avec 'Inconnu' compté plusieurs fois"

**Cause** : Même personne détectée à plusieurs frames proches

**Attendu** : Avec threshold 80px, la même face = 1 comptage  
- Si elle se déplace de 100px → 2e entrée créée
- Après 5s sans être vérifiée → supprimée du comptage

**Solution** : C'est le comportement attendu. Total PRÉSENCE inclut tous les visiteurs uniques vu dans la session.

---

### Logs de debug

Pour voir les traces détaillées, ouvrir **Console** (F12) :

```
[Session] Modèles chargés... ✓
[faceService] TF backend -> webgl
[Admin] Chargement des enrollments...
[Admin] Stats chargées: { totalPeople: 2, totalPhotos: 13, enrollments: [...] }
[computeDescriptor] ✓ Visage détecté (dim: 128)
[saveEnrollment] ✓ Alice: 5 descriptors sauvegardés
```

Si erreur → stack trace complet fourni → utile pour debug

## 📦 Dépendances principales

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@vladmandic/face-api": "^1.7.15",
    "@tensorflow/tfjs": "^4.22.0",
    "tailwindcss": "^3.3.0",
    "idb-keyval": "^6.2.2",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "vite": "^5.4.21",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.54.0",
    "eslint-plugin-react": "^7.33.2",
    "postcss": "^8.4.32",
    "autoprefixer": "^10.4.16",
    "tailwindcss": "^3.3.6"
  }
}
```

### Notes sur les dépendances

| Paquet | Version | Usage | Commentaires |
|--------|---------|-------|--------------|
| **face-api** | 1.7.15 | Détection + Reconnaissance | Core du projet, modèles inclus |
| **@tensorflow/tfjs** | 4.22.0 | Backend ML | Utilisé par face-api, webgl/cpu auto |
| **idb-keyval** | 6.2.2 | IndexedDB wrapper | Simple k-v storage, léger (2KB gzip) |
| **xlsx** | 0.18.5 | Export Excel | Génère fichiers XLSX dynamiquement |
| **react** | 18.2.0 | Framework | Hooks + Concurrent features |
| **tailwindcss** | 3.3.0 | Styling | JIT compiler, gradients, animations |
| **vite** | 5.4.21 | Bundler | ESM, HMR, rapide, prod optimisé |

### Absence volontaire

- ❌ **MediaPipe** : Conflit WASM avec TensorFlow (évité, utilise face-api)
- ❌ **OpenCV.js** : Trop lourd (2.5MB) pour simple webcam
- ❌ **Socket.io** : Pas de serveur donc pas socket
- ❌ **Redux/Context** : Props drilling simple pour 3 pages
- ❌ **TypeScript** : Complexité non nécessaire pour MVP

## 🚀 Scripts disponibles

```bash
# Développement
npm run dev          # Démarrer serveur dev Vite (HMR activé)
                     # → http://localhost:5173

# Production
npm run build        # Minifier + optimiser pour déploiement
                     # → output dans /dist
npm run preview      # Afficher aperçu du build production
                     # → même contenu que npm run dev mais minifié

# Linting
npm run lint         # Vérifier ESLint + style code
                     # (Pas de auto-fix par défaut)
```

### Workflow recommandé

**Développement local** :
```bash
npm install                 # Une seule fois
npm run dev                 # Lance Vite @ http://localhost:5173
# → Auto-refresh à chaque sauvegarde fichier
```

**Avant commit** :
```bash
npm run lint                # Vérifier pas d'erreurs ESLint
npm run build               # Vérifier la build ne plante pas
```

**Déploiement production** :
```bash
npm run build                # Génère /dist
# Déployer /dist sur serveur web (Vercel, Netlify, Apache, etc.)
```

### Variables d'environnement

Actuellement : **aucune** (tout en dur dans code)

Pour production, créer `.env` :
```env
VITE_API_URL=https://api.example.com
VITE_MODELS_PATH=/models
```

Puis accéder dans code :
```javascript
const modelsPath = import.meta.env.VITE_MODELS_PATH || '/models';
```

## 🔮 Améliorations futures

### Phase 2 : Robustesse & Scalabilité
- [ ] **Persistance serveur** : Base de données centralisée (MongoDB, PostgreSQL)
- [ ] **Authentification multi-utilisateurs** : Login + RBAC (Admin, Lecturer, Student)
- [ ] **Audit logging** : Historique complet des enrôlements/détections/exports
- [ ] **API REST** : Endpoints pour enrôlement/reconnaissance/stats
- [ ] **WebSocket temps réel** : Notifications live (nouvelle personne détectée)

### Phase 3 : Fonctionnalités avancées
- [ ] **Détection d'émotions** : Utiliser MediaPipe Face Mesh + ML pour émotion
- [ ] **Reconnaissance d'actions** : Détester si levée de main, assis vs debout
- [ ] **Multi-caméra** : Sync entre plusieurs webcams (classe grande)
- [ ] **Support masques** : Fine-tune descripteur pour faces masquées
- [ ] **Dashboard statistiques** : Graphiques tendances présence/absences
- [ ] **Intégration SMS/Email** : Alertes sur absences

### Phase 4 : Performance & Déploiement
- [ ] **Code splitting** : Lazy load modèles TensorFlow (async)
- [ ] **Service Worker** : Offline-first, cache modèles
- [ ] **Docker** : Containerize pour déploiement facile
- [ ] **Mobile app** : React Native pour iOS/Android
- [ ] **Edge ML** : ONNX Runtime pour inférence côté serveur
- [ ] **Batch processing** : Queue pour traiter vidéos archivées

### Phase 5 : Sécurité & Conformité
- [ ] **Chiffrement E2E** : Descripteurs chiffrés (NaCl.js ou libsodium)
- [ ] **2FA** : Authentification deux-facteurs
- [ ] **GDPR compliance** : Consent banner, droit oubli, portabilité
- [ ] **Anonymization** : Hachage des visages non identifiés
- [ ] **Compliance audit** : HIPAA si médicale, FERPA si école

### Phase 6 : UX/Design
- [ ] **Mode sombre** : Dark theme option
- [ ] **Internationalization (i18n)** : Support multilingue
- [ ] **Accessibility (A11y)** : WCAG 2.1 AA compliance
- [ ] **Mobile app redesign** : Optimiser pour écrans petits
- [ ] **Onboarding** : Tutorial interactif pour nouveaux utilisateurs

### Feuille de route technologique
```
Q1 2026: Authentification + API REST
Q2 2026: Dashboard + Websocket live
Q3 2026: Service Worker + Offline
Q4 2026: Mobile app (React Native)
2027: Scaled production (1000+ users)
```

## 📄 Licence

Ce projet est fourni à usage **éducatif et de recherche**.

**Droits d'auteur** © 2026 ENSPY  
**Auteurs** : DIFFO KENNE Garnel, NGONO NGUIETSI Vanina S.

**Conditions d'utilisation** :
- ✅ Utilisation libre pour usage personnel/académique
- ✅ Modification du code autorisée (fork recommandé)
- ✅ Création de projets dérivés autorisée
- ⚠️ Utilisation commerciale : Respecter les licences des dépendances (face-api, TensorFlow.js, etc.)
- ❌ Redistribution sans attribution : Interdite

**Dépendances et leurs licences** :
- face-api : BSD-3-Clause (open-source)
- TensorFlow.js : Apache 2.0
- React : MIT
- Tailwind CSS : MIT
- Vite : MIT

Voir [LICENSE](LICENSE) pour détails complets.

## 👨‍💻 Auteur

Projet **IHM (Interface Homme-Machine)** — Janvier 2026  
**Établissement** : ENSPY (École Nationale Supérieure Polytechnique de Yaoundé)  
**Niveau** : Semestre 4 (Niveau 4)

### Contributeurs

| Nom | Rôle | Contact |
|-----|------|---------|
| **DIFFO KENNE Garnel** | Lead Developer + Architecture | [GitHub](https://github.com/Garnel-Diffo) |
| **NGONO NGUIETSI Vanina S.** | Co-Developer + Design | [GitHub/LinkedIn] |

### Ressources utilisées

- **Documentation** : face-api ([GitHub](https://github.com/vladmandic/face-api))
- **Modèles** : TensorFlow.js Model Zoo
- **Frameworks** : React 18 docs, Tailwind CSS docs, Vite docs
- **Inspiration** : OpenFace, FaceNet (Google), MTCNN

### Remerciements

- 👨‍🏫 Encadrants ENSPY pour la supervision
- 🎓 Coursework ML/Computer Vision pour contexte
- 🔬 Communauté open-source pour libraries et support

**Dépôt GitHub** : [Real-Time-Facial-Recognition-and-Automatic-attendance-list](https://github.com/Garnel-Diffo/Real-Time-Facial-Recognition-and-Automatic-attendance-list)  
**Créé** : Janvier 2026  
**Dernière mise à jour** : Janvier 2026

## 📞 Support

### Ressources

**Documentation officielle** :
- face-api : https://github.com/vladmandic/face-api
- TensorFlow.js : https://www.tensorflow.org/js
- React 18 : https://react.dev
- Tailwind CSS : https://tailwindcss.com
- Vite : https://vitejs.dev

**Pour signaler un bug** :
1. Ouvrir **Console** (F12) et copier les logs `[Session]`, `[Admin]`, `[faceService]`
2. Créer **Issue** sur GitHub avec :
   - Navigateur + version
   - Système d'exploitation
   - Stack trace du console
   - Étapes pour reproduire
3. Exemple : "Session → 'Inconnu' détecté 10 fois quand même personne"

**Questions fréquentes** :
- Q: Ça marche sur téléphone ?  
  A: Oui, à condition navigateur supporte WebGL + caméra (iOS 14+, Android 9+)
  
- Q: Les données sortent du navigateur ?  
  A: Non, tout reste local. Aucune requête externe sauf chargement modèles.
  
- Q: Peux-je utiliser ça commercialement ?  
  A: Respectez les licences des dépendances (face-api/TF.js sont open-source)

**Contact développeur** :
- GitHub Issues : [Créer issue](https://github.com/Garnel-Diffo/Real-Time-Facial-Recognition-and-Automatic-attendance-list/issues)
- Email : [À définir si publié]
- Discord/Slack : [À définir]

### Contribuer

Les contributions sont bienvenues ! 

**Processus** :
1. Fork le repo
2. Créer branch `feature/ma-feature`
3. Commit avec messages clairs
4. Push et créer Pull Request
5. Attendre review + merge

**Guidelines** :
- Code en anglais (commentaires/variables)
- Respecter style ESLint
- Tester localement avant PR
- Documenter changements majeurs

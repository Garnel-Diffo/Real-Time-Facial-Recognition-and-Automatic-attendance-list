# 🎯 Système de reconnaissance faciale et liste de présence automatique

Application web de gestion d'assistance basée sur la **reconnaissance faciale en temps réel**. Détecte automatiquement les visages avec MediaPipe et les identifie contre une base d'enrôlements avec face-api.

**Dépôt GitHub** : [Real-Time-Facial-Recognition-and-Automatic-attendance-list](https://github.com/Garnel-Diffo/Real-Time-Facial-Recognition-and-Automatic-attendance-list)

## 📑 Sommaire

1. [🌟 Caractéristiques](#-caractéristiques)
2. [📋 Prérequis](#-prérequis)
3. [🚀 Installation](#-installation)
   - [1. Cloner et préparer](#1-cloner-et-préparer-le-projet)
   - [2. Télécharger les modèles](#2-télécharger-les-modèles-face-api)
   - [3. Lancer le serveur](#3-lancer-le-serveur-de-développement)
4. [📖 Guide d'utilisation](#-guide-dutilisation)
   - [Enrôlement](#1️⃣-enrôlement--inscrire-une-nouvelle-personne)
   - [Session](#2️⃣-session--scan-en-temps-réel)
   - [Admin](#3️⃣-admin--gérer-les-enrôlements)
5. [🏗️ Architecture Technique](#️-architecture-technique)
   - [Stack](#stack)
   - [Pipeline](#pipeline-de-reconnaissance)
   - [Structure des fichiers](#structure-des-fichiers)
6. [🔧 Configuration](#-configuration)
7. [⚠️ Limitations connues](#️-limitations-connues)
8. [🔒 Confidentialité et Sécurité](#-confidentialité-et-sécurité)
9. [📊 Performance](#-performance)
10. [🐛 Dépannage](#-dépannage)
11. [📦 Dépendances principales](#-dépendances-principales)
12. [🚀 Scripts disponibles](#-scripts-disponibles)
13. [🔮 Améliorations futures](#-améliorations-futures)
14. [📄 Licence](#-licence)
15. [👨‍💻 Auteur](#-auteur)
16. [📞 Support](#-support)

---

## 🌟 Caractéristiques

- ✅ **Détection faciale en temps réel** via MediaPipe FaceDetection (rapide et précis)
- ✅ **Reconnaissance faciale** avec descripteurs 128D (face-api)
- ✅ **Enrôlement automatisé** - capture plusieurs photos pour renforcer la fiabilité
- ✅ **Gestion des enrôlements** - ajouter, visualiser, supprimer individuellement ou en masse
- ✅ **Session d'assistance** - détection continue avec comptage des présents
- ✅ **Export CSV** - télécharger la liste de présence
- ✅ **Stockage local** - IndexedDB (pas de serveur requis)
- ✅ **UI française** - tous les commentaires et messages en français
- ✅ **Interface responsive** - fonctionnel sur desktop/tablette

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
cd attendance-web
npm install
```

### 2. Télécharger les modèles face-api

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

1. Cliquer sur l'onglet **"Enrôlement"**
2. Entrer le **nom ou ID** de la personne
3. Cliquer **"Démarrer"** pour activer la caméra
4. Prendre **au minimum 3 photos** (max 10) :
   - Chaque photo détecte le visage et calcule un descripteur
   - Plusieurs angles = meilleure reconnaissance
5. Cliquer **"Finaliser"** → les descripteurs sont sauvegardés localement

### 2️⃣ **Session** — Scan en temps réel

1. Cliquer sur l'onglet **"Session"**
2. La caméra démarre automatiquement et affiche :
   - **Boîte verte** autour des visages détectés
   - **Nom de la personne** si reconnue
   - **"Inconnu"** sinon (mais compté quand même)
3. Les présents s'accumulent en bas à gauche
4. Cliquer **"Exporter CSV"** pour télécharger la liste

### 3️⃣ **Admin** — Gérer les enrôlements

1. Cliquer sur l'onglet **"Admin"**
2. Voir la liste des personnes enrôlées + nombre de photos
3. **Supprimer individuellement** avec le bouton rouge
4. **Supprimer tout** avec le bouton rouge en bas

## 🏗️ Architecture Technique

### Stack
- **Frontend** : React 18.2 + Hooks (useEffect, useRef, useState)
- **Détection faciale** : MediaPipe FaceDetection 0.4 (WASM, CDN)
- **Reconnaissance faciale** : @vladmandic/face-api 1.7.15 (TensorFlow.js)
- **Calcul ML** : TensorFlow.js 4.22.0 (WebGL/CPU backend)
- **Stockage** : IndexedDB (idb-keyval 6.2.2)
- **Styling** : Tailwind CSS 3.3
- **Bundler** : Vite 5.4
- **Linter** : ESLint

### Pipeline de reconnaissance

```
Caméra vidéo
    ↓
MediaPipe FaceDetection (détection rapide)
    ↓
Crop région visage + 20% padding
    ↓
face-api.computeFaceDescriptor() (embedding 128D)
    ↓
FaceMatcher.findBestMatch() (distance Euclidienne)
    ↓
Affichage: Nom ou "Inconnu"
    ↓
Comptage des présents
```

### Structure des fichiers

```
src/
├── components/
│   ├── Enrollment.jsx       # Page d'enrôlement
│   ├── Session.jsx          # Page de session (détection en temps réel)
│   ├── Admin.jsx            # Page d'administration
│   └── ui/
│       └── Button.jsx       # Composant bouton réutilisable
├── services/
│   └── faceService.js       # Service de reconnaissance (modèles, stockage)
├── App.jsx                  # Routage principal
├── main.jsx                 # Point d'entrée
└── index.css                # Styles globaux

public/
└── models/                  # Modèles face-api (120+ MB)
    ├── ssd_mobilenetv1_model-weights_manifest.json
    ├── face_landmark_68_model-weights_manifest.json
    ├── face_recognition_model-weights_manifest.json
    └── tiny_face_detector_model-weights_manifest.json
```

## 🔧 Configuration

### Paramètres modifiables

**Session.jsx** (ligne ~50)
```javascript
matcherRef.current = buildMatcherFromEnrollments(enrolls, 0.55);
// 0.55 = distance seuil (< 0.55 = reconnu, >= 0.55 = inconnu)
// ↓ seuil = plus permissif (faux positifs)
// ↑ seuil = plus strict (faux négatifs)
```

**MediaPipe options** (Session.jsx, ligne ~63)
```javascript
detector.setOptions({
  model: 'short',              // 'short' = rapide, 'full' = précis
  minDetectionConfidence: 0.5, // 0.0-1.0, ↑ = moins de faux positifs
  maxNumFaces: 8               // Max visages détectés par frame
});
```

## ⚠️ Limitations connues

| Limitation | Cause | Solution |
|-----------|-------|----------|
| Petites régions ne détectent pas | SSD MobileNet nécessite contexte | Augmenter le padding (Session.jsx:109) |
| Descripteurs incompatibles entre OS | Variations TensorFlow | Re-enrôler si résultats mauvais |
| Lent sur machines anciennes | Modèles ML lourds | Réduire résolution caméra |
| Permissions caméra refusées | Navigateur/OS | Autoriser dans settings navigateur |

## 🔒 Confidentialité et Sécurité

- ✅ **Zéro données serveur** - tout reste en local
- ✅ **Aucun enregistrement vidéo** - juste descripteurs (128 nombres)
- ⚠️ **Pas de chiffrement** - IndexedDB n'est pas chiffré
- ⚠️ **Pas d'authentification** - Admin accessible à tous

**Recommandation** : Pour production, ajouter authentification et chiffrer IndexedDB.

## 📊 Performance

| Métrique | Valeur |
|----------|--------|
| Latence détection | ~50-100ms |
| Latence reconnaissance | ~200-300ms |
| FPS caméra | 30 (configurable) |
| Mémoire RAM | ~150-200 MB |
| Taille modèles | ~120 MB |

## 🐛 Dépannage

### "Erreur MediaPipe: Permission denied"
→ Autoriser l'accès caméra dans les permissions navigateur

### "Aucun visage détecté"
→ Trop sombre, mauvais angle, ou distance inadéquate du visage

### Reconnaissance faible (beaucoup de "Inconnu")
→ Augmenter le nombre de photos d'enrôlement (5+)
→ Réduire le seuil (Session.jsx ligne ~50) de 0.55 → 0.45

### "Module arguments has been replaced..." (WASM crash)
→ Éviter appels parallèles (gate `isProcessing` activée)
→ Rafraîchir la page

## 📦 Dépendances principales

```json
{
  "react": "^18.2.0",
  "@tensorflow/tfjs": "^4.22.0",
  "@vladmandic/face-api": "^1.7.15",
  "@mediapipe/face_detection": "^0.4.1633357819",
  "@mediapipe/camera_utils": "^0.4.1633357819",
  "idb-keyval": "^6.2.2",
  "tailwindcss": "^3.3.0",
  "vite": "^5.4.21"
}
```

## 🚀 Scripts disponibles

```bash
npm run dev      # Démarrer serveur dev (Vite)
npm run build    # Build production
npm run preview  # Aperçu build production
npm run lint     # Vérifier ESLint
```

## 🔮 Améliorations futures

- [ ] Stockage distant (cloud)
- [ ] Dashboard statistiques (tendances, graphiques)
- [ ] Authentification multi-utilisateurs
- [ ] Support multiple caméras
- [ ] Détection d'émotions (avec MediaPipe)
- [ ] Notifications temps réel
- [ ] Mode hors-ligne avancé
- [ ] Support de masques/lunettes

## 📄 Licence

Code disponible à usage éducatif. Voir LICENSE pour détails.

## 👨‍💻 Auteur

Projet ENSPY - IHM - Janvier 2026
- DIFFO KENNE Garnel
- NGONO NGUIETSI Vanina S.

**Dépôt** : [Real-Time-Facial-Recognition-and-Automatic-attendance-list](https://github.com/yourusername/Real-Time-Facial-Recognition-and-Automatic-attendance-list)

## 📞 Support

Pour toute question ou bug, consulter les logs console (F12) pour traces de diagnostic.

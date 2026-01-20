// src/components/ui/Button.jsx

/*
  Composant `Button` réutilisable.
  Props:
  - `children`: contenu du bouton (texte ou éléments React).
  - `onClick`: gestionnaire d'événement au clic.
  - `className`: classes CSS additionnelles (optionnel).
  Ce composant centralise le style des boutons pour une apparence cohérente.
*/
export default function Button({ children, onClick, className = '', ...props }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium shadow-sm transition hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

# IZY Work v2

Compagnon IA terrain premium pour artisans BTP.

## Structure

- **Home** : noyau IA central + 4 modes
- **MY TIME** : dictée vocale → devis automatique
- **MODE IZY** : chat IA conversationnel
- **SOCIÉTÉ** : dashboard avec insights IA
- **ON AIR** : caméra terrain (v2, placeholder)

## Stack

Vite + React 18 + TypeScript + Tailwind + IndexedDB + Web Speech API

## Dev

```bash
npm install
npm run dev
```

## Branche Anthropic (optionnel)

Crée un `.env` avec :

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

Sans clé, MODE IZY tourne en mock et le parser de devis utilise du regex local.

## Déploiement

Netlify détecte le `netlify.toml`. Push GitHub → redéploie auto.

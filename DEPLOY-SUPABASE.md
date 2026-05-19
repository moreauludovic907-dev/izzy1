# 🛡️ Guide de déploiement — IZY Work + Supabase + Anthropic

## ✅ Ce qui est déjà fait dans Supabase
- Compte Supabase + projet "izy-work" créés
- 6 tables avec RLS (profiles, clients, quotes, messages, audit_log, rate_limits)
- Bucket Storage `quote-pdfs` privé + policies
- Secret `ANTHROPIC_API_KEY` configuré

## 🚀 Étape A — Configurer le frontend local

### A.1 — Créer le fichier .env.local

À la **racine du projet** (dans `izy-work-v2/`), crée un fichier nommé exactement **`.env.local`** :

```
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...ta-cle-anon-complete
```

Remplace par les valeurs de ton fichier `cles-izy.txt` :
- URL projet
- Clé anon (publique)

⚠️ **PAS** la clé service_role (jamais dans le frontend).

### A.2 — Installer les dépendances

Dans `cmd` au bon dossier :
```
npm install
```

(Ça va installer `@supabase/supabase-js` en plus.)

### A.3 — Build et test local

```
npm run build
```

## 🚀 Étape B — Déployer les Edge Functions

### Via le dashboard Supabase (le plus simple)

Tu vas créer 3 fonctions, chacune avec UN SEUL fichier `index.ts` (tout est inline, pas de dépendance externe) :

#### Fonction 1 : claude-chat
1. Dashboard Supabase → **Edge Functions** → **"Create a new function"** (ou similaire)
2. Nom de la fonction : **`claude-chat`**
3. Dans l'éditeur, **efface tout** et colle l'intégralité de `supabase/functions/claude-chat/index.ts`
4. **Deploy**

#### Fonction 2 : parse-quote
1. Edge Functions → **"Create a new function"**
2. Nom : **`parse-quote`**
3. Colle `supabase/functions/parse-quote/index.ts`
4. **Deploy**

#### Fonction 3 : route-intent
1. Edge Functions → **"Create a new function"**
2. Nom : **`route-intent`**
3. Colle `supabase/functions/route-intent/index.ts`
4. **Deploy**

### Vérifier que ça marche

Une fois déployées, pour chaque fonction tu auras une URL du type :
`https://xxxxxxx.supabase.co/functions/v1/claude-chat`

Tu peux la tester avec curl, mais c'est plus simple : on va tester en réel via le frontend dans l'étape D.

## 🚀 Étape C — Déployer le frontend sur Netlify

### C.1 — Build
```
npm run build
```
→ crée le dossier `dist/`

### C.2 — Configurer les variables d'env Netlify

⚠️ IMPORTANT : si tu drag-drop le `dist/` sur Netlify Drop, ça marche localement
mais Netlify ne saura PAS où trouver Supabase. Il faut configurer les variables d'env.

**Méthode rapide (Netlify Drop)** :
1. Va sur `app.netlify.com/drop`
2. Glisse-dépose ton dossier `dist`
3. Une fois déployé, va dans **Site settings → Environment variables**
4. Ajoute :
   - `VITE_SUPABASE_URL` = `https://xxxxxxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGc...`
5. Trigger un nouveau deploy : **Deploys → Trigger deploy → Clear cache and deploy site**

**Mieux** : connecter ton repo GitHub à Netlify (build auto). Mais ça on verra plus tard.

## 🚀 Étape D — Test

1. Ouvre ton URL Netlify
2. Crée un **nouveau compte** (ton ancien compte localStorage est obsolète)
3. Vérifie ton email pour le lien de confirmation (Supabase par défaut)
4. Connecte-toi
5. Fais l'onboarding (métier, besoins, ton IZY, entreprise)
6. Va dans MODE IZY → pose une vraie question → Claude doit répondre
7. Va dans MY TIME → dicte un devis → Claude doit le parser intelligemment

## 🔐 Vérifications sécurité

Une fois tout en ligne, vérifie :
- Dans le frontend (F12 → Network), tu ne dois JAMAIS voir la clé Anthropic
- Tu dois voir des appels à `/functions/v1/claude-chat` (pas à `api.anthropic.com`)
- Si tu te déconnectes et essaies de re-toucher ces endpoints sans token → 401

## 💰 Suivi des coûts

- **Anthropic** : va sur `console.anthropic.com → Usage` pour voir tes dépenses
- **Supabase** : tu es en plan Free, 500k Edge Function calls/mois inclus. Largement assez.

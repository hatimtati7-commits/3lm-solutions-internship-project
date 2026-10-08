# Documentation — Module 5 : Messagerie multicanal & Notifications

Service NestJS gérant l'envoi de notifications multicanal (SMS, WhatsApp, Email, Messenger, Chat Web) pour la Secrétaire Médicale IA, avec planification automatique, templates réutilisables, bascule entre canaux (fallback), suivi/monitoring et liens sécurisés pour l'envoi de documents.

## Table des matières

1. [Procédures de configuration](#1-procédures-de-configuration)
2. [Référence de l'API REST](#2-référence-de-lapi-rest)
3. [Chat Web (Socket.io)](#3-chat-web-socketio)
4. [Guide de dépannage](#4-guide-de-dépannage)

---

## 1. Procédures de configuration

### 1.1 Variables d'environnement (`.env`)

Créer un fichier `.env` à la racine du projet :

```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
TWILIO_WHATSAPP_NUMBER=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=...
REDIS_HOST=localhost
REDIS_PORT=6379
MESSENGER_PAGE_ACCESS_TOKEN=...
MESSENGER_VERIFY_TOKEN=...
PUBLIC_BASE_URL=http://localhost:3000
JWT_SECRET=...   # doit être identique au secret du Core (Module 1)
```

⚠️ Ce fichier est volontairement exclu de Git (`.gitignore`) — ne jamais commiter de vraies clés.

### 1.2 Twilio (SMS & WhatsApp)

1. Créer un compte sur [twilio.com](https://www.twilio.com) et récupérer `Account SID` et `Auth Token` depuis la console.
2. Acheter/configurer un numéro Twilio pour le SMS (`TWILIO_PHONE_NUMBER`).
3. Pour WhatsApp en développement : activer le **sandbox WhatsApp** (Console Twilio > Messaging > Try it out > Send a WhatsApp message). Le numéro de test par défaut est `+14155238886`.
4. Chaque destinataire doit envoyer le message `join <code-sandbox>` au numéro Twilio pour recevoir des messages (la session expire après ~72h d'inactivité et doit être renouvelée).
5. En production, il faut passer par la **WhatsApp Business API officielle** (vérification d'entreprise requise auprès de Meta).

### 1.3 SendGrid (Email)

1. Créer un compte sur [sendgrid.com](https://sendgrid.com).
2. Vérifier un expéditeur : Settings > Sender Authentication > **Verify a Single Sender** (suffisant pour le développement ; l'authentification de domaine complète est recommandée en production).
3. Générer une clé API : Settings > API Keys > Create API Key > **Full Access**.
4. Renseigner `SENDGRID_API_KEY` et `SENDGRID_FROM_EMAIL` (doit correspondre exactement à l'adresse vérifiée).

### 1.4 Redis (BullMQ)

Nécessaire pour la planification des rappels (confirmation, J-1, H-2).

- **Windows** : installer [Memurai](https://www.memurai.com/get-memurai) (alternative Redis native), qui tourne comme service sur le port 6379.
- **Linux/Mac** : `redis-server` ou via Docker (`docker run -d -p 6379:6379 redis`).

### 1.5 Facebook Messenger

1. Créer une Page Facebook et une App sur [developers.facebook.com](https://developers.facebook.com).
2. Ajouter le produit **Messenger** à l'App.
3. Dans "Paramètres de Messenger API" :
   - Générer un token d'accès pour la Page → `MESSENGER_PAGE_ACCESS_TOKEN`.
   - Configurer le webhook avec l'URL `https://<votre-domaine>/messenger/webhook` et un `MESSENGER_VERIFY_TOKEN` de votre choix.
   - S'abonner au minimum au champ `messages`.
4. En développement local, utiliser un tunnel ([ngrok](https://ngrok.com)) pour exposer `localhost` en HTTPS public : `ngrok http 3000`.

### 1.6 Lancement du projet

```bash
npm install
npm run start:dev
```

---

## Authentification (JWT partagé avec le Core)

Les endpoints d'administration et d'envoi sont protégés par le **JWT émis par le Core (Module 1)**. Le service utilise la même stratégie Passport (`passport-jwt`) et le même secret partagé (`JWT_SECRET`) : un token valide émis par le Core est accepté tel quel.

Envoyer le token dans l'en-tête de chaque requête :
```
Authorization: Bearer <token_jwt>
```

| Protégé par JWT | Public (sans JWT) |
|---|---|
| `/notification/*`, `/channel-manager/*`, `/reminder/*`, `/templates/*`, `/dashboard/*`, `POST /documents/notify` | `GET/POST /messenger/webhook` (appelé par Meta), `GET /documents/access/:token` (lien ouvert par le patient, protégé par son propre jeton), WebSocket du chat (widget patient) |

Le payload attendu est `{ sub, email, role }` ; l'utilisateur authentifié est disponible dans `req.user` sous la forme `{ userId, email, role }`.

## 2. Référence de l'API REST

### 2.1 Notifications directes (`/notification`)

Envoi direct sur un canal précis, sans planification ni fallback.

| Méthode | Route | Description |
|---|---|---|
| POST | `/notification/send` | Notification interne, juste enregistrée (pas d'envoi externe) |
| POST | `/notification/send-sms` | Envoi SMS via Twilio |
| POST | `/notification/send-whatsapp` | Envoi WhatsApp via Twilio |
| POST | `/notification/send-email` | Envoi Email via SendGrid |
| POST | `/notification/send-messenger` | Envoi via Facebook Messenger |

**Exemple — `POST /notification/send-whatsapp`**
```json
{ "userId": "patient-123", "to": "+212600000000", "message": "Bonjour !" }
```

### 2.2 Gestionnaire multicanal (`/channel-manager`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/channel-manager/send-with-fallback` | Essaie les canaux dans l'ordre, bascule automatiquement si un canal échoue |

**Exemple**
```json
{
  "userId": "patient-123",
  "message": "Votre RDV est confirmé",
  "subject": "Confirmation RDV",
  "contactInfo": { "phoneNumber": "+212600000000", "emailAddress": "patient@exemple.com" },
  "channelPriority": ["whatsapp", "sms", "email", "messenger"]
}
```
`channelPriority` est optionnel (ordre par défaut : whatsapp → sms → email → messenger). Seuls les canaux pour lesquels une coordonnée est fournie dans `contactInfo` sont tentés.

### 2.3 Rappels et cycle de vie d'un rendez-vous (`/reminder`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/reminder/schedule-appointment` | Planifie confirmation + rappels J-1/H-2 (messages écrits à la main) |
| POST | `/reminder/schedule-appointment-from-template` | Idem, à partir des templates + variables |
| POST | `/reminder/modify-appointment-from-template` | RDV modifié : annule les anciens rappels, notifie, replanifie pour la nouvelle date |
| POST | `/reminder/cancel-appointment` | Annule les rappels en attente et notifie l'annulation |
| POST | `/reminder/document-available` | Notification immédiate "document disponible" (message libre) |

**Exemple — `POST /reminder/schedule-appointment-from-template`**
```json
{
  "appointmentId": "rdv-001",
  "appointmentDateTime": "2026-11-15T10:00:00.000Z",
  "userId": "patient-123",
  "channel": "whatsapp",
  "to": "+212600000000",
  "variables": {
    "patientName": "Fatima",
    "cabinetName": "Cabinet Dr. Alaoui",
    "appointmentDate": "15/11/2026",
    "appointmentTime": "10h00"
  }
}
```

Les rappels dont l'heure de déclenchement est déjà passée (J-1/H-2) sont automatiquement ignorés.

### 2.4 Templates de messages (`/templates`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/templates` | Liste tous les templates |
| GET | `/templates/:type` | Détail d'un template |
| PUT | `/templates/:type` | Crée/modifie le template d'un type |
| POST | `/templates/:type/preview` | Aperçu du rendu (sans rien envoyer) |

Types disponibles : `confirmation`, `reminder_j1`, `reminder_h2`, `cancellation`, `modification`, `document_available`.
Variables dans le texte : syntaxe `{{nomDeLaVariable}}`.

**Exemple — `POST /templates/confirmation/preview`**
```json
{ "variables": { "patientName": "Fatima", "cabinetName": "Cabinet Dr. Alaoui", "appointmentDate": "15/11/2026", "appointmentTime": "10h00" } }
```

### 2.5 Documents et liens sécurisés (`/documents`)

| Méthode | Route | Description |
|---|---|---|
| POST | `/documents/notify` | Génère un lien sécurisé temporaire et notifie le patient (canal préféré + fallback) |
| GET | `/documents/access/:token` | Point d'accès public : valide le jeton puis redirige vers le document |

**Exemple — `POST /documents/notify`**
```json
{
  "userId": "patient-123",
  "documentName": "Ordonnance du 12/11",
  "fileUrl": "https://stockage-interne/ordonnance-123.pdf",
  "preferredChannel": "whatsapp",
  "contactInfo": { "phoneNumber": "+212600000000", "emailAddress": "patient@exemple.com" },
  "variables": { "patientName": "Fatima", "cabinetName": "Cabinet Dr. Alaoui" },
  "expiresInHours": 72
}
```

Le lien généré (`http://<domaine>/documents/access/<jeton>`) expire après la durée indiquée (72h par défaut) et redirige ensuite vers une page d'erreur plutôt que vers le document.

### 2.6 Messenger — Webhook (`/messenger`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/messenger/webhook` | Vérification du webhook par Meta (configuration, une seule fois) |
| POST | `/messenger/webhook` | Réception des messages envoyés par les utilisateurs à la Page |

Les messages reçus sont persistés dans `incoming_messenger_messages` (audit).

### 2.7 Tableau de bord administrateur (`/dashboard`)

| Méthode | Route | Description |
|---|---|---|
| GET | `/dashboard/notifications` | Liste paginée et filtrée (date, canal, patient, statut) |
| GET | `/dashboard/notifications/:id` | Détail d'une notification |
| POST | `/dashboard/notifications/:id/retry` | Relance un envoi échoué |
| GET | `/dashboard/stats` | Statistiques par canal (total, envoyés, échecs, taux de réussite) |

Filtres disponibles sur `GET /dashboard/notifications` : `startDate`, `endDate`, `channel`, `userId`, `status`, `page`, `limit` (paramètres de requête).

Interface web correspondante : `admin-dashboard.html` (page statique à ouvrir dans un navigateur, serveur lancé sur le port 3000).

---

## 3. Chat Web (Socket.io)

Connexion WebSocket sur le même port que l'API (`3000` par défaut).

| Événement (client → serveur) | Payload | Description |
|---|---|---|
| `joinConversation` | `{ conversationId }` | Rejoint une conversation et reçoit son historique |
| `sendMessage` | `{ conversationId, senderId, senderType, message }` | Envoie un message, diffusé en temps réel |

| Événement (serveur → client) | Payload | Description |
|---|---|---|
| `conversationHistory` | `ChatMessage[]` | Historique complet à la connexion |
| `newMessage` | `ChatMessage` | Nouveau message reçu par tous les membres de la conversation |

`senderType` : `patient` \| `secretary` \| `ai`.

Widget intégrable : `public/widget.js` — à inclure sur le site d'un cabinet via une balise `<script>` :
```html
<script src="http://<domaine>/widget.js" data-server-url="http://<domaine>" data-cabinet-name="Cabinet Dr. Alaoui"></script>
```

---

## 4. Guide de dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `ECONNREFUSED` sur Redis au démarrage | Memurai/Redis non démarré | Vérifier avec `sc query Memurai` (Windows) et démarrer le service |
| Email : erreur `Unauthorized` | Clé SendGrid invalide/expirée, ou expéditeur non vérifié | Régénérer la clé API, vérifier `SENDGRID_FROM_EMAIL` |
| WhatsApp : erreur `63016` (hors fenêtre de messagerie) | Plus de 24h depuis le dernier message du destinataire au sandbox | Renvoyer `join <code>` au numéro sandbox pour rouvrir la fenêtre |
| `API key does not start with "SG."` au démarrage | `.env` contient encore le placeholder (souvent après extraction d'un nouveau zip, `.env` n'est jamais inclus) | Remettre la vraie clé dans `.env` et redémarrer le serveur |
| Modifications de `.env` sans effet | Le process Node ne relit pas `.env` après son démarrage | Arrêter (Ctrl+C) puis relancer `npm run start:dev` |
| `admin-dashboard.html` : "Impossible de contacter le serveur" | CORS non activé, ou serveur arrêté | Vérifier que `app.enableCors()` est bien présent dans `main.ts` et que le serveur tourne |
| Messenger : le bouton "Test" de Facebook ne déclenche rien | Limitation connue du mode développeur de l'App Facebook | Tester directement le webhook avec `curl -X POST http://localhost:3000/messenger/webhook ...` |
| Push GitHub bloqué (`GH013`, secrets détectés) | Une vraie clé API a été commitée (ex: collée dans le README) | Remplacer la valeur par un placeholder, puis `git commit --amend --no-edit` avant de repousser |

# Guide d'installation — Portail LSI Maintenance

Ce guide explique comment installer le portail sur un serveur VPS, pas à pas.  
Durée estimée : **15 à 20 minutes**.

---

## Avant de commencer

Préparez les éléments suivants avant de lancer l'installation.

### Indispensables

| Élément | Exemple | Où l'obtenir |
|---|---|---|
| Adresse IP du VPS | `51.83.12.45` | Email de votre hébergeur (OVH, Ionos…) |
| Mot de passe root du VPS | — | Email de votre hébergeur |
| Nom de domaine configuré | `portail.lsi-maintenance.fr` | Votre bureau d'enregistrement de domaine |
| Adresse e-mail | `admin@lsi-maintenance.fr` | — |

> **Important — DNS :** le nom de domaine doit pointer vers l'IP du VPS **avant** de lancer l'installation. Sans cela, le certificat SSL (cadenas vert dans le navigateur) ne pourra pas être créé. La propagation DNS peut prendre jusqu'à 24 h selon votre hébergeur de domaine.

### Optionnels (peuvent être ajoutés plus tard)

| Service | À quoi ça sert | Ce qu'il faut préparer |
|---|---|---|
| **Mailgun** | Envoi d'e-mails depuis le portail | Clé API, domaine Mailgun, email notifications interne |
| **Desk365** | Gestion des tickets de support | Sous-domaine + clé API |
| **Comet Backup** | Suivi des sauvegardes | URL serveur + identifiants admin |
| **Wasabi S3** | Stockage de fichiers | Access Key + Secret Key |
| **Axonaut** | Synchronisation CRM | Clé API |
| **DocuSeal** | Signature électronique des bons | Clé API (console.docuseal.eu) |
| **Tactical RMM** | Supervision des postes clients | URL de l'API + clé API |

---

## Étape 1 — Se connecter au VPS

Vous avez besoin d'un terminal SSH. Selon votre système :

- **Windows** : ouvrez **PowerShell** ou **Windows Terminal**
- **Mac / Linux** : ouvrez le **Terminal**

Tapez la commande suivante en remplaçant `51.83.12.45` par l'IP de votre VPS :

```
ssh root@51.83.12.45
```

Entrez le mot de passe root quand il est demandé (les caractères n'apparaissent pas à l'écran, c'est normal).

---

## Étape 2 — Récupérer les fichiers du portail

Une fois connecté au VPS, téléchargez les fichiers depuis GitHub :

```
git clone https://github.com/LSIParis/thor.git /opt/lsi
cd /opt/lsi
```

> Si `git` n'est pas disponible : `apt install -y git` puis recommencez.

---

## Étape 3 — Lancer l'installation

Exécutez le script d'installation :

```
sudo bash install.sh
```

Le script va vous poser des questions. Détail de chaque étape ci-dessous.

---

## Détail des étapes du script

### Étape 1/6 — Vérification de Docker

Le script installe **Docker** automatiquement s'il n'est pas déjà présent.  
Vous n'avez rien à faire.

---

### Étape 2/6 — Configuration

#### Nom de domaine

```
Nom de domaine du portail (exemple : portail.mon-entreprise.fr) :
```

Saisissez le nom de domaine exact qui pointera vers ce serveur.  
Exemple : `portail.lsi-maintenance.fr`

Le script vérifie ensuite que le domaine pointe bien vers ce serveur.

- Si la vérification réussit → l'installation continue.
- Si le domaine ne pointe pas encore → un avertissement s'affiche. Vous pouvez continuer, mais le certificat SSL échouera à l'étape 5. Il est préférable d'attendre que les DNS soient propagés et de relancer `sudo bash install.sh`.

#### Adresse e-mail

```
Votre adresse e-mail [admin@lsi-maintenance.fr] :
```

Cette adresse sera utilisée pour les alertes du certificat SSL (renouvellement, expiration).  
Appuyez sur **Entrée** pour utiliser la valeur entre crochets, ou tapez votre adresse.

---

#### Intégrations optionnelles

Pour chaque intégration, **appuyez sur Entrée** pour l'ignorer si vous n'avez pas la clé.  
Elle pourra être ajoutée plus tard en éditant le fichier `.env`.

---

**Email (Mailgun)**

```
Clé API Mailgun :
```
Copiez-collez la clé API Mailgun. Si vous l'ignorez, les e-mails ne seront pas envoyés.

Si vous saisissez la clé, trois questions supplémentaires s'affichent :

```
Domaine Mailgun [mg.lsi-maintenance.fr] :
```
Le sous-domaine Mailgun configuré dans votre compte. Appuyez sur Entrée pour la valeur par défaut.

```
Nom de l'expéditeur [LSI Maintenance <noreply@mg.lsi-maintenance.fr>] :
```
Le nom et l'adresse qui apparaîtront dans les e-mails envoyés par le portail. Appuyez sur Entrée pour la valeur par défaut.

```
Email interne LSI pour les notifications [contact@lsi-maintenance.fr] :
```
L'adresse e-mail interne LSI qui recevra les alertes et notifications du portail. Appuyez sur Entrée pour la valeur par défaut.

---

**Tickets (Desk365)**

```
Sous-domaine Desk365 (ex: lsi-maintenance) :
```
La partie avant `.desk365.io` dans votre URL Desk365.  
Si vous saisissez une valeur, la clé API vous sera demandée ensuite.

---

**Sauvegardes (Comet Backup)**

```
URL du serveur Comet (ex: https://backup.mon-domaine.fr) :
```
L'URL complète de votre serveur Comet Backup.  
Les identifiants administrateur vous seront demandés ensuite.  
Le mot de passe ne s'affiche pas à l'écran lors de la saisie.

---

**Stockage fichiers (Wasabi S3)**

```
Access Key Wasabi :
```
La clé d'accès de votre compte Wasabi.  
La clé secrète vous sera demandée ensuite (ne s'affiche pas à l'écran).

---

**CRM (Axonaut)**

```
Clé API Axonaut :
```
La clé API de votre compte Axonaut.

---

**Signature électronique (DocuSeal)**

```
Clé API DocuSeal :
```
Récupérez cette clé sur [console.docuseal.eu](https://console.docuseal.eu) → Settings → API.

```
URL API DocuSeal [https://api.docuseal.eu] :
```
Laissez la valeur par défaut (appuyez sur Entrée) sauf si vous utilisez DocuSeal en mode auto-hébergé.

---

**Supervision (Tactical RMM)**

```
URL de l'API Tactical RMM :
```
L'URL de l'**API** de votre serveur Tactical RMM — pas l'interface web.  
Exemple : `https://api.mon-rmm.fr` (commence généralement par `api.`).  
Si vous saisissez une valeur, la clé API vous sera demandée ensuite (ne s'affiche pas à l'écran).

---

### Étape 3/6 — Génération des clés de sécurité

Le script génère automatiquement des mots de passe complexes pour :
- la base de données
- le système d'authentification
- le chiffrement des données

Vous n'avez rien à faire. Toutes ces clés sont sauvegardées dans le fichier `.env`.

---

### Étape 4/6 — Construction de l'application

```
Cette étape prend 5 à 10 minutes selon la vitesse du serveur...
```

Des points s'affichent pendant la construction. C'est normal, attendez.

Si la construction échoue, un message d'erreur s'affiche. Notez-le et contactez le support.

---

### Étape 5/6 — Certificat SSL

Le script obtient automatiquement un certificat SSL (HTTPS) via **Let's Encrypt**.

- **Si ça réussit** → un message vert confirme.
- **Si ça échoue** → causes possibles :
  - Le domaine ne pointe pas encore vers ce serveur (DNS non propagés)
  - Le port 80 est bloqué par le pare-feu de votre hébergeur

  Dans ce cas, vous pouvez continuer sans SSL et relancer `sudo bash install.sh` une fois le problème résolu.

---

### Étape 6/6 — Démarrage du portail

Le script démarre tous les services, attend que l'application soit prête (1 à 2 minutes), puis crée automatiquement :

- le **compte administrateur** (`admin@lsi-maintenance.fr`)
- la **configuration Tactical RMM** en base de données (si vous l'avez renseigné)

---

## Résultat de l'installation

À la fin du script, les informations suivantes s'affichent :

```
Votre portail est accessible sur :
https://portail.lsi-maintenance.fr

Connexion initiale :
Email        : admin@lsi-maintenance.fr
Mot de passe : Admin1234!
```

> **⚠ IMPORTANT : Changez le mot de passe dès votre première connexion.**

Les détails sont également sauvegardés dans le fichier `install-info.txt` dans le dossier du projet.

---

## Si vous avez configuré DocuSeal

Une étape manuelle est nécessaire après l'installation :

1. Rendez-vous sur [console.docuseal.eu/webhooks](https://console.docuseal.eu/webhooks)
2. Cliquez sur **Add webhook**
3. Renseignez :
   - **URL** : `https://votre-domaine.fr/api/docuseal/webhook`
   - **Événement** : `form.completed`
4. Sauvegardez

Sans cette étape, les bons signés ne seront pas automatiquement enregistrés sur le serveur.

---

## Après l'installation

### Première connexion

1. Ouvrez votre navigateur sur `https://votre-domaine.fr`
2. Connectez-vous avec `admin@lsi-maintenance.fr` / `Admin1234!`
3. Allez dans **Paramètres → Profil** et changez le mot de passe

### Mettre à jour le portail

```
cd /opt/lsi
sudo bash update.sh
```

---

## En cas de problème

### Voir les logs de l'application

```
cd /opt/lsi
docker compose -f docker-compose.portainer.yml -p lsi logs -f app
```

Appuyez sur `Ctrl+C` pour arrêter l'affichage des logs.

### Redémarrer le portail

```
cd /opt/lsi
docker compose -f docker-compose.portainer.yml -p lsi restart
```

### Relancer l'installation depuis le début

Le script peut être relancé sans risque si quelque chose s'est mal passé :

```
cd /opt/lsi
sudo bash install.sh
```

### Contacter le support

Fournissez :
- Le message d'erreur exact affiché dans le terminal
- Les logs de l'application (voir ci-dessus)

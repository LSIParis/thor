# OVH DNS Integration — Design Spec

**Date :** 2026-06-04
**Statut :** Approuvé
**Périmètre :** Redesign de l'onglet DNS — synchronisation des zones et enregistrements depuis l'API OVH par client

---

## 1. Contexte

L'onglet DNS actuel propose une gestion manuelle des zones + un import via Google DoH. Le nouveau design ajoute une intégration directe avec l'API OVH (par client), qui interroge les NS autoritaires de chaque zone pour obtenir les enregistrements réels.

---

## 2. Modèle de données

### OvhConfig (nouveau)
```
id                String    @id @default(cuid())
clientId          String    @unique
endpoint          String    @default("ovh-eu")   // ovh-eu | ovh-ca | ovh-us
applicationKey    String
applicationSecret String    // chiffré AES-256
consumerKey       String    // chiffré AES-256
lastSyncAt        DateTime?
createdAt         DateTime  @default(now())
client            Client    @relation(...)
```

### DnsZone (existant — 2 champs ajoutés)
```
source       String   @default("manual")   // "ovh" | "manual"
ovhZoneName  String?  // nom exact retourné par GET /domain/zone
```

### DnsRecord (existant — aucun changement)

---

## 3. Authentification OVH (HMAC-SHA1)

```
timestamp  = unix epoch (secondes)
toSign     = appSecret + "+" + consumerKey + "+" + METHOD + "+" + fullUrl + "+" + body + "+" + timestamp
// body = "" pour les requêtes GET
signature  = "$1$" + SHA1(toSign)

Headers :
  X-Ovh-Application  : applicationKey
  X-Ovh-Consumer     : consumerKey
  X-Ovh-Timestamp    : timestamp
  X-Ovh-Signature    : signature
```

Base URL selon endpoint :
- `ovh-eu` → `https://eu.api.ovh.com/1.0`
- `ovh-ca` → `https://ca.api.ovh.com/1.0`
- `ovh-us` → `https://api.us.ovhcloud.com/1.0`

Implémentation dans `src/lib/ovh-client.ts`.

---

## 4. Flux de synchronisation

Route : `POST /api/ovh/[clientId]/sync`

### Étapes
1. Charger `OvhConfig` du client → déchiffrer `applicationSecret` et `consumerKey`
2. `GET https://eu.api.ovh.com/1.0/domain/zone` → tableau de noms de zones (ex: `["lsiparis.fr", "lsiparis.com"]`)
3. Pour chaque zone en parallèle :
   a. `GET /domain/zone/{zone}` → champ `nameServers[]` (NS autoritaires)
   b. Créer un `dns.Resolver` Node.js avec ces NS
   c. Requêtes en parallèle pour tous les types : `A, AAAA, CNAME, MX, TXT, NS, CAA, SRV`
   d. Agréger les résultats
4. **Upsert** DnsZone (`source=ovh`, `ovhZoneName`, `nameservers`) dans la DB
5. **Remplacer** les DnsRecords de chaque zone OVH (delete + createMany)
6. **Supprimer** les DnsZones OVH qui n'apparaissent plus dans la liste OVH
7. Mettre à jour `OvhConfig.lastSyncAt`
8. Retourner `{ zones: N, records: M, errors: [] }`

### Gestion d'erreurs
- Zone inaccessible (NS timeout) : signalée dans `errors[]`, non bloquante
- Credentials invalides (401 OVH) : retourner 401 avec message clair
- Endpoint OVH injoignable : retourner 502

---

## 5. Endpoints OVH utilisés

| Méthode | Path | Usage |
|---|---|---|
| GET | `/domain/zone` | Liste toutes les zones du compte |
| GET | `/domain/zone/{zone}` | Nameservers de la zone |

Les enregistrements sont récupérés **directement sur les NS autoritaires** via `dns.Resolver`, pas via l'API OVH (plus fiable, reflète l'état réel du DNS).

---

## 6. Interface utilisateur

### État 1 — Pas de config OVH

Bandeau en haut de l'onglet DNS :
```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 Connecter un compte OVH pour synchroniser les domaines     │
│  Endpoint [ovh-eu ▾]  App Key [____]  App Secret [••••]        │
│  Consumer Key [••••]                [Connecter & Synchroniser] │
└─────────────────────────────────────────────────────────────────┘
```
La gestion manuelle des zones reste disponible en dessous.

### État 2 — Config OVH présente

Bandeau compact :
```
┌────────────────────────────────────────────────────────────────┐
│ ✅ OVH connecté · Dernière sync : il y a 5 min               │
│ 3 zones · 47 enregistrements          [↻ Synchroniser] [⚙]  │
└────────────────────────────────────────────────────────────────┘
```
- **[↻ Synchroniser]** : déclenche `POST /api/ovh/[clientId]/sync`
- **[⚙]** : modal pour modifier ou supprimer les credentials OVH

### Affichage des zones

- Zones `source=ovh` : badge **OVH** (teal), lecture seule — pas de bouton Supprimer/Ajouter enregistrement, tooltip "Géré via OVH"
- Zones `source=manual` : badge **Manuel**, gestion complète (actuel)
- Les deux types coexistent, triés alphabétiquement

### Composants

```
src/components/dns/
├── ovh-connect-banner.tsx   ← formulaire credentials (état 1)
├── ovh-status-banner.tsx    ← bandeau sync (état 2)
└── dns-panel.tsx            ← modifié : intègre les deux banners
```

---

## 7. Actions serveur

```
src/actions/ovh.ts
├── saveOvhConfig(clientId, formData)   ← créé/modifie OvhConfig + lance sync
└── deleteOvhConfig(clientId)           ← supprime config (zones OVH restent)
```

---

## 8. Contraintes non-fonctionnelles

- `applicationSecret` et `consumerKey` chiffrés AES-256 (même fonction `encrypt/decrypt` existante)
- La sync est déclenchée manuellement (pas de cron)
- Les zones OVH sont en lecture seule dans Thor — la source de vérité est OVH
- Si l'API OVH est indisponible, les données existantes en base restent affichées
- Les zones manuelles ne sont jamais supprimées par une sync OVH

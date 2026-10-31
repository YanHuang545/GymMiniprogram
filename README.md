# Ranlian (燃练)

WeChat mini program that books gym classes **without an ICP-filed API domain**.

The client never talks to Aliyun. A **Tencent Cloud function** (`wx.cloud.callFunction`) HTTP-forwards to an **unfiled** host, and **Express on Aliyun** is the only process that touches **Baota MySQL**.

| | |
| --- | --- |
| AppID | `wx777a79a5b8dcaaac` |
| Cloud env | `cloud1-d9geo9d5d2420afe8` |
| Unfiled origin | `gymbackend.chuckrock.dpdns.org` |
| Express | `backend/` on Aliyun 轻量 — **still the real API** |
| MySQL | Baota on the same instance — **cloud functions do not run SQL** |

---

## A booking, end to end

Phone → Tencent `apiProxy` → unfiled Aliyun hostname → Nginx → Express → MySQL.

```mermaid
flowchart TB
  subgraph Phone["WeChat trial / phone"]
    Page["pages/*/confirm, slots, class"]
    API["frontend/utils/api.js requestCloud"]
  end

  subgraph Tencent["Tencent Cloud Base"]
    CF["cloud function apiProxy"]
    Seed["cloud function seedPhotos"]
    CS["cloud storage cloud:// covers"]
  end

  subgraph Aliyun["Aliyun — no ICP on this hostname"]
    Host["gymbackend.chuckrock.dpdns.org"]
    NGX["Baota Nginx :80"]
    EX["backend Express :3000"]
    DB["Baota MySQL"]
    JPG["backend/public/oss-photos"]
  end

  Page -->|"api.post /api/checkout"| API
  API -->|"wx.cloud.callFunction name apiProxy"| CF
  CF -->|"http.request HTTP first"| Host
  Host --> NGX --> EX
  EX -->|"mysql2"| DB
  EX -->|"JSON order / bootstrap"| CF
  CF -->|"res.result"| API

  API -->|"callFunction seedPhotos once"| Seed
  Seed -->|"HTTP GET /oss-photos/*.jpg"| JPG
  Seed -->|"uploadFile"| CS
  API -->|"rewritePublicUrls"| CS
```

```mermaid
sequenceDiagram
  participant Phone as WeChat client
  participant CF as Tencent apiProxy
  participant EX as Aliyun Express
  participant DB as Aliyun MySQL

  Phone->>CF: callFunction({ method, path, data, userId })
  Note over Phone,CF: legal-domain list does not apply
  CF->>EX: HTTP gymbackend.chuckrock.dpdns.org + path
  EX->>DB: SELECT / INSERT bookings, orders
  DB-->>EX: rows
  EX-->>CF: { ok, data }
  CF-->>Phone: res.result
```

`wx.cloud.callFunction` sends `name` + `data` (WeChat Cloud docs). Express mounts `/api` and `listen`s (Express `app.use` / `app.listen`). The function is a Node `http.request` proxy — it does not `require` `backend/`.

| Hop | File |
| --- | --- |
| Wait for cloud, then bootstrap | `frontend/app.js` → `prepareCloud()` then `api.get('/api/bootstrap')` |
| Phone vs simulator split | `frontend/utils/api.js` → `request()` / `requestCloud()` |
| Env id | `frontend/utils/cloud-config.js` |
| HTTP forward, no SQL | `frontend/cloudfunctions/apiProxy/index.js` → `HOST` + `requestUpstream()` |
| Cover copies | `frontend/cloudfunctions/seedPhotos/index.js` |
| Rewrite `https://gymbackend.../oss-photos/` → `cloud://` | `frontend/utils/api.js` → `rewritePublicUrls()` |
| Express + static photos | `backend/src/index.js` → `/api`, `/oss-photos`, `/health` |
| Routes + mock pay | `backend/src/routes.js` |
| Pool | `backend/src/db.js` |

---

## Why the phone cannot hit Express itself

```mermaid
flowchart LR
  subgraph Blocked["Trial / release client"]
    WX["wx.request or image HTTPS"]
  end
  subgraph Origin["gymbackend.chuckrock.dpdns.org"]
    TLS["Aliyun RST on TLS 1.2 + SNI"]
  end
  subgraph OK["Tencent function"]
    HTTP["Node http.request HTTP"]
  end

  WX -->|"http blocked; https -101"| TLS
  HTTP -->|"server to server, no ICP list"| Origin
```

- Trial/release: HTTPS only, legal-domain check always on. `*.dpdns.org` cannot be ICP-filed, so it cannot be added as a request domain.
- WeChat Cronet uses TLS 1.2 + SNI. Aliyun resets that on this unfiled host (`-101` / `ERR_CONNECTION_RESET`). Browser TLS 1.3 succeeding does not prove WeChat can connect.
- Cloud-function outbound HTTPS to the same host also `ECONNRESET`. `apiProxy` therefore uses **HTTP first**.

Domain and Node are **not retired**. Only the *client* stopped calling them.

---

## Two runtimes

```mermaid
flowchart TB
  subgraph DevTools["WeChat DevTools"]
    D1["wx.request HTTP"]
    D2["image HTTP /oss-photos"]
  end
  subgraph Trial["Trial / real device"]
    T1["callFunction apiProxy"]
    T2["image cloud://"]
  end
  EX["Aliyun Express + MySQL"]

  D1 --> EX
  D2 --> EX
  T1 --> EX
  T2 -.->|"seedPhotos copied once"| EX
```

Open the `frontend` folder in DevTools, not the repo root.

```text
GymMiniprogram/
  frontend/                 DevTools project
    utils/api.js            split above
    cloudfunctions/         deploy separately; not packed into the mini program
  backend/                  Express on Baota
    public/oss-photos/      JPEG source of truth
```

---

## Run

1. Keep Baota Node (`gymbackend`) and MySQL up.
2. DevTools → `frontend` → skip legal-domain / TLS checks (**DevTools only**).
3. After function edits: right-click `apiProxy` / `seedPhotos` → upload and deploy.
4. Trial: toolbar Upload. First open runs `seedPhotos`.
5. Share works only for Experience members until a reviewed release.

Do not commit `backend/.env`.

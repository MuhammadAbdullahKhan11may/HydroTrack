<div align="center">

# 💧 HydroTrack

### A Full-Stack Hydration Tracking Platform

Track daily hydration, personalize goals, visualize progress, and securely persist your data across sessions.

<br>

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_HydroTrack-2ea44f?style=for-the-badge)](https://hydrotrack-ydrg.onrender.com/)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Deployment](https://img.shields.io/badge/Deployed_on-Render-000000?style=for-the-badge&logo=render&logoColor=white)

<br>

**HTML · CSS · JavaScript · Node.js · Express.js · Prisma · PostgreSQL · JWT · Render**

<br>

[Live Demo](https://hydrotrack-ydrg.onrender.com/) •
[Features](#-features) •
[Architecture](#️-architecture) •
[Security](#-authentication--security) •
[API](#-rest-api) •
[Run Locally](#-running-hydrotrack-locally)

</div>

---

## 🌊 About HydroTrack

HydroTrack is a responsive **full-stack hydration tracking application** that helps users monitor daily water intake, set personalized hydration goals, analyze weekly progress, and maintain hydration history across sessions.

> **From frontend assignment → deployed full-stack application**
>
> HydroTrack began as a responsive frontend assignment and was independently expanded with authentication, REST APIs, PostgreSQL persistence, per-user data isolation, server-side validation, security hardening, and cloud deployment.

<table>
<tr>
<td><b>Frontend</b></td>
<td>HTML, CSS, Vanilla JavaScript</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>Node.js, Express.js</td>
</tr>
<tr>
<td><b>Database</b></td>
<td>PostgreSQL, Prisma, Neon</td>
</tr>
<tr>
<td><b>Authentication</b></td>
<td>JWT, HttpOnly Cookies, bcrypt</td>
</tr>
<tr>
<td><b>Deployment</b></td>
<td>Render + Neon</td>
</tr>
</table>

---

# 📸 Application Preview

## Daily Hydration Dashboard

<p align="center">
  <img src="readme-assets/Hydrotrack%202.png" alt="HydroTrack Daily Hydration Dashboard" width="900">
</p>

<p align="center">
  <i>Monitor daily water intake, remaining hydration, glasses consumed, and goal completion.</i>
</p>

<br>

## Hydration Overview

<p align="center">
  <img src="readme-assets/Hydrotrack.png" alt="HydroTrack Hydration Overview" width="900">
</p>

<p align="center">
  <i>A focused overview of the user's daily hydration activity.</i>
</p>

<br>

## Weekly Progress Analytics

<p align="center">
  <img src="readme-assets/Hydrotrack%203.png" alt="HydroTrack Weekly Progress" width="900">
</p>

<p align="center">
  <i>Seven-day progress visualization with averages, streaks, completed goals, and achievements.</i>
</p>

<br>

## Personalized Settings

<p align="center">
  <img src="readme-assets/Hydrotrack%204.png" alt="HydroTrack Settings" width="900">
</p>

<p align="center">
  <i>Configure hydration goals, serving sizes, and measurement preferences.</i>
</p>

---

# ✨ Features

| 💧 Hydration | 📊 Analytics | 👤 Personalization | 🔐 Security |
|---|---|---|---|
| Daily intake tracking | 7-day history | Custom daily goals | JWT authentication |
| Quick-add amounts | Weekly averages | Serving sizes | HttpOnly cookies |
| Add/remove intake | Hydration streaks | ml/L preferences | bcrypt hashing |
| Goal completion | Achievement tracking | Persistent settings | Rate limiting |
| Persistent history | Completion statistics | Account-specific data | Protected APIs |

---

# 🏗️ Architecture

```text
                    HydroTrack
                        │
                        ▼
            ┌──────────────────────┐
            │       Browser        │
            │ HTML • CSS • JS      │
            └──────────┬───────────┘
                       │
                       │ Fetch / REST
                       ▼
            ┌──────────────────────┐
            │ Node.js + Express.js │
            │                      │
            │ • Authentication     │
            │ • Hydration API      │
            │ • Settings API       │
            │ • Validation         │
            │ • Security           │
            └──────────┬───────────┘
                       │
                       │ Prisma
                       ▼
            ┌──────────────────────┐
            │   Neon PostgreSQL    │
            │                      │
            │ • Users              │
            │ • User Settings      │
            │ • Hydration Records  │
            └──────────────────────┘
```

<div align="center">

**Frontend → REST API → Prisma → PostgreSQL**

</div>

---

# 🔐 Authentication & Security

HydroTrack uses server-side authentication and authorization rather than relying on browser-only authentication.

| Security Layer | Implementation |
|---|---|
| 🔑 Password Security | Passwords hashed with **bcrypt** |
| 🎫 Authentication | Signed **JWT** tokens |
| 🍪 Token Storage | **HttpOnly cookies** |
| 🛡️ Route Protection | Authentication middleware |
| 🚦 Brute-force Protection | Authentication rate limiting |
| 📦 Request Protection | Request-body size limits |
| 🌐 HTTP Security | Helmet security headers |
| ✅ Validation | Server-side input validation |
| 👥 Data Isolation | Queries scoped to authenticated user |
| 🔒 Production Cookies | Secure cookie configuration in production |

The frontend never decides which user's database records should be accessed. The backend derives the user identity from the authenticated JWT.

---

# 👥 Multi-User Data Isolation

Each HydroTrack account maintains its own:

<table>
<tr>
<td>💧 Hydration History</td>
<td>🎯 Daily Goal</td>
</tr>
<tr>
<td>🥛 Serving Size</td>
<td>📏 Measurement Unit</td>
</tr>
<tr>
<td>📊 Progress Statistics</td>
<td>🏆 Achievement Progress</td>
</tr>
</table>

API requests use the authenticated session to determine ownership instead of trusting a frontend-provided user ID.

---

# 📊 Progress Analytics

HydroTrack transforms stored hydration records into useful weekly information:

- **Monday–Sunday hydration history**
- **Daily goal completion**
- **Weekly average intake**
- **Current hydration streak**
- **Number of completed goals**
- **Today's completion percentage**
- **Achievement progress**
- **Glasses/liters visualization**

---

# 🌍 Timezone-Safe Daily Tracking

Hydration records are calendar-day dependent.

HydroTrack constructs dates using the user's **local calendar date** rather than blindly converting dates through UTC. This helps prevent hydration entries from being assigned to the previous or following day because of timezone offsets.

The backend additionally performs semantic validation before accepting submitted hydration dates.

---

# 🔌 REST API

<details>
<summary><b>🔐 Authentication Endpoints</b></summary>

<br>

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

</details>

<details>
<summary><b>💧 Hydration Endpoints</b></summary>

<br>

```http
GET    /api/hydration/today?date=YYYY-MM-DD
GET    /api/hydration
POST   /api/hydration
DELETE /api/hydration/today?date=YYYY-MM-DD
```

</details>

<details>
<summary><b>⚙️ Settings Endpoints</b></summary>

<br>

```http
GET /api/settings
PUT /api/settings
```

</details>

---

# 🗄️ Database Design

```text
User
│
├── UserSettings
│
└── HydrationRecord[]
```

| Model | Purpose |
|---|---|
| `User` | Account identity and authentication information |
| `UserSettings` | Daily goal, serving size, and measurement preferences |
| `HydrationRecord` | Per-user daily water consumption |

Hydration records use a unique **user + date** combination so one user cannot accidentally create multiple records representing the same calendar day.

---

# 🧠 Engineering Challenges

This project went beyond implementing the visible interface.

Some of the main engineering problems solved were:

> **01 — Persistence**  
> Migrated hydration data from browser storage to PostgreSQL-backed persistent storage.

> **02 — Authentication**  
> Implemented JWT authentication with bcrypt password hashing and HttpOnly cookies.

> **03 — User Isolation**  
> Designed hydration and settings APIs so database operations are scoped to the authenticated user.

> **04 — Date Integrity**  
> Prevented UTC timezone conversion from shifting hydration records between calendar days.

> **05 — Request Safety**  
> Prevented overlapping hydration writes caused by rapid UI interaction.

> **06 — Security Hardening**  
> Added rate limiting, Helmet, server-side validation, request limits, protected routes, and production cookie configuration.

> **07 — Deployment**  
> Deployed the frontend and Express backend as one service while connecting production to Neon PostgreSQL.

---

# 📈 Project Evolution

<div align="center">

```text
Responsive Frontend
        ↓
Interactive Dashboard
        ↓
Express REST API
        ↓
JWT Authentication
        ↓
PostgreSQL Database
        ↓
Per-User Persistence
        ↓
Security Hardening
        ↓
Cloud Deployment
```

### Frontend Exercise → Full-Stack Production Project

</div>

---

# 📂 Project Structure

```text
HydroTrack/
│
├── README.md
│
├── readme-assets/
│   ├── Hydrotrack 2.png
│   ├── Hydrotrack.png
│   ├── Hydrotrack 3.png
│   └── Hydrotrack 4.png
│
├── code files/
│   │
│   ├── frontend/
│   │   ├── index.html
│   │   ├── dashboard.html
│   │   ├── sign-in.html
│   │   ├── sign-up.html
│   │   ├── script.js
│   │   └── ...
│   │
│   └── backend/
│       ├── src/
│       │   ├── controllers/
│       │   ├── middleware/
│       │   ├── prisma/
│       │   ├── routes/
│       │   ├── utils/
│       │   ├── app.js
│       │   └── server.js
│       ├── migrations/
│       ├── package.json
│       └── tsconfig.json
│
└── documents/
```

---

# 🚀 Running HydroTrack Locally

### 1. Clone

```bash
git clone <repository-url>
cd HydroTrack
```

### 2. Install backend dependencies

```bash
cd "code files/backend"
npm install
```

### 3. Configure environment

Create `.env` based on `.env.example`:

```env
DATABASE_URL=your_postgresql_database_url
JWT_SECRET=your_jwt_secret
PORT=3000
```

> ⚠️ Never commit your real `.env` file.

### 4. Build

```bash
npm run build
```

### 5. Start

```bash
npm start
```

Open:

```text
http://localhost:3000
```

---

# ☁️ Deployment

<div align="center">

### 🚀 HydroTrack is Live

The frontend and REST API are served through **Render**, with persistent application data hosted on **Neon PostgreSQL**.

<br>

[![Launch HydroTrack](https://img.shields.io/badge/LAUNCH_HYDROTRACK-LIVE-2ea44f?style=for-the-badge)](https://hydrotrack-ydrg.onrender.com/)

</div>

---

# 🔮 Future Improvements

- 📧 Email verification
- 🔑 Password recovery
- 🔔 Custom hydration reminders
- 📅 Monthly and long-term analytics
- 📱 Progressive Web App support

The current version intentionally prioritizes reliable hydration tracking, secure authentication, persistent storage, and responsive usability.

---

<div align="center">

## 💧 HydroTrack

**Stay consistent. Stay hydrated.**

Built with a focus on **full-stack engineering, security, persistence, and responsive design.**

<br>

[![Live Demo](https://img.shields.io/badge/View_Live_Demo-HydroTrack-2ea44f?style=for-the-badge)](https://hydrotrack-ydrg.onrender.com/)

⭐ **If you find HydroTrack interesting, consider starring the repository.**

</div>

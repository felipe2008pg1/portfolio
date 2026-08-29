<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NWV3czk5aWJ1MWZyOGVncTB2eWhnNHlueTZ2azVudGcxNDJ6Ym9xMyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/40qxxf2K811TIS85Sn/giphy.gif" width="90" height="60" alt="Header"/>
</p>

<h1 align="center">🚀 Felipe Gonzalez — Full Stack Portfolio</h1>

<p align="center">
  <img src="https://img.shields.io/badge/⚡_Full_Stack-Python_%2B_JavaScript-FF6B35?style=for-the-badge&labelColor=0D1117" alt="Full Stack"/>
  <img src="https://img.shields.io/badge/🔒_Security-First-C1432E?style=for-the-badge&labelColor=0D1117" alt="Security First"/>
  <img src="https://img.shields.io/badge/🌎_Bilingual-PT%20%2F%20EN-2F7D5C?style=for-the-badge&labelColor=0D1117" alt="Bilingual"/>
</p>

<br>

<table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 850px;">
  <tr>
    <td width="180" align="center" valign="middle" style="padding: 0; margin: 0; line-height: 0;">
      <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExemJtZ2NzbXAzYjN4bWo5b3JqaHhsZDc4ZzBjanoxdWc3czF1Yjk2NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/XwvM7wpU6EDyl5O9FV/giphy.gif" style="width: 100%; height: auto; display: block; object-fit: cover;" alt="Presentation GIF"/>
    </td>
    <td align="left" valign="middle" style="padding: 18px 24px;">
      <p align="justify" style="font-size: 1.15em; line-height: 1.6; margin: 0;">
        A <b>bilingual (PT/EN) portfolio and client quote-request site</b> with a fully custom
        <b>authenticated admin panel</b>, built to showcase Full Stack Python development in
        production: <b>FastAPI backend</b>, <b>vanilla JS frontend</b>, no frameworks, no
        shortcuts on security.
      </p>
    </td>
  </tr>
</table>

<br>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-2ECC71?style=for-the-badge&labelColor=0D1117" alt="Live"/>
  <img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=FFFFFF" alt="Vercel"/>
  <img src="https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=FFFFFF" alt="Railway"/>
  <img src="https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=000000" alt="Neon"/>
</p>

---

## 🧭 What this is

This repository is the engine behind my personal portfolio — and it's built to do more than sit still and look nice. It's a small, real, production-grade **product**:

> 🎯 **A visitor lands on the site, requests a project quote in their own language, and it lands straight on my WhatsApp — while I manage every word, image, and project on the site from a private, MFA-protected dashboard, without ever touching a line of code.**

Everything here — backend, frontend, security, deployment — was designed and built end-to-end by me. Nothing was templated. Nothing was skipped.

---

## ✨ Features

### 🌐 Public site
| | |
|---|---|
| 🇧🇷🇺🇸 | **Full PT/EN bilingual support** — every string, on every page (including admin), switches instantly with zero reload. |
| 🌗 | **Dark / Light theme toggle**, remembered across visits. |
| 🎌 | **Animated Brazil/USA flag GIFs** woven into the hero background — a visual signature of my dual cultural and professional focus. |
| 💬 | **"Request a Quote" contact form** — messages are delivered straight to WhatsApp, shielded by Cloudflare Turnstile and rate limiting. |
| 📄 | **Custom 404 page** with its own lightweight language toggle. |
| 🎨 | Small, deliberate motion design throughout: 3D tilt on project cards, an animated scroll-progress "radar", scroll-triggered reveals. |

### 🔐 Admin dashboard
| | |
|---|---|
| 🔑 | **MFA-protected login (TOTP)** — Google Authenticator / Authy compatible, with one-time-use encrypted backup codes. |
| 🗂️ | **Full CRUD** for Projects, Skills, and Experience — content updates with zero deploys. |
| 📊 | Live stats: project/skill/experience counts, publish status, MFA status — at a glance. |
| 🌍 | Fully bilingual admin UI, matching the public site 1:1. |

---

## 🔒 Security — treated as a feature, not an afterthought

> Most portfolio sites don't need this level of hardening. Mine has it anyway, because that's the standard I hold my own code to.

- 🔐 **Argon2id** password hashing — the current OWASP-recommended algorithm.
- 🍪 Authentication via short-lived **JWT access tokens** + rotating **refresh tokens**, delivered only as `HttpOnly` + `Secure` + `SameSite`-protected cookies — never touchable by client-side JS.
- 📱 **Optional TOTP MFA** on the admin account, with encrypted backup codes.
- 🤖 **Bot & abuse protection**: Cloudflare Turnstile on every public form + rate limiting (`slowapi`) on login and contact endpoints.
- 🌐 **Strict, allowlist-only CORS** — no wildcard origins, ever.
- 🛡️ **Full security header suite** on every response: `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- 🎭 **`TrustedHostMiddleware`** — rejects requests carrying a forged/unexpected `Host` header.
- 🗄️ **Zero raw SQL** — 100% SQLAlchemy ORM / parameterized queries, immune to SQL injection by construction.
- 🔗 **SSRF-hardened URL validation** on every user-supplied link field — blocks `localhost`, private, link-local, and reserved IP ranges before they're ever accepted.
- 🚫 **No internal errors ever reach the client** — everything is logged server-side and returned as a safe, generic message.
- 🔄 Ongoing dependency hygiene via Dependabot (with cooldown windows) and periodic manual security audits.

---

## 🛠️ Tech stack

<p align="left">
  <img src="https://img.shields.io/badge/Python-FFD700?style=for-the-badge&logo=python&logoColor=3776AB" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-00C896?style=for-the-badge&logo=fastapi&logoColor=FFFFFF" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/SQLAlchemy-FF4B4B?style=for-the-badge&logo=sqlalchemy&logoColor=FFFFFF" alt="SQLAlchemy"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=FFFFFF" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000000" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=FFFFFF" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-2965F1?style=for-the-badge&logo=css3&logoColor=FFFFFF" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JWT-EF4444?style=for-the-badge&logo=jsonwebtokens&logoColor=FFFFFF" alt="JWT"/>
  <img src="https://img.shields.io/badge/Argon2id-9D4EDD?style=for-the-badge" alt="Argon2id"/>
  <img src="https://img.shields.io/badge/TOTP%20MFA-06D6A0?style=for-the-badge" alt="TOTP MFA"/>
  <img src="https://img.shields.io/badge/Cloudflare%20Turnstile-F38020?style=for-the-badge&logo=cloudflare&logoColor=FFFFFF" alt="Turnstile"/>
</p>

No frontend framework. No build step. Pure HTML/CSS/JavaScript — fast, dependency-free, and entirely under my control.

---

## 📁 Project structure

```text
portfolio/
├── backend/
│   └── app/
│       ├── api/routes/      # auth, contact, projects, skills, experiences
│       ├── core/            # config, security, middleware, Turnstile, logging
│       ├── models/          # SQLAlchemy models
│       ├── schemas/         # Pydantic validation schemas
│       └── services/        # business logic
└── frontend/
    ├── index.html           # public site
    ├── 404.html
    └── assets/              # CSS, JS, i18n, images
```
*(the authenticated admin panel lives under its own private route — intentionally not linked from the public site)*

---

<table align="center" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
  <tr>
    <td width="85" align="center" valign="middle" style="padding: 0; margin: 0; line-height: 0;">
      <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjk4dmV2aG50aG1meWE0YTJjcXA4cmV2d2RmeTV2dmg3cWNtb2F4biZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bIqdxoOVJ2oak/giphy.gif" style="width: 100%; height: 100%; display: block; object-fit: cover;" alt="Made in Brazil"/>
    </td>
    <td align="center" valign="middle" style="padding: 0 16px;">
      <b>Built in Brazil</b> &nbsp;·&nbsp; <b>Shipped Worldwide</b>
    </td>
    <td width="110" align="center" valign="middle" style="padding: 0; margin: 0; line-height: 0;">
      <img src="https://i.giphy.com/WlBUAWG03Zic8.gif" style="width: 100%; height: 100%; display: block; object-fit: cover;" alt="Worldwide Globe"/>
    </td>
  </tr>
</table>
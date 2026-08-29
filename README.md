<p align="center">
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd3g0bDJmdnpzbWc5emh3YXM1eXl4M2Q4aG83bzBueW9hZHhjdjQxOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/sFMDqop2ku4M0/giphy.gif" width="60" height="42" alt="USA Flag"/>
  &nbsp;<b>PORTFOLIO & QUOTE REQUEST PLATFORM</b>&nbsp;
  <img src="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjk4dmV2aG50aG1meWE0YTJjcXA4cmV2d2RmeTV2dmg3cWNtb2F4biZlcD12MV9naWZzX3NlYXJjaCZjdD1n/bIqdxoOVJ2oak/giphy.gif" width="60" height="42" alt="Brazil Flag"/>
</p>

<h1 align="center">Felipe Gonzalez — Full Stack Portfolio</h1>

<p align="center">
  A bilingual (PT/EN) portfolio and client quote-request site with a fully custom
  <b>authenticated admin panel</b>, built to showcase Full Stack Python development
  in production: FastAPI backend, vanilla JS frontend, no frameworks, no shortcuts on security.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Live-2ECC71?style=for-the-badge&labelColor=0D1117" alt="Live"/>
  <img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=FFFFFF" alt="Vercel"/>
  <img src="https://img.shields.io/badge/Backend-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=FFFFFF" alt="Railway"/>
  <img src="https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=000000" alt="Neon"/>
</p>

---

## 🧭 What this is

This repository is the source code behind my personal portfolio website. It's not just a static resume page — it's a small full stack product with:

- A **public site** where visitors can learn about my work and **request a quote** for a project directly through a contact form (delivered straight to WhatsApp).
- A **private admin dashboard**, protected by two-factor authentication, where I manage every piece of content (Projects, Skills, Experience) without ever touching code or redeploying.

Everything — backend and frontend — is built and maintained by me, with security treated as a first-class requirement rather than an afterthought.

---

## ✨ Features

### Public site
- 🇧🇷🇺🇸 **Full PT/EN bilingual support** — every string on the site (public and admin) is translated live, no page reload, powered by a custom i18n layer.
- 🌗 **Dark / Light theme toggle**, persisted across visits.
- 🎌 **Animated Brazil/USA flag GIFs** blended into the hero section background, reflecting my dual professional/cultural focus.
- 📄 **Custom 404 page** with its own lightweight bilingual toggle.
- 💬 **Quote request form** ("Contato") — sends messages straight to WhatsApp, protected by Cloudflare Turnstile (bot protection) and rate limiting.
- 🎨 Small interaction details throughout: 3D tilt on project cards, animated scroll progress indicator, scroll-triggered reveal animations.

### Admin dashboard
- 🔐 **Secure login with optional MFA (TOTP)** — Google Authenticator/Authy compatible, with one-time backup codes.
- 🗂️ **Full CRUD** for Projects, Skills, and Experience — no database access needed for day-to-day updates.
- 📊 Live stats panel (project/skill/experience counts, publish status, MFA status).
- 🌍 Fully bilingual admin interface, matching the public site.

---

## 🔒 Security

Security isn't bolted on — it's part of the architecture:

- **Passwords** hashed with **Argon2id**.
- **Authentication** via short-lived JWT access tokens + rotating refresh tokens, delivered as `HttpOnly`, `Secure`, `SameSite`-protected cookies (never exposed to client-side JS).
- **MFA (TOTP)** available for the admin account, with encrypted backup codes.
- **Bot/abuse protection**: Cloudflare Turnstile on public forms + rate limiting (`slowapi`) on login and contact endpoints.
- **Strict CORS** — only explicitly allowlisted origins can call the API.
- **Security headers** on every response: Content-Security-Policy, HSTS (`Strict-Transport-Security`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **`TrustedHostMiddleware`** to reject requests with a forged/unexpected `Host` header.
- **SQL injection safe by design** — all database access goes through SQLAlchemy's ORM/parameterized queries, no raw string-built SQL.
- **SSRF-aware input validation** on any user-supplied URL field (company/logo/project links): blocks `localhost`, private/link-local/reserved IP ranges before accepting a URL.
- **No stack traces or internal errors ever reach the client** — errors are logged server-side and returned as generic, safe messages.
- Regular dependency and vulnerability triage (Dependabot with cooldown windows, periodic security audit passes).

---

## 🛠️ Tech stack

<p align="left">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=FFD43B" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=FFFFFF" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=FFFFFF" alt="SQLAlchemy"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=FFFFFF" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000000" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=FFFFFF" alt="HTML5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=FFFFFF" alt="CSS3"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=FFFFFF" alt="JWT"/>
  <img src="https://img.shields.io/badge/Argon2id-4B0082?style=for-the-badge" alt="Argon2id"/>
  <img src="https://img.shields.io/badge/TOTP%20MFA-6E44FF?style=for-the-badge" alt="TOTP MFA"/>
  <img src="https://img.shields.io/badge/Cloudflare%20Turnstile-F38020?style=for-the-badge&logo=cloudflare&logoColor=FFFFFF" alt="Turnstile"/>
</p>

No frontend framework, no build step — plain HTML/CSS/JavaScript by design, kept fast and dependency-free.

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

*(the authenticated admin panel lives under its own private route — not linked from the public site)*

---

<p align="center">
  <img src="https://img.shields.io/badge/Built%20in-Brazil-009C3B?style=for-the-badge&labelColor=FEDF00"/>
  <img src="https://img.shields.io/badge/Shipped-Worldwide-002868?style=for-the-badge&labelColor=BF0A30"/>
</p>

<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="apps/web/public/logo.png" alt="OpenCut Logo" width="100" />
    </td>
    <td align="right">
      <h1>🎬 OpenCut</h1>
      <h3 style="margin-top: -10px;">A free, open-source video editor for web, desktop, and mobile.</h3>
    </td>
  </tr>
</table>

---

## ✨ Why OpenCut?

- 🔒 **Privacy first**: Your videos stay on your device  
- 🆓 **Truly free**: No subscriptions, no watermarks, no paywalls  
- 🎯 **Simple**: Easy-to-use timeline editor, inspired by CapCut  
- 📊 **Analytics**: Powered by [Databuddy](https://www.databuddy.cc?utm_source=opencut), 100% anonymized & non-invasive  
- 📰 **Blog**: Managed via [Marble](https://marblecms.com?utm_source=opencut), a headless CMS  

---

## 🚀 Features

- Timeline-based editing  
- Multi-track support  
- Real-time preview  
- No subscriptions or hidden fees  
- Works across **Web**, **Desktop**, and **Mobile**  

---

## 🛠️ Project Structure

- `apps/web/` – Main Next.js web application  
- `src/components/` – UI and editor components  
- `src/hooks/` – Custom React hooks  
- `src/lib/` – Utility and API logic  
- `src/stores/` – State management (Zustand, etc.)  
- `src/types/` – TypeScript types  

---

## ⚡ Getting Started

### ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/en/) (v18 or later)  
- [Bun](https://bun.sh/docs/installation) (faster alternative to npm)  
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) *(optional for DB & Redis)*  

---

### 🔧 Setup

1. Fork the repository  
2. Clone your fork locally  
3. Go to the web app directory:  

   ```bash
   cd apps/web

4. Copy .env.example → .env.local

# Linux/Mac
cp .env.example .env.local

# Windows CMD
copy .env.example .env.local

# PowerShell
Copy-Item .env.example .env.local


5. Install dependencies:

bun install


6. Start the dev server:

bun dev




---

🖥️ Development Setup (with Docker)

1. Start DB & Redis

docker-compose up -d


2. Navigate into apps/web


3. Configure .env.local

DATABASE_URL="postgresql://opencut:opencutthegoat@localhost:5432/opencut"
BETTER_AUTH_SECRET="your-secret"
BETTER_AUTH_URL="http://localhost:3000"

UPSTASH_REDIS_REST_URL="http://localhost:8079"
UPSTASH_REST_TOKEN="example_token"

MARBLE_WORKSPACE_KEY="your-key"
NEXT_PUBLIC_MARBLE_API_URL="https://api.marblecms.com"

NODE_ENV="development"


4. Run migrations

bun run db:migrate


5. Start the app

bun run dev



👉 App runs at: http://localhost:3000


---

🤝 Contributing

We welcome all contributions!

Focus areas:

Timeline functionality

Project management improvements

Performance optimizations

UI/UX outside preview panel


⚠️ Avoid for now: preview panel (fonts, stickers, effects, export). These are being refactored.

➡️ See Contributing Guide for details.


---

💎 Sponsors

Thanks to our amazing sponsors:

Vercel

fal.ai


<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a><a href="https://fal.ai">
  <img alt="Powered by fal.ai" src="https://img.shields.io/badge/Powered%20by-fal.ai-000000?style=flat" />
</a>
---

📜 License

MIT LICENSE


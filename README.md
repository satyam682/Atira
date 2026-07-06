# 🌌 Atira AI
> **Autonomous Multi-Connector Workspace Assistant**
> Streamlining productivity by connecting Gmail, Google Docs, Sheets, Drive, Calendar, and GitHub through a secure, self-improving ReAct agentic loop.

---

## ✨ Features

- **🧠 Autonomous Agentic Loop:** Implements a state-of-the-art ReAct agent cycle that dynamically selects, chains, and executes over 60+ workspace tool operations.
- **🔌 6 Multi-Connectors:** Built-in real integration support for:
  - **Gmail:** Read, compose, search, draft, reply, and filter.
  - **Google Docs:** Create docs, write/style content dynamically, append paragraphs, lists, and tables.
  - **Google Sheets:** Create spreadsheets, read/write cell ranges, format tables, and update rows.
  - **Google Drive:** List files, search, upload, retrieve download URLs, and delete files.
  - **Google Calendar:** List events, schedule meetings, reschedule, and delete entries.
  - **GitHub:** List repos, create issues, read files, commit code, review PRs, and check contributors.
- **🛠️ Interactive React Clarification Cards:** Directly prompts users in the chat to select or suggest document topics if not specified, making document generation seamless.
- **🛡️ Secure Admin Control Center:** Bypasses credentials for hardcoded admins, manages user access requests, dynamically syncs platform usages to **Supabase**, and manages credentials.
- **⚡ Hot Reload & Persistence:** Persists OAuth connections in local storage across page refreshes and dev builds.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, Motion (Animate)
- **Backend:** Node.js, Express, TypeScript, TSX compilation
- **Database / Sync:** Supabase JS Client, Local JSON synchronization fallbacks
- **AI Core:** Gemini AI Studio APIs (GenAI)

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Supabase Account** (Optional, falls back to local files)

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory by copying the example:
```bash
cp .env.example .env
```
Fill in the credentials inside `.env`:
```env
GEMINI_API_KEY="your-gemini-key"
COHERE_API_KEY="your-cohere-key"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
SUPABASE_URL="your-supabase-project-url"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Deployment (Vercel)

Atira AI is configured to deploy instantly on **Vercel** via Serverless Function routing.

### Step-by-Step Deployment:
1. Push your code to your GitHub Repository.
2. Go to **Vercel** and select **New Project**.
3. Import your GitHub repository.
4. Add all environment variables (from `.env`) in the Vercel Project Settings under **Environment Variables**.
5. Click **Deploy**. Vercel will automatically build the static React assets and route API requests through `@vercel/node` serverless functions.
6. Configure the **Authorized Redirect URI** in the Google Cloud Console credentials to:
   `https://your-vercel-app-name.vercel.app/api/auth/google/callback`

---

## 🔒 Security

- All OAuth tokens and user configuration keys are secured within browser `localStorage` and sent over HTTPS.
- Sensitive environment variables are kept out of git history via `.gitignore` rule patterns.
- Ephemeral backend functions do not write to persistent local file systems in production, using Supabase sync instead.

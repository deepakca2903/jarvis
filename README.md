# 🤖 Jarvis AI Agent

An autonomous personal AI agent platform powered by **React 19 (Vite 8)**, **FastAPI (v0.4.1)**, **Groq LLM (`openai/gpt-oss-20b`) Function Calling Engine**, **Web Speech Assistant (STT & TTS)**, **MongoDB Atlas**, **Google Drive & Gmail OAuth 2.0**, and **Playwright Browser Automation**.

Designed specifically for the hackathon challenge:
> **"Build an agent that completes real, multi-step tasks across apps, works across devices, and recognises when a task fails."**

---

## 🏗️ Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 React + Vite UI                                   |
|   Dashboard | Command Input | Voice Assistant (STT/TTS) | Timeline | Tasks | Reports |
|   OAuth Connect/Disconnect Pill | Real-time Status Badges | Staged Draft Confirmation|
|                               (http://localhost:5173)                             |
+-----------------------------------------+-----------------------------------------+
                                          | HTTP REST APIs (CORS Enabled)
+-----------------------------------------v-----------------------------------------+
|                               FastAPI Backend (v0.4.1)                            |
|   Autonomous Workflow Engine | Predefined Python Tools | External Integrations    |
|   OAuth 2.0 Handlers | Token Persistence & Auto-Refresh | Rate-Limit Resiliency   |
|                               (http://localhost:8000)                             |
+---------+-------------------+---------------------+--------------------+----------+
          |                   |                     |                    |
      Groq LLM            PyMongo              Google APIs           Playwright
(api.groq.com/openai/v1) AsyncMongoClient     (Drive v3, Gmail v1)  Chromium Browser
openai/gpt-oss-20b        MongoDB Atlas         OAuth 2.0 Tokens    Headless Web
Function Calling          Tasks, Runs, Tokens   Files & Drafts      Research
          |                   |                     |                    |
+---------v-------------+ +---v---------------+ +---v----------------+ +--v---------+
| 14 Allowlisted Tools  | | Verified Database | | Verified Cloud &   | | Verified   |
| create, list, prior., | | Persistence       | | Drive Links        | | Web Data   |
| report, verify, status| | tasks, agent_runs | | drive.google.com   | | Content    |
| drive (3), gmail (4), | | auth_tokens       | | Staged Drafts      | | Extraction |
| browse_web_page       | |                   | | (No Auto-Send)     | |            |
+-----------------------+ +-------------------+ +--------------------+ +------------+
```

> **Security & Execution Rules:**
> - React **never** connects directly to MongoDB, Groq, or external OAuth services.
> - All `GROQ_API_KEY`, MongoDB credentials, and Google OAuth secrets stay exclusively in `backend/.env`.
> - No arbitrary Python execution is permitted; only allowlisted tools in `TOOL_REGISTRY` can be called.
> - Tool calls are never faked. Results and generated files are verified before reporting success.
> - Sensitive argument values (keys, tokens, passwords) are automatically redacted in the execution timeline.
> - Safe temporary failures are retried **at most once**.
> - Spoken responses are cleaned of markdown tables, raw JSON, and code blocks before being passed to `speechSynthesis`.
> - **Consequential Action Safety**: Emails are **never** sent automatically. They are staged as drafts in Gmail (`draft_email`) with recipient, subject, and body shown in both the AI final response and a dedicated frontend card (`✉️ GMAIL DRAFT STAGED`), requiring explicit user confirmation.

---

## 🛠️ Complete Allowlisted Python Tools (14 Tools)

| Tool Name | Target / Scope | Description | Verification & Safety Guarantee |
| :--- | :--- | :--- | :--- |
| `create_task` | MongoDB | Inserts a task with title, description, priority, and deadline. | Verified via immediate database read-back. |
| `list_tasks` | MongoDB | Retrieves tasks with status and priority filtering. | Safe pagination fallback (`limit or 20`). |
| `prioritize_tasks` | Memory | Deterministically sorts tasks by deadline (earliest first, nulls last) and priority rank. | Deterministic sort order. |
| `generate_report` | Filesystem | Compiles tasks into a formatted Markdown report in `reports/`. | Verifies file existence and size > 0 on disk. |
| `verify_action` | System | Validates whether a file exists on disk, a task is in DB, or a workflow completed. | Explicit verification boolean returned. |
| `workflow_status` | System | Retrieves workflow execution status and step metrics by run ID. | Direct MongoDB query against `agent_runs`. |
| `search_drive_files` | Google Drive | Searches Google Drive files matching query text or filename. | Requires OAuth; returns file metadata & `webViewLink`. |
| `read_drive_file` | Google Drive | Reads Google Docs (text export), Sheets (CSV export), or plain text files. | Returns document text content safely. |
| `upload_report_to_drive` | Google Drive | Uploads a verified report artifact to Google Drive. | Verifies creation by re-querying Drive API for file ID and link. |
| `search_gmail_messages` | Gmail | Queries user messages matching Gmail search filters. | Returns message headers (From, To, Subject, Date) and snippet. |
| `read_gmail_message` | Gmail | Decodes message body (multipart plain text or HTML), headers, and word count. | Decodes base64 MIME safely, strips HTML tags if needed. |
| `summarize_email` | Gmail | Analyzes email into Key Points, Action Items, and Proposed Reply points. | Structured summary with actionable tasks and deadline extraction. |
| `draft_email` | Gmail | Stages an email draft in Gmail with recipient, subject, and body. | **Safety Enforced**: Does not send. Staged for explicit user confirmation. |
| `browse_web_page` | Web | Navigates to a URL via Playwright Chromium and extracts readable content. | Automatic fallback to `httpx` HTML parser. |

---

## 🎙️ Voice Assistant Features

Jarvis includes a complete hands-free voice interface built using native Web APIs:
- **Speech Recognition (STT)**:
  - Push-to-talk microphone button (`🎙️ Speak to Jarvis`).
  - Pulsing animated visual ring while listening.
  - **Editable Transcript Review Card**: Review and edit the recognized text before dispatching it to the agent.
  - Graceful fallback for unsupported browsers with typed keyboard input.
- **Speech Output (TTS)**:
  - Spoken response using browser `SpeechSynthesis`.
  - Markdown tables, raw code blocks, and JSON are stripped so Jarvis speaks concise, natural sentences.
  - **`⏹️ Stop Speaking`** button to halt speech immediately.
  - **`🔊 Spoken Responses: ON/OFF`** mute toggle.

---

## 🚀 Quick Start Guide (Windows PowerShell)

Open **two** Windows PowerShell windows:

### 1. Backend Startup (Terminal 1)

```powershell
cd c:\Users\Lenovo\Desktop\chaos\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend endpoints:
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **FastAPI Health**: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- **Database Health**: [http://127.0.0.1:8000/api/health/db](http://127.0.0.1:8000/api/health/db)
- **Groq LLM Health**: [http://127.0.0.1:8000/api/health/groq](http://127.0.0.1:8000/api/health/groq)
- **OAuth Status**: [http://127.0.0.1:8000/api/auth/google/status](http://127.0.0.1:8000/api/auth/google/status)
- **Integrations Status**: [http://127.0.0.1:8000/api/integrations/status](http://127.0.0.1:8000/api/integrations/status)

### 2. Frontend Startup (Terminal 2)

```powershell
cd c:\Users\Lenovo\Desktop\chaos\frontend
npm run dev -- --host
```

Open [http://localhost:5173](http://localhost:5173) in your browser.  
To access from a mobile phone on the same Wi-Fi, open `http://<YOUR_LAN_IP>:5173`.

---

## 🔐 Google Cloud OAuth 2.0 Setup (Drive & Gmail)

To connect Google Drive and Gmail:
1. Create a project at [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Drive API** and **Gmail API**.
3. Configure the **OAuth Consent Screen** (add test users and Drive/Gmail scopes: `gmail.readonly`, `gmail.compose`, `drive.file`, `drive.readonly`).
4. Create an **OAuth 2.0 Client ID** (Web application).
   - Set Authorized Redirect URI to: `http://localhost:8000/api/auth/google/callback`
5. Copy your Client ID and Client Secret into `backend/.env`:
   ```ini
   GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   ```
6. In the React dashboard, click **`🔗 Connect Google`** to authorize.

---

## 🧪 Testing

### Run All 50 Automated Tests:

```powershell
cd c:\Users\Lenovo\Desktop\chaos
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```

> **Current Test Status:** **50 passed, 0 failed, 0 skipped, 0 warnings** in ~43s.

### Build Frontend Production Assets:

```powershell
cd c:\Users\Lenovo\Desktop\chaos\frontend
npm run build
```

---

## 🎯 Example Cross-App & Dependent Prompts

Try these commands using your keyboard or microphone:
1. > **"Search my emails for project updates, read the message, summarize its action items, and draft a reply."**
2. > **"List my pending tasks, prioritize them by deadline, and generate a report."**
3. > **"Search my Google Drive for quarterly reports and summarize what you find."**
4. > **"Generate a report of pending tasks and upload it to my Google Drive."**
5. > **"Draft an email to team@company.com with the executive summary of our pending tasks."**
6. > **"Browse https://news.ycombinator.com and extract the top headlines."**

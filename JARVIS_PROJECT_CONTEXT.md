# 🤖 Jarvis AI Agent — Master Project Context & Handover Documentation

> **File:** `JARVIS_PROJECT_CONTEXT.md`  
> **Location:** Root directory (`chaos/JARVIS_PROJECT_CONTEXT.md`)  
> **Last Updated:** 2026-10-15  
> **Current Version:** `v0.4.1` (Gmail API & Dependent Email Workflows Integration)  
> **Purpose:** Single source of truth for developer continuity, hackathon evaluation, and pair programming across AI sessions and context limits.

---

## A. Project Overview

### 1. Hackathon Requirements & Objectives
The project satisfies the hackathon challenge:
> **"Build an agent that completes real, multi-step tasks across apps, works across devices, and recognises when a task fails."**

Jarvis AI Agent is an autonomous personal AI assistant capable of:
1. **Understanding Complex Natural-Language Commands**: Processing multi-step user prompts via keyboard or voice.
2. **Autonomous Cross-App Tool Calling**: Leveraging Groq LLM (`openai/gpt-oss-20b`) function calling to orchestrate 14 verified Python tools across local database, filesystem, Google Drive, Gmail, and the web.
3. **Comprehensive Gmail Integration (OAuth 2.0)**:
   - `search_gmail_messages`: Searches authorized emails by keyword, sender, or subject.
   - `read_gmail_message`: Retrieves authorized email content, decoding multipart MIME structures (plain text or HTML), headers (From, To, Cc, Subject, Date), and word count.
   - `summarize_email`: Extracts structured key discussion points, actionable tasks, deadlines, and proposed reply points.
   - `draft_email`: Stages an email draft in Gmail without auto-sending.
4. **Safety Consequential Action Rule**:
   - Emails are **never** sent automatically.
   - Staged drafts display recipient, subject, and body in both the AI final response and a dedicated frontend card (`✉️ GMAIL DRAFT STAGED`).
   - Explicit user review and confirmation is required before any email is sent.
5. **Robust Error & Quota Handling**:
   - Revoked authorization (`RefreshError` / HTTP 401) -> returns `status: "authorization_revoked"`.
   - Missing scopes (HTTP 403 insufficientPermissions) -> returns `status: "missing_scopes"`.
   - API quota / rate limits (HTTP 429 / quotaExceeded) -> returns `status: "quota_exceeded"`.
   - Empty search results -> returns clean empty list with friendly message (`count: 0`).
   - Timeouts -> returns `status: "timeout"`.
6. **Voice Interface (STT & TTS)**: Full voice interaction using native Web Speech API (`SpeechRecognition` with push-to-talk and editable transcript review) and `SpeechSynthesis` (clean, conversational responses without raw markdown or JSON).
7. **Artifact & Database Verification**: Explicitly verifying MongoDB writes, report files on disk, and Google Drive uploads before reporting success.
8. **Cross-Device Responsiveness**: A shared FastAPI and MongoDB backend accessible across laptops, tablets, and mobile browsers on local networks (`0.0.0.0:8000`).

---

### 2. High-Level Architecture

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

---

### 3. Core Architectural Rules
- **Strict Client-Server Isolation**: React communicates exclusively with FastAPI over HTTP. React **never** connects directly to MongoDB, Groq, or external Google OAuth services.
- **Zero Secret Exposure**: All credentials (`GROQ_API_KEY`, `MONGO_URI`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) reside solely in `backend/.env`.
- **Predefined Tool Allowlist**: No arbitrary Python execution. The backend strictly validates LLM tool calls against `TOOL_REGISTRY`.
- **Honest Verification**: No tool calls or completions are fabricated. If Google OAuth is unconfigured or not authorized by the user, tools return `status: "authorization_required"` with actionable setup instructions.
- **Consequential Action Safety**: Emails are created as staged drafts (`draft_email`) in Gmail for human review, rather than auto-sending without consent.
- **Failure State Accuracy**: If any prerequisite step fails, dependent steps are halted. If earlier steps succeeded, the workflow is classified as `PARTIALLY_COMPLETED` with `goal_achieved: false`.
- **Speech Hygiene**: Spoken responses are cleaned of markdown tables, raw JSON, and code blocks before being passed to `speechSynthesis`.

---

## B. Complete Allowlisted Python Tools (14 Tools)

| Tool Name | Scope / Target | Purpose & Functionality | Verification & Safety Guarantee |
| :--- | :--- | :--- | :--- |
| `create_task` | MongoDB | Inserts a task with title, description, priority, and deadline. | Immediate MongoDB read-back verification. |
| `list_tasks` | MongoDB | Retrieves tasks filtered by status and priority. | Safe pagination fallback (`limit or 20`). |
| `prioritize_tasks` | Memory | Deterministically sorts task IDs by earliest deadline and priority rank. | Deterministic sort order (earliest deadline first, nulls last). |
| `generate_report` | Filesystem | Compiles tasks into a formatted Markdown report in `reports/`. | Verifies file existence and size > 0 on disk. |
| `verify_action` | System | Validates whether a file exists on disk, a task exists in DB, or a run completed. | Explicit verification boolean returned. |
| `workflow_status` | System | Retrieves workflow execution status and step metrics by run ID. | Queries `agent_runs` collection directly. |
| `search_drive_files` | Google Drive | Searches Drive files matching query text or filename. | Requires valid OAuth; returns file IDs and `webViewLink`. |
| `read_drive_file` | Google Drive | Reads Google Docs (text export), Sheets (CSV export), or plain text. | Returns document content safely. |
| `upload_report_to_drive` | Google Drive | Uploads a verified report artifact to Google Drive. | Verifies file creation by re-querying Drive API for file ID and link. |
| `search_gmail_messages` | Gmail | Queries user messages matching search filters. | Returns message headers (From, To, Subject, Date) and snippet. |
| `read_gmail_message` | Gmail | Decodes message body (multipart plain text or HTML), headers, and word count. | Decodes base64 MIME safely, strips HTML tags if needed. |
| `summarize_email` | Gmail | Analyzes email into Key Points, Action Items, and Proposed Reply points. | Structured summary with actionable tasks and deadline extraction. |
| `draft_email` | Gmail | Creates an email draft staged in Gmail Drafts. | **Safety Enforced**: Does not send. Staged for explicit user confirmation. |
| `browse_web_page` | Web | Navigates to a URL via Playwright Chromium and extracts readable text. | Automatic fallback to `httpx` HTML parser. |

---

## C. Google Cloud OAuth 2.0 Setup Guide

To enable live Google Drive and Gmail capabilities:

### Step 1: Create a Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name the project `Jarvis-Agent` and click **Create**.

### Step 2: Enable Required APIs
1. In the navigation menu, go to **APIs & Services > Library**.
2. Search for **Google Drive API** and click **Enable**.
3. Return to the Library, search for **Gmail API**, and click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (or Internal if using Google Workspace) and click **Create**.
3. Enter App name: `Jarvis AI Agent`, User support email, and Developer contact information.
4. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.readonly` (Search and read email messages)
   - `https://www.googleapis.com/auth/gmail.compose` (Create safe drafts staged for review)
   - `https://www.googleapis.com/auth/drive.file` (View and manage Google Drive files created by this app)
   - `https://www.googleapis.com/auth/drive.readonly` (See and download Google Drive files)
   - `openid`, `https://www.googleapis.com/auth/userinfo.email`
5. On the **Test Users** page, add your personal Gmail address (e.g. `yourname@gmail.com`).
6. Click **Save and Continue**.

### Step 4: Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Select Application type: **Web application**.
4. Name: `Jarvis Web Client`.
5. Under **Authorized redirect URIs**, add:
   `http://localhost:8000/api/auth/google/callback`
6. Click **Create**.
7. Copy the **Client ID** and **Client Secret**.

### Step 5: Save Credentials in `backend/.env`
Open `backend/.env` and update:
```ini
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456789
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
```

### Step 6: Connect from the UI
1. Start the backend and frontend.
2. In the React dashboard status banner, click **`🔗 Connect Google`**.
3. Approve permissions in the Google authorization window.
4. You will be redirected back to the dashboard with the badge **`👤 yourname@gmail.com`** and a **`Disconnect`** option.

---

## D. Current Implementation Status

| Feature / Component | Status | Evidence & Verification Details |
| :--- | :---: | :--- |
| **MongoDB Async Connection** | `Complete` | Verified connection to Atlas cluster with latency telemetry and automatic reconnection. |
| **FastAPI Backend (v0.4.1)** | `Complete` | Complete endpoints for health, DB, Groq, tasks, workflow runs, OAuth 2.0, and integrations. |
| **React 19 + Vite Frontend** | `Complete` | Production build passing in ~163ms. Responsive dark theme for mobile and desktop. |
| **Real Groq LLM Tool Calling** | `Complete` | Sequential function calling with `openai/gpt-oss-20b` via Groq's endpoint with token context pruning. |
| **Autonomous Workflow Engine** | `Complete` | Multi-step execution with dependent result passing and loop bounding (`MAX_TOOL_STEPS=5`). |
| **14 Allowlisted Tools** | `Complete` | All 14 tools registered in `TOOL_REGISTRY` & `TOOL_DEFINITIONS` with nullable JSON schemas. |
| **Google Drive Integration** | `Complete` | Drive v3 search, read, and upload with disk check and `webViewLink` verification. |
| **Gmail Search & Read** | `Complete` | Search by query/sender/date; multipart MIME body extraction with HTML tag cleaning. |
| **Gmail Summarization** | `Complete` | Key Points, Action Items, and Proposed Reply structured generation. |
| **Gmail Safe Drafting** | `Complete` | Draft creation staged in Gmail Drafts with user confirmation requirement and UI card. |
| **Browser Automation** | `Complete` | Playwright headless Chromium with `httpx` fallback for research tasks. |
| **Google OAuth 2.0 Engine** | `Complete` | Token exchange, storage in MongoDB `auth_tokens`, auto-refresh, and disconnect. |
| **Goal Verification** | `Complete` | Explicit verification of disk artifacts, MongoDB inserts, and run status with UI badge (`🎯 GOAL VERIFIED`). |
| **Failure Recognition & Recovery** | `Complete` | `COMPLETED`, `PARTIALLY_COMPLETED`, `BLOCKED`, and `FAILED` states accurately assigned; bounded single retry. |
| **Voice Assistant (Input/Output)** | `Complete` | Web Speech API recognition with push-to-talk mic button, transcript review & edit card; clean TTS speech synthesis. |
| **Cross-Device Access** | `Complete` | Shared backend bound to `0.0.0.0:8000` with responsive UI for phone, tablet, and desktop clients. |
| **Automated Test Suite** | `Complete` | **50 passed, 0 failed, 0 skipped, 0 warnings** across all 8 test modules. |

---

## E. Test and Debugging History

### 1. Test Execution Command
```powershell
.\backend\.venv\Scripts\python.exe -m pytest backend/tests -v
```

### 2. Latest Test Results (Verified 2026-10-15)
- **Total Tests Collected**: 50
- **Passed**: 50 (100%)
- **Failed**: 0
- **Skipped**: 0
- **Warnings**: 0
- **Execution Time**: ~43.70s

### Test Breakdown by Module (All 8 Modules):
1. `backend/tests/test_gmail_integration.py` (13 tests) -> **ALL PASSED**
   - `test_gmail_unauthorized_state`: PASSED
   - `test_gmail_revoked_authorization_handling`: PASSED
   - `test_search_gmail_empty_results`: PASSED
   - `test_search_gmail_valid_results`: PASSED
   - `test_read_gmail_message_multipart`: PASSED
   - `test_read_gmail_message_html_fallback`: PASSED
   - `test_summarize_email_structured_extraction`: PASSED
   - `test_summarize_email_with_raw_text`: PASSED
   - `test_draft_email_requires_explicit_confirmation`: PASSED
   - `test_gmail_missing_scopes_error_handling`: PASSED
   - `test_gmail_quota_exceeded_handling`: PASSED
   - `test_gmail_timeout_handling`: PASSED
   - `test_gmail_end_to_end_dependent_workflow`: PASSED
2. `backend/tests/test_drive_and_integrations.py` (11 tests) -> **ALL PASSED**
3. `backend/tests/test_phase3_workflow.py` (7 tests) -> **ALL PASSED**
4. `backend/tests/test_tools.py` (5 tests) -> **ALL PASSED**
5. `backend/tests/test_health.py` (4 tests) -> **ALL PASSED**
6. `backend/tests/test_groq_health.py` (4 tests) -> **ALL PASSED**
7. `backend/tests/test_live_agent.py` (3 tests) -> **ALL PASSED**
8. `backend/tests/test_agent_workflow.py` (3 tests) -> **ALL PASSED**

---

## F. Pending Setup & How to Authorize Real Gmail Account

> [!IMPORTANT]
> **Pending Real Setup:**
> Until you enter your real Google Cloud OAuth credentials and connect your account in the dashboard, Gmail tools will return `status: "authorization_required"`. This is intentional and prevents fabricated operations.

To complete the real authorization:
1. Follow the **Google Cloud OAuth 2.0 Setup Guide** in Section C.
2. Put your real credentials in `backend/.env`:
   ```ini
   GOOGLE_CLIENT_ID=your_real_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-your_real_secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
   ```
3. Start the backend (`python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`).
4. Start the frontend (`npm run dev`).
5. In the dashboard banner, click **`🔗 Connect Google`**.
6. Once authorized, test a real workflow:
   - *"Search my emails for project updates, summarize the top email, and draft a reply."*

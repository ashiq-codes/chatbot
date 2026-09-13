# 🚀 NexusAI Backend (Node.js + Express + Google Gemini API)

A simple, modular, and beginner-friendly backend server for the NexusAI Chatbot built with **Node.js**, **Express**, and the official **Google Gemini SDK (`@google/genai`)**.

---

## 📁 File Structure

```text
backend/
├── .env              # Local environment variables (PORT, GEMINI_API_KEY, GEMINI_MODEL)
├── .env.example      # Example environment configuration template
├── package.json      # Project dependencies (@google/genai, express, cors, dotenv)
├── server.js         # Main Express application & Gemini integration
└── README.md         # Documentation & setup guide
```

---

## 🔑 Step 1: Getting a Free Gemini API Key

1. Go to **Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with your Google account.
3. Click on **"Get API key"** -> **"Create API key"**.
4. Copy your API key.
5. Open `backend/.env` and replace `your_gemini_api_key_here` with your copied key:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here...
   ```

> 🔒 **Security Best Practice:** Your `GEMINI_API_KEY` stays exclusively on your backend in `.env` and is never sent to or visible in the browser frontend!

---

## 🏃 Step 2: Running the Backend

Open your terminal, navigate to the `backend` directory, and run:

```bash
cd backend
npm run dev
```

You will see:
```text
===========================================
🚀 NexusAI Backend is running on port 5000
🤖 Powered by Google Gemini (gemini-3.6-flash)
🔗 Health Check: http://localhost:5000/
💬 Chat API:     http://localhost:5000/api/chat
===========================================
```

---

## 🔄 Request Lifecycle: How Data Flows

```
1. USER TYPES MESSAGE IN BROWSER
   ↓
2. FRONTEND (script.js)
   Sends HTTP POST to http://localhost:5000/api/chat with { "message": "..." }
   ↓
3. EXPRESS BACKEND (server.js)
   - Receives & validates message
   - Securely loads GEMINI_API_KEY from .env
   - Calls Google Gemini SDK: ai.models.generateContent({ model: "gemini-3.6-flash", contents: message })
   ↓
4. GOOGLE GEMINI API
   Generates AI response & returns text to Express
   ↓
5. EXPRESS BACKEND (server.js)
   Formats response as JSON: { success: true, reply: "..." } and sends back to frontend
   ↓
6. FRONTEND (script.js)
   Receives JSON reply and renders it in the dark-theme UI with word-by-word streaming effect!
```

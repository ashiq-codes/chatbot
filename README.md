# 🤖 NexusAI - Modern AI Chatbot Frontend

A modern, responsive, dark-themed AI chatbot frontend built with clean **HTML5**, **CSS3**, and vanilla **JavaScript**.

---

## 🌟 Features Included

- 🌓 **Modern Dark Theme**: Deep obsidian & slate aesthetic with subtle borders, glowing accents, and glassmorphism.
- 💬 **Interactive Chat Experience**:
  - Distinct User & AI message bubbles with custom avatars.
  - Animated 3-dot typing indicator.
  - Realistic word-by-word streaming simulation for assistant answers.
- 💻 **Syntax-Styled Code Blocks**: Clean code snippet display with a 1-click **Copy Code** button and visual feedback.
- ⚡ **Starter Suggestion Cards**: Quick-start prompt cards on the welcome screen that automatically trigger messages when clicked.
- 📁 **Sidebar & Chat History**:
  - Collapsible sidebar for desktop and slide-out off-canvas drawer for mobile devices.
  - **"+ New Chat"** button to start fresh conversations.
  - Chat history items with active selection and individual delete actions.
  - User profile widget with status and plan badge.
- ⌨️ **Smart Textarea Input**:
  - Auto-expanding multiline input up to a clean maximum height.
  - Send message on `Enter` key (use `Shift + Enter` for a new line).
  - Send button dynamically activates when text is typed.
- 📱 **Fully Responsive**: Adapts seamlessly to smartphones, tablets, and wide monitors.

---

## 📂 Project Structure

```text
chat-bot/
├── index.html        # Main HTML layout (Header, Sidebar, Hero, Chat Area, Input Dock)
├── style.css         # Modern dark theme styles, CSS variables & responsive queries
├── script.js         # Frontend interactivity, mock streaming, and DOM manipulation
├── templates/        # Optional Flask/backend compatible structure
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md         # Documentation & guide
```

---

## 🚀 How to Run & View

### Method 1: Direct in Browser (Zero Setup)
1. Navigate to your `chat-bot` folder on your desktop.
2. Double-click **`index.html`** or right-click and select **Open with -> Google Chrome / Edge / Firefox**.

### Method 2: Using VS Code Live Server
1. Open the `chat-bot` folder in **VS Code**.
2. Install the **Live Server** extension (if not already installed).
3. Right-click `index.html` and click **"Open with Live Server"**.

---

## 📚 Beginner's Guide: How HTML, CSS & JavaScript Connect

1. **HTML (`index.html`)**: Defines the *skeleton and structure* of your website:
   - `<aside class="sidebar">`: The left panel for past chats and user profile.
   - `<div class="chat-viewport">`: The scrollable container where conversation bubbles appear.
   - `<div class="input-dock">`: The floating bar with `<textarea>` and the Send `<button>`.

2. **CSS (`style.css`)**: Defines the *styling, theme, colors, and layout*:
   - Uses **CSS Variables (`:root`)** so you can easily customize colors (e.g. `--accent-primary`).
   - Uses **Flexbox** and **CSS Grid** to arrange elements cleanly.
   - Uses **Media Queries (`@media (max-width: 768px)`)** so the website looks great on mobile phones.

3. **JavaScript (`script.js`)**: Powers the *interactivity and dynamic behaviors*:
   - Listens for user actions (`submit`, `click`, `input`, `keydown`).
   - Dynamically creates and inserts new HTML elements into the DOM (`appendUserMessage`, `simulateAIResponse`).
   - Simulates streaming words using `setInterval` to create the real-time AI typing effect.

---

## 🔌 Future Step: Connecting a Real AI Backend

When you are ready to connect a real backend (e.g., Python Flask / FastAPI or Node.js with Gemini / OpenAI API):
1. In `script.js`, replace the `simulateAIResponse()` function with a standard JavaScript `fetch()` call:
   ```javascript
   async function getRealAIResponse(userPrompt) {
       const response = await fetch('/api/chat', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ message: userPrompt })
       });
       const data = await response.json();
       // display data.reply in the chat UI
   }
   ```
2. Your frontend is already structured and ready to integrate!

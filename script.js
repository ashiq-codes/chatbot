/**
 * ==========================================================================
 * NexusAI - Advanced Frontend Application Logic
 * 
 * Features:
 * - Persistent multi-conversation history (localStorage)
 * - Dynamic relative date grouping (Today, Yesterday, Previous)
 * - Real-time conversation search, inline rename, and deletion
 * - AI Model Selector dropdown (Fast, Balanced, Creative)
 * - Full Dark & Light Theme system with localStorage persistence
 * - Speech-to-Text voice dictation (Web Speech API)
 * - File attachment picker with visual preview tray
 * - AbortController Stop Generating button for AI streaming
 * - Message actions: Copy, Edit & Resend, Regenerate, Thumbs Up/Down
 * - Connection Error detection with inline "Retry" button
 * - Safe Markdown parser with strict XSS sanitization
 * - Responsive mobile drawer & keyboard accessibility shortcuts
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------------------
    // 1. Application State & Storage Keys
    // ----------------------------------------------------------------------
    const STORAGE_KEYS = {
        CONVERSATIONS: 'nexus_conversations_v2',
        ACTIVE_CHAT: 'nexus_active_chat_id',
        THEME: 'nexus_theme',
        MODEL: 'nexus_model_id',
        USERNAME: 'nexus_user_name',
        API_URL: 'nexus_api_url'
    };

    const MODEL_CONFIGS = {
        fast: {
            id: 'fast',
            name: 'Nexus Fast',
            subtag: 'Gemini Flash',
            backendModel: 'gemini-3.6-flash',
            desc: 'Ultra-responsive, best for everyday questions & rapid coding'
        },
        balanced: {
            id: 'balanced',
            name: 'Nexus Balanced',
            subtag: 'Gemini Pro',
            backendModel: 'gemini-1.5-pro',
            desc: 'Strong reasoning, architectural design & nuanced understanding'
        },
        creative: {
            id: 'creative',
            name: 'Nexus Creative',
            subtag: 'Gemini Creative',
            backendModel: 'gemini-1.5-pro',
            desc: 'High creativity, long-form content, brainstorming & synthesis'
        }
    };

    let conversations = [];
    let activeChatId = null;
    let isGenerating = false;
    let currentAbortController = null;
    let activeStreamInterval = null;
    let speechRecognitionInstance = null;
    let isVoiceListening = false;
    let pendingAttachment = null;
    let renamingChatId = null;

    // ----------------------------------------------------------------------
    // 2. DOM Elements Selection
    // ----------------------------------------------------------------------
    // Chat Dock & Input
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const chatViewport = document.getElementById('chat-viewport');
    const welcomeHero = document.getElementById('welcome-hero');
    const heroGreeting = document.getElementById('hero-greeting');
    const newChatBtn = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    
    // Stop Generating & Attachments
    const stopGeneratingContainer = document.getElementById('stop-generating-container');
    const stopGeneratingBtn = document.getElementById('stop-generating-btn');
    const attachmentBtn = document.getElementById('attachment-btn');
    const fileInput = document.getElementById('file-input');
    const attachmentPreviewTray = document.getElementById('attachment-preview-tray');
    const voiceBtn = document.getElementById('voice-btn');

    // Sidebar & Navigation
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const chatSearchInput = document.getElementById('chat-search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const historyListToday = document.getElementById('history-list-today');
    const historyListYesterday = document.getElementById('history-list-yesterday');
    const historyListPrevious = document.getElementById('history-list-previous');
    const historyEmptyState = document.getElementById('history-empty-state');
    const groupToday = document.getElementById('group-today');
    const groupYesterday = document.getElementById('group-yesterday');
    const groupPrevious = document.getElementById('group-previous');

    // User Profile Widget
    const userProfileBtn = document.getElementById('user-profile-btn');
    const userNameDisplay = document.getElementById('user-name-display');
    const userAvatarInitials = document.getElementById('user-avatar-initials');

    // Model Selector
    const modelDropdownContainer = document.getElementById('model-dropdown-container');
    const modelBadgeBtn = document.getElementById('model-badge-btn');
    const currentModelName = document.getElementById('current-model-name');
    const currentModelSubtag = document.getElementById('current-model-subtag');
    const modelOptions = document.querySelectorAll('.model-option');

    // Theme Switcher
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // Settings Modal
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModalBackdrop = document.getElementById('settings-modal-backdrop');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const themeOptBtns = document.querySelectorAll('.theme-opt-btn');
    const settingsUsernameInput = document.getElementById('settings-username-input');
    const settingsApiUrl = document.getElementById('settings-api-url');
    const testApiBtn = document.getElementById('test-api-btn');
    const apiStatusMsg = document.getElementById('api-status-msg');
    const clearAllDataBtn = document.getElementById('clear-all-data-btn');

    // Rename Modal
    const renameModalBackdrop = document.getElementById('rename-modal-backdrop');
    const renameChatInput = document.getElementById('rename-chat-input');
    const renameSaveBtn = document.getElementById('rename-save-btn');
    const renameCancelBtn = document.getElementById('rename-cancel-btn');
    const renameCloseBtn = document.getElementById('rename-close-btn');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // ----------------------------------------------------------------------
    // 3. Initialization & LocalStorage Hydration
    // ----------------------------------------------------------------------
    function init() {
        initTheme();
        initUserProfile();
        initModelSelection();
        initConversations();
        initSpeechRecognition();
        updateGreeting();
        attachGlobalEventListeners();

        // Check URL parameters for deep links and test views
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme')) {
            applyTheme(urlParams.get('theme'));
        }
        if (urlParams.get('new') === '1') {
            createNewChat();
        }
        if (urlParams.get('settings') === '1') {
            openSettingsModal();
        }
    }

    // ----------------------------------------------------------------------
    // 4. Theme System (Dark / Light / System)
    // ----------------------------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
        applyTheme(savedTheme);
    }

    function applyTheme(theme) {
        let activeTheme = theme;
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            activeTheme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', activeTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, theme);

        // Update settings radio buttons
        themeOptBtns.forEach(btn => {
            const val = btn.getAttribute('data-theme-val');
            btn.classList.toggle('active', val === theme);
        });
    }

    function toggleThemeQuick() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        showToast(`Switched to ${nextTheme === 'dark' ? 'Dark' : 'Light'} theme`);
    }

    // ----------------------------------------------------------------------
    // 5. User Profile Management
    // ----------------------------------------------------------------------
    function initUserProfile() {
        const savedName = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'Mohamed Ashiq';
        setUserName(savedName, false);
    }

    function setUserName(name, persist = true) {
        const cleanName = (name && name.trim()) ? name.trim() : 'Mohamed Ashiq';
        if (userNameDisplay) userNameDisplay.textContent = cleanName;
        if (settingsUsernameInput) settingsUsernameInput.value = cleanName;

        // Extract initials
        const parts = cleanName.split(/\s+/).filter(Boolean);
        const initials = parts.length >= 2 
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : (parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'MA');
            
        if (userAvatarInitials) userAvatarInitials.textContent = initials;
        if (persist) localStorage.setItem(STORAGE_KEYS.USERNAME, cleanName);
        updateGreeting();
    }

    function updateGreeting() {
        if (!heroGreeting) return;
        const currentHour = new Date().getHours();
        let greetingText = 'Good evening';
        if (currentHour >= 5 && currentHour < 12) {
            greetingText = 'Good morning';
        } else if (currentHour >= 12 && currentHour < 17) {
            greetingText = 'Good afternoon';
        }

        const name = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'Mohamed Ashiq';
        const firstName = name.split(' ')[0] || name;
        heroGreeting.textContent = `${greetingText}, ${firstName}`;
    }

    // ----------------------------------------------------------------------
    // 6. AI Model Selector
    // ----------------------------------------------------------------------
    function initModelSelection() {
        const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL) || 'fast';
        setModel(savedModel, false);
    }

    function setModel(modelId, showNotice = true) {
        const config = MODEL_CONFIGS[modelId] || MODEL_CONFIGS.fast;
        if (currentModelName) currentModelName.textContent = config.name;
        if (currentModelSubtag) currentModelSubtag.textContent = config.subtag;

        modelOptions.forEach(opt => {
            const id = opt.getAttribute('data-model-id');
            opt.classList.toggle('active', id === config.id);
        });

        localStorage.setItem(STORAGE_KEYS.MODEL, config.id);

        if (showNotice) {
            showToast(`Switched to ${config.name} (${config.subtag})`);
        }
    }

    function getSelectedBackendModel() {
        const modelId = localStorage.getItem(STORAGE_KEYS.MODEL) || 'fast';
        const config = MODEL_CONFIGS[modelId] || MODEL_CONFIGS.fast;
        return config.backendModel;
    }
function getBackendUrl() {
    return localStorage.getItem(STORAGE_KEYS.API_URL) || 'https://backend-disater-iq.vercel.app/api/chat';
}

    // ----------------------------------------------------------------------
    // 7. Conversation & History Data Management
    // ----------------------------------------------------------------------
    function initConversations() {
        const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
        if (stored) {
            try {
                conversations = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse conversations from localStorage:', e);
                conversations = [];
            }
        }

        // Seed realistic starters if empty
        if (!conversations || conversations.length === 0) {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            conversations = [
                {
                    id: 'chat-welcome',
                    title: 'Welcome & Overview',
                    createdAt: now,
                    updatedAt: now,
                    messages: [
                        {
                            id: 'msg-w1',
                            sender: 'bot',
                            text: 'Welcome to **NexusAI**! 🚀\n\nI am your modern AI programming and knowledge partner powered by Google Gemini. Here are a few things you can ask me:\n- Write, debug, or refactor code in any language\n- Explain complex algorithms with diagrams & code snippets\n- Brainstorm web apps, architectural blueprints, and UI ideas\n\nHow can I help you today?',
                            timestamp: formatTimestamp(new Date(now)),
                            rating: null
                        }
                    ]
                },
                {
                    id: 'chat-async',
                    title: 'JavaScript Promises & Async',
                    createdAt: now - oneDay,
                    updatedAt: now - oneDay,
                    messages: [
                        {
                            id: 'msg-a1',
                            sender: 'user',
                            text: 'Explain how JavaScript Promises and Async/Await work with simple examples.',
                            timestamp: formatTimestamp(new Date(now - oneDay)),
                            rating: null
                        },
                        {
                            id: 'msg-a2',
                            sender: 'bot',
                            text: '### Understanding JavaScript Asynchronous Patterns\n\nJavaScript runs on a **single-threaded** event loop. Asynchronous mechanisms allow non-blocking operations like network requests:\n\n```javascript\n// Modern Async/Await syntax\nasync function fetchUserData(userId) {\n    try {\n        const response = await fetch(`/api/users/${userId}`);\n        const user = await response.json();\n        return user;\n    } catch (err) {\n        console.error("Failed to load user:", err);\n    }\n}\n```\n\nKey advantages:\n- Clean, sequential code flow\n- Centralized error handling using `try...catch` blocks',
                            timestamp: formatTimestamp(new Date(now - oneDay + 2000)),
                            rating: 'like'
                        }
                    ]
                },
                {
                    id: 'chat-css',
                    title: 'CSS Flexbox vs Grid Guide',
                    createdAt: now - (3 * oneDay),
                    updatedAt: now - (3 * oneDay),
                    messages: [
                        {
                            id: 'msg-c1',
                            sender: 'user',
                            text: 'Show me how to center a div in CSS using both Flexbox and Grid.',
                            timestamp: formatTimestamp(new Date(now - 3 * oneDay)),
                            rating: null
                        },
                        {
                            id: 'msg-c2',
                            sender: 'bot',
                            text: '### Centering in Modern CSS\n\nBoth **Flexbox** (1-dimensional) and **Grid** (2-dimensional) make centering effortless:\n\n```css\n/* Method 1: Modern CSS Grid (Simplest) */\n.parent-grid {\n    display: grid;\n    place-items: center;\n    min-height: 100vh;\n}\n\n/* Method 2: Modern CSS Flexbox */\n.parent-flex {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    min-height: 100vh;\n}\n```',
                            timestamp: formatTimestamp(new Date(now - 3 * oneDay + 2000)),
                            rating: null
                        }
                    ]
                }
            ];
            saveConversations();
        }

        // Restore active chat or default to the most recent one
        const lastActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
        if (lastActiveId && conversations.some(c => c.id === lastActiveId)) {
            selectChat(lastActiveId);
        } else if (conversations.length > 0) {
            selectChat(conversations[0].id);
        } else {
            createNewChat();
        }

        renderSidebarHistory();
    }

    function saveConversations() {
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }

    function getActiveConversation() {
        return conversations.find(c => c.id === activeChatId) || null;
    }

    function createNewChat() {
        if (isGenerating) stopGeneration();

        const now = Date.now();
        const newChat = {
            id: 'chat-' + now + '-' + Math.random().toString(36).substring(2, 7),
            title: 'New Conversation',
            createdAt: now,
            updatedAt: now,
            messages: []
        };

        conversations.unshift(newChat);
        saveConversations();
        selectChat(newChat.id);
        renderSidebarHistory();

        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        }

        // Focus message input for instant typing
        setTimeout(() => messageInput && messageInput.focus(), 50);
    }

    function selectChat(chatId) {
        if (isGenerating && activeChatId !== chatId) {
            stopGeneration();
        }

        activeChatId = chatId;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, chatId);
        renderSidebarHistory();
        renderActiveChatMessages();
    }

    function deleteChat(chatId, e) {
        if (e) e.stopPropagation();

        const chatIndex = conversations.findIndex(c => c.id === chatId);
        if (chatIndex === -1) return;

        const deletedChat = conversations[chatIndex];
        conversations.splice(chatIndex, 1);
        saveConversations();

        showToast(`Deleted "${deletedChat.title.slice(0, 24)}..."`);

        if (activeChatId === chatId) {
            if (conversations.length > 0) {
                selectChat(conversations[0].id);
            } else {
                createNewChat();
            }
        } else {
            renderSidebarHistory();
        }
    }

    function openRenameDialog(chatId, e) {
        if (e) e.stopPropagation();
        const chat = conversations.find(c => c.id === chatId);
        if (!chat) return;

        renamingChatId = chatId;
        renameChatInput.value = chat.title;
        renameModalBackdrop.style.display = 'flex';
        setTimeout(() => renameChatInput.focus(), 50);
    }

    function saveRenamedChat() {
        if (!renamingChatId) return;
        const newTitle = renameChatInput.value.trim();
        if (newTitle) {
            const chat = conversations.find(c => c.id === renamingChatId);
            if (chat) {
                chat.title = newTitle;
                chat.updatedAt = Date.now();
                saveConversations();
                renderSidebarHistory();
                showToast('Conversation renamed');
            }
        }
        closeRenameDialog();
    }

    function closeRenameDialog() {
        renamingChatId = null;
        renameModalBackdrop.style.display = 'none';
    }

    function autoNameChat(conversation, firstPrompt) {
        if (!conversation || !firstPrompt) return;
        if (conversation.title === 'New Conversation' || !conversation.title) {
            let clean = firstPrompt.replace(/^[^a-zA-Z0-9]+/, '').trim();
            if (clean.length > 36) {
                clean = clean.substring(0, 36).replace(/\s+\S*$/, '') + '...';
            }
            conversation.title = clean || 'Conversation';
            conversation.updatedAt = Date.now();
            saveConversations();
            renderSidebarHistory();
        }
    }

    // ----------------------------------------------------------------------
    // 8. Sidebar History Grouping (Today / Yesterday / Previous) & Search
    // ----------------------------------------------------------------------
    function renderSidebarHistory() {
        if (!historyListToday || !historyListYesterday || !historyListPrevious) return;

        const searchQuery = (chatSearchInput ? chatSearchInput.value.trim().toLowerCase() : '');
        historyListToday.innerHTML = '';
        historyListYesterday.innerHTML = '';
        historyListPrevious.innerHTML = '';

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);

        let countToday = 0;
        let countYesterday = 0;
        let countPrevious = 0;

        conversations.forEach(chat => {
            // Check search filter
            if (searchQuery) {
                const matchesTitle = chat.title.toLowerCase().includes(searchQuery);
                const matchesMessage = chat.messages.some(m => m.text.toLowerCase().includes(searchQuery));
                if (!matchesTitle && !matchesMessage) return;
            }

            const itemEl = createHistoryItemElement(chat);
            const chatTime = chat.updatedAt || chat.createdAt || 0;

            if (chatTime >= startOfToday) {
                historyListToday.appendChild(itemEl);
                countToday++;
            } else if (chatTime >= startOfYesterday) {
                historyListYesterday.appendChild(itemEl);
                countYesterday++;
            } else {
                historyListPrevious.appendChild(itemEl);
                countPrevious++;
            }
        });

        // Hide/Show section headers based on count
        if (groupToday) groupToday.style.display = countToday > 0 ? 'block' : 'none';
        if (groupYesterday) groupYesterday.style.display = countYesterday > 0 ? 'block' : 'none';
        if (groupPrevious) groupPrevious.style.display = countPrevious > 0 ? 'block' : 'none';

        const totalVisible = countToday + countYesterday + countPrevious;
        if (historyEmptyState) {
            historyEmptyState.style.display = (totalVisible === 0) ? 'flex' : 'none';
        }
    }

    function createHistoryItemElement(chat) {
        const li = document.createElement('li');
        li.className = `history-item ${chat.id === activeChatId ? 'active' : ''}`;
        li.setAttribute('data-chat-id', chat.id);
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');

        li.innerHTML = `
            <svg class="history-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="history-title" title="${escapeHTML(chat.title)}">${escapeHTML(chat.title)}</span>
            <div class="history-actions">
                <button type="button" class="item-action-btn edit-chat-btn" title="Rename conversation" aria-label="Rename conversation">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                </button>
                <button type="button" class="item-action-btn delete delete-chat-btn" title="Delete conversation" aria-label="Delete conversation">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

        li.addEventListener('click', (e) => {
            if (e.target.closest('.history-actions')) return;
            selectChat(chat.id);
            if (window.innerWidth <= 768) {
                closeMobileSidebar();
            }
        });

        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('.history-actions')) return;
                e.preventDefault();
                selectChat(chat.id);
                if (window.innerWidth <= 768) closeMobileSidebar();
            }
        });

        const renameBtn = li.querySelector('.edit-chat-btn');
        if (renameBtn) {
            renameBtn.addEventListener('click', (e) => openRenameDialog(chat.id, e));
        }

        const deleteBtn = li.querySelector('.delete-chat-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => deleteChat(chat.id, e));
        }

        return li;
    }

    // ----------------------------------------------------------------------
    // 9. Chat Message Rendering
    // ----------------------------------------------------------------------
    function renderActiveChatMessages() {
        chatMessages.innerHTML = '';
        const conversation = getActiveConversation();

        if (!conversation || conversation.messages.length === 0) {
            if (welcomeHero) {
                chatMessages.appendChild(welcomeHero);
                welcomeHero.style.display = 'flex';
            }
            scrollToBottom();
            return;
        }

        if (welcomeHero) {
            welcomeHero.style.display = 'none';
        }

        conversation.messages.forEach(msg => {
            if (msg.sender === 'user') {
                renderUserMessageDOM(msg);
            } else {
                renderBotMessageDOM(msg);
            }
        });

        scrollToBottom();
    }

    function renderUserMessageDOM(msg) {
        const row = document.createElement('div');
        row.className = 'message-row user-message';
        row.id = `msg-row-${msg.id}`;

        const initials = userAvatarInitials ? userAvatarInitials.textContent : 'MA';
        const attachmentHTML = msg.attachment 
            ? `<div class="user-msg-attachment">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                <span>${escapeHTML(msg.attachment.name)}</span>
               </div>`
            : '';

        row.innerHTML = `
            <div class="message-avatar" aria-hidden="true">${initials}</div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-time">${msg.timestamp || ''}</span>
                </div>
                ${attachmentHTML}
                <div class="message-bubble user-bubble">${escapeHTML(msg.text)}</div>
                <div class="message-actions">
                    <button type="button" class="action-btn edit-msg-btn" title="Edit & resend message" aria-label="Edit and resend message">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button type="button" class="action-btn copy-msg-btn" title="Copy message text" aria-label="Copy message text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                </div>
            </div>
        `;

        // Edit button handler
        const editBtn = row.querySelector('.edit-msg-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                messageInput.value = msg.text;
                adjustTextareaHeight();
                messageInput.focus();
                scrollToBottom();
                showToast('Prompt populated for editing');
            });
        }

        // Copy button handler
        const copyBtn = row.querySelector('.copy-msg-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyToClipboard(msg.text, copyBtn));
        }

        chatMessages.appendChild(row);
    }

    function renderBotMessageDOM(msg) {
        const row = document.createElement('div');
        row.className = `message-row bot-message ${msg.isError ? 'error-row' : ''}`;
        row.id = `msg-row-${msg.id}`;

        if (msg.isError) {
            row.innerHTML = `
                <div class="message-avatar" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="message-content-wrapper">
                    <div class="message-header">
                        <span class="message-sender">NexusAI</span>
                        <span class="message-time">${msg.timestamp || ''}</span>
                    </div>
                    <div class="error-card">
                        <div class="error-card-content">
                            <svg class="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div>${formatMarkdown(msg.text)}</div>
                        </div>
                        <button type="button" class="retry-action-btn" aria-label="Retry prompt">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            <span>Retry Request</span>
                        </button>
                    </div>
                </div>
            `;

            const retryBtn = row.querySelector('.retry-action-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    const conv = getActiveConversation();
                    if (!conv) return;
                    // Find preceding user message
                    const msgIndex = conv.messages.findIndex(m => m.id === msg.id);
                    if (msgIndex > 0) {
                        const userMsg = conv.messages[msgIndex - 1];
                        if (userMsg && userMsg.sender === 'user') {
                            // Remove error message and re-send
                            conv.messages.splice(msgIndex, 1);
                            saveConversations();
                            row.remove();
                            sendMessage(userMsg.text, true);
                        }
                    }
                });
            }

            chatMessages.appendChild(row);
            return;
        }

        const formattedContent = formatMarkdown(msg.text);

        row.innerHTML = `
            <div class="message-avatar" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
            </div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-sender">NexusAI</span>
                    <span class="message-time">${msg.timestamp || ''}</span>
                </div>
                <div class="message-bubble bot-content">${formattedContent}</div>
                <div class="message-actions">
                    <button type="button" class="action-btn copy-msg-btn" title="Copy response text" aria-label="Copy response text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button type="button" class="action-btn regenerate-btn" title="Regenerate this response" aria-label="Regenerate this response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        <span>Regenerate</span>
                    </button>
                    <button type="button" class="action-btn like-btn ${msg.rating === 'like' ? 'active-like' : ''}" title="Helpful response" aria-label="Helpful response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                    </button>
                    <button type="button" class="action-btn dislike-btn ${msg.rating === 'dislike' ? 'active-dislike' : ''}" title="Unhelpful response" aria-label="Unhelpful response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        attachCodeCopyHandlers(row);

        // Copy button
        const copyBtn = row.querySelector('.copy-msg-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyToClipboard(msg.text, copyBtn));
        }

        // Regenerate button
        const regenBtn = row.querySelector('.regenerate-btn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                if (isGenerating) return;
                const conv = getActiveConversation();
                if (!conv) return;
                const msgIndex = conv.messages.findIndex(m => m.id === msg.id);
                if (msgIndex > 0) {
                    const userMsg = conv.messages[msgIndex - 1];
                    if (userMsg && userMsg.sender === 'user') {
                        // Remove current bot message and regenerate
                        conv.messages.splice(msgIndex, 1);
                        saveConversations();
                        row.remove();
                        sendMessage(userMsg.text, true);
                    }
                }
            });
        }

        // Thumbs feedback handlers
        const likeBtn = row.querySelector('.like-btn');
        const dislikeBtn = row.querySelector('.dislike-btn');

        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                const conv = getActiveConversation();
                const targetMsg = conv ? conv.messages.find(m => m.id === msg.id) : null;
                if (!targetMsg) return;

                if (targetMsg.rating === 'like') {
                    targetMsg.rating = null;
                    likeBtn.classList.remove('active-like');
                } else {
                    targetMsg.rating = 'like';
                    likeBtn.classList.add('active-like');
                    if (dislikeBtn) dislikeBtn.classList.remove('active-dislike');
                    showToast('Thanks for your positive feedback!');
                }
                saveConversations();
            });
        }

        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', () => {
                const conv = getActiveConversation();
                const targetMsg = conv ? conv.messages.find(m => m.id === msg.id) : null;
                if (!targetMsg) return;

                if (targetMsg.rating === 'dislike') {
                    targetMsg.rating = null;
                    dislikeBtn.classList.remove('active-dislike');
                } else {
                    targetMsg.rating = 'dislike';
                    dislikeBtn.classList.add('active-dislike');
                    if (likeBtn) likeBtn.classList.remove('active-like');
                    showToast('Feedback noted. We will work to improve!');
                }
                saveConversations();
            });
        }

        chatMessages.appendChild(row);
    }

    // ----------------------------------------------------------------------
    // 10. Message Sending & AI Response Streaming
    // ----------------------------------------------------------------------
    async function sendMessage(userText, isRetry = false) {
        if (!userText || isGenerating) return;

        const conversation = getActiveConversation();
        if (!conversation) return;

        // Auto name conversation if first message
        if (!isRetry && conversation.messages.length === 0) {
            autoNameChat(conversation, userText);
        }

        if (welcomeHero) welcomeHero.style.display = 'none';

        // 1. If not retry, create and persist User message
        let userMessageObj = null;
        if (!isRetry) {
            userMessageObj = {
                id: 'msg-u-' + Date.now(),
                sender: 'user',
                text: userText,
                timestamp: formatTimestamp(new Date()),
                attachment: pendingAttachment ? { name: pendingAttachment.name, size: pendingAttachment.size } : null
            };
            conversation.messages.push(userMessageObj);
            conversation.updatedAt = Date.now();
            saveConversations();
            renderUserMessageDOM(userMessageObj);
            clearAttachment();
        }

        // 2. Reset input & update layout
        messageInput.value = '';
        adjustTextareaHeight();
        scrollToBottom();

        // 3. Set generating state & show Stop Generating button
        isGenerating = true;
        sendBtn.disabled = true;
        if (stopGeneratingContainer) stopGeneratingContainer.style.display = 'block';

        const typingIndicatorRow = createAITypingIndicator();
        currentAbortController = new AbortController();

        const endpoint = getBackendUrl();
        const selectedModel = getSelectedBackendModel();

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: userText,
                    model: selectedModel 
                }),
                signal: currentAbortController.signal
            });

            removeTypingIndicator(typingIndicatorRow);

            const data = await response.json();

            if (!response.ok || !data.success) {
                const errorMsg = data.error || `Server returned error status ${response.status}`;
                recordAndRenderBotMessage(conversation, errorMsg, true);
                return;
            }

            // Stream AI Response
            streamAIResponse(conversation, data.reply || 'No response generated.');

        } catch (error) {
            removeTypingIndicator(typingIndicatorRow);

            if (error.name === 'AbortError') {
                // Aborted gracefully by user
                showToast('Generation cancelled');
            } else {
                console.error('API connection failed:', error);
                const connectionErrorMsg = `Could not reach the backend server at \`${endpoint}\`.\n\nPlease verify that your Node.js backend is running:\n\`\`\`bash\ncd backend\nnpm start\n\`\`\``;
                recordAndRenderBotMessage(conversation, connectionErrorMsg, true);
            }
        } finally {
            if (!activeStreamInterval) {
                finishGenerating();
            }
        }
    }

    function streamAIResponse(conversation, fullText) {
        const botMsgObj = {
            id: 'msg-b-' + Date.now(),
            sender: 'bot',
            text: '',
            timestamp: formatTimestamp(new Date()),
            rating: null,
            isError: false
        };

        const botRow = document.createElement('div');
        botRow.className = 'message-row bot-message';
        botRow.id = `msg-row-${botMsgObj.id}`;

        botRow.innerHTML = `
            <div class="message-avatar" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
            </div>
            <div class="message-content-wrapper">
                <div class="message-header">
                    <span class="message-sender">NexusAI</span>
                    <span class="message-time">${botMsgObj.timestamp}</span>
                </div>
                <div class="message-bubble bot-content"></div>
                <div class="message-actions" style="display: none;">
                    <button type="button" class="action-btn copy-msg-btn" title="Copy response text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        <span>Copy</span>
                    </button>
                    <button type="button" class="action-btn regenerate-btn" title="Regenerate this response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        <span>Regenerate</span>
                    </button>
                    <button type="button" class="action-btn like-btn" title="Helpful response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                    </button>
                    <button type="button" class="action-btn dislike-btn" title="Unhelpful response">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        chatMessages.appendChild(botRow);
        const contentContainer = botRow.querySelector('.bot-content');
        const actionsContainer = botRow.querySelector('.message-actions');

        const words = fullText.split(' ');
        let wordIndex = 0;
        let streamedRaw = '';

        activeStreamInterval = setInterval(() => {
            if (wordIndex < words.length) {
                streamedRaw += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
                contentContainer.innerHTML = formatMarkdown(streamedRaw);
                wordIndex++;
                scrollToBottom();
            } else {
                finalizeStream(conversation, botMsgObj, fullText, botRow, contentContainer, actionsContainer);
            }
        }, 18);
    }

    function finalizeStream(conversation, botMsgObj, finalRawText, botRow, contentContainer, actionsContainer) {
        if (activeStreamInterval) {
            clearInterval(activeStreamInterval);
            activeStreamInterval = null;
        }

        botMsgObj.text = finalRawText;
        contentContainer.innerHTML = formatMarkdown(finalRawText);
        attachCodeCopyHandlers(botRow);

        // Attach action handlers
        const copyBtn = botRow.querySelector('.copy-msg-btn');
        if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard(finalRawText, copyBtn));

        const regenBtn = botRow.querySelector('.regenerate-btn');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                if (isGenerating) return;
                const msgIndex = conversation.messages.findIndex(m => m.id === botMsgObj.id);
                if (msgIndex > 0) {
                    const userMsg = conversation.messages[msgIndex - 1];
                    conversation.messages.splice(msgIndex, 1);
                    saveConversations();
                    botRow.remove();
                    sendMessage(userMsg.text, true);
                }
            });
        }

        const likeBtn = botRow.querySelector('.like-btn');
        const dislikeBtn = botRow.querySelector('.dislike-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                botMsgObj.rating = botMsgObj.rating === 'like' ? null : 'like';
                likeBtn.classList.toggle('active-like', botMsgObj.rating === 'like');
                if (dislikeBtn) dislikeBtn.classList.remove('active-dislike');
                if (botMsgObj.rating === 'like') showToast('Thanks for your feedback!');
                saveConversations();
            });
        }
        if (dislikeBtn) {
            dislikeBtn.addEventListener('click', () => {
                botMsgObj.rating = botMsgObj.rating === 'dislike' ? null : 'dislike';
                dislikeBtn.classList.toggle('active-dislike', botMsgObj.rating === 'dislike');
                if (likeBtn) likeBtn.classList.remove('active-like');
                if (botMsgObj.rating === 'dislike') showToast('Feedback noted!');
                saveConversations();
            });
        }

        actionsContainer.style.display = 'flex';

        // Persist message in state & storage
        conversation.messages.push(botMsgObj);
        conversation.updatedAt = Date.now();
        saveConversations();
        renderSidebarHistory();

        finishGenerating();
    }

    function stopGeneration() {
        if (currentAbortController) {
            currentAbortController.abort();
            currentAbortController = null;
        }

        if (activeStreamInterval) {
            clearInterval(activeStreamInterval);
            activeStreamInterval = null;
        }

        // Finalize last bot row if actively streaming
        const lastRow = chatMessages.querySelector('.bot-message:last-child');
        if (lastRow) {
            const content = lastRow.querySelector('.bot-content');
            const actions = lastRow.querySelector('.message-actions');
            if (actions) actions.style.display = 'flex';
        }

        finishGenerating();
        showToast('Generation stopped');
    }

    function finishGenerating() {
        isGenerating = false;
        if (stopGeneratingContainer) stopGeneratingContainer.style.display = 'none';
        adjustTextareaHeight();
        scrollToBottom();
    }

    function recordAndRenderBotMessage(conversation, text, isError = false) {
        const botMsgObj = {
            id: 'msg-b-' + Date.now(),
            sender: 'bot',
            text: text,
            timestamp: formatTimestamp(new Date()),
            rating: null,
            isError: isError
        };

        conversation.messages.push(botMsgObj);
        conversation.updatedAt = Date.now();
        saveConversations();
        renderBotMessageDOM(botMsgObj);
        scrollToBottom();
    }

    function createAITypingIndicator() {
        const row = document.createElement('div');
        row.className = 'message-row bot-message typing-row';
        row.id = 'typing-indicator-row';

        row.innerHTML = `
            <div class="message-avatar" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
            </div>
            <div class="message-content-wrapper">
                <div class="typing-indicator" aria-label="NexusAI is typing...">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        chatMessages.appendChild(row);
        scrollToBottom();
        return row;
    }

    function removeTypingIndicator(typingRow) {
        if (typingRow && typingRow.parentNode) {
            typingRow.parentNode.removeChild(typingRow);
        }
    }

    // ----------------------------------------------------------------------
    // 11. Strict HTML Sanitizer & Markdown Parser
    // ----------------------------------------------------------------------
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Converts markdown to safe, sanitized HTML
     * Protects against XSS injection (<script>, onerror, iframe, javascript: URLs)
     */
    function formatMarkdown(text) {
        if (!text) return '';

        // 1. Code blocks: ```language \n code ```
        let formatted = text.replace(/```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g, (match, lang, code) => {
            const displayLang = escapeHTML(lang.trim()) || 'code';
            return `
                <div class="code-block-container">
                    <div class="code-header">
                        <span>${displayLang}</span>
                        <button class="copy-code-btn" type="button" aria-label="Copy code snippet">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Copy</span>
                        </button>
                    </div>
                    <pre><code>${escapeHTML(code.trim())}</code></pre>
                </div>
            `;
        });

        // 2. Headings (####, ###, ##)
        formatted = formatted.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.*$)/gim, '<h3>$1</h3>');

        // 3. Inline code `code` (escape content)
        formatted = formatted.replace(/`([^`]+)`/g, (m, c) => `<code>${escapeHTML(c)}</code>`);

        // 4. Bold **text** and *italics*
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 5. Blockquotes > text
        formatted = formatted.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');

        // 6. Bullet lists (* item or - item)
        formatted = formatted.replace(/^\s*[\*\-]\s+(.*)$/gim, '<li>$1</li>');
        formatted = formatted.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

        // 7. Sanitize links [text](url) — allow only http / https protocols
        formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (m, label, url) => {
            return `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
        });

        // 8. Line breaks
        formatted = formatted.replace(/\n\n/g, '<br><br>');

        // 9. Strict Sanitization: Remove any remaining unsafe tags/attributes
        return sanitizeHTML(formatted);
    }

    function sanitizeHTML(html) {
        // Strip script, iframe, object, embed, form, input, onclick, onerror, etc.
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/\s*on\w+="[^"]*"/gi, '')
            .replace(/\s*on\w+='[^']*'/gi, '')
            .replace(/\s*on\w+=\w+/gi, '')
            .replace(/javascript:/gi, 'blocked:');
    }

    // ----------------------------------------------------------------------
    // 12. Voice Dictation (Web Speech API)
    // ----------------------------------------------------------------------
    function initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) return;

        try {
            speechRecognitionInstance = new SpeechRec();
            speechRecognitionInstance.continuous = false;
            speechRecognitionInstance.interimResults = true;
            speechRecognitionInstance.lang = 'en-US';

            speechRecognitionInstance.onstart = () => {
                isVoiceListening = true;
                if (voiceBtn) {
                    voiceBtn.classList.add('listening');
                    voiceBtn.setAttribute('title', 'Listening... click to stop');
                }
                messageInput.setAttribute('placeholder', 'Listening... speak now');
                showToast('Listening to voice input...');
            };

            speechRecognitionInstance.onresult = (e) => {
                let transcript = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    transcript += e.results[i][0].transcript;
                }
                if (transcript) {
                    messageInput.value = transcript;
                    adjustTextareaHeight();
                }
            };

            speechRecognitionInstance.onerror = (e) => {
                console.warn('Speech recognition error:', e.error);
                stopVoiceRecognition();
                if (e.error !== 'no-speech') {
                    showToast(`Voice input: ${e.error}`);
                }
            };

            speechRecognitionInstance.onend = () => {
                stopVoiceRecognition();
            };
        } catch (e) {
            console.warn('Speech recognition initialization error:', e);
            speechRecognitionInstance = null;
        }
    }

    function toggleVoiceRecognition() {
        if (!speechRecognitionInstance) {
            showToast('Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
            return;
        }

        if (isVoiceListening) {
            speechRecognitionInstance.stop();
            stopVoiceRecognition();
        } else {
            try {
                speechRecognitionInstance.start();
            } catch (err) {
                console.error('Error starting speech recognition:', err);
                stopVoiceRecognition();
            }
        }
    }

    function stopVoiceRecognition() {
        isVoiceListening = false;
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            voiceBtn.setAttribute('title', 'Voice input (Speech to text)');
        }
        messageInput.setAttribute('placeholder', 'Message NexusAI... (Press Enter to send, Shift+Enter for new line)');
    }

    // ----------------------------------------------------------------------
    // 13. File Attachments Handler
    // ----------------------------------------------------------------------
    function handleFileAttachment(file) {
        if (!file) return;

        // Size limit: 10MB
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size must be under 10MB');
            return;
        }

        pendingAttachment = file;
        renderAttachmentChip(file);

        // For small text/code files, automatically append preview or context
        if (file.type.startsWith('text/') || file.name.match(/\.(js|py|html|css|json|md|txt|csv)$/i)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                if (content && typeof content === 'string') {
                    const snippet = content.slice(0, 800);
                    if (!messageInput.value) {
                        messageInput.value = `Here is the content of "${file.name}":\n\`\`\`\n${snippet}\n\`\`\`\n\nPlease analyze this: `;
                        adjustTextareaHeight();
                    }
                }
            };
            reader.readAsText(file);
        }

        showToast(`Attached: ${file.name}`);
    }

    function renderAttachmentChip(file) {
        if (!attachmentPreviewTray) return;
        attachmentPreviewTray.innerHTML = '';
        attachmentPreviewTray.style.display = 'flex';

        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span class="chip-name">${escapeHTML(file.name)}</span>
            <button type="button" class="chip-remove-btn" title="Remove attachment" aria-label="Remove attachment">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;

        chip.querySelector('.chip-remove-btn').addEventListener('click', clearAttachment);
        attachmentPreviewTray.appendChild(chip);
    }

    function clearAttachment() {
        pendingAttachment = null;
        if (fileInput) fileInput.value = '';
        if (attachmentPreviewTray) {
            attachmentPreviewTray.innerHTML = '';
            attachmentPreviewTray.style.display = 'none';
        }
    }

    // ----------------------------------------------------------------------
    // 14. Clipboard & Helper Utilities
    // ----------------------------------------------------------------------
    function attachCodeCopyHandlers(context) {
        const copyBtns = context.querySelectorAll('.copy-code-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const codeElement = btn.closest('.code-block-container').querySelector('pre code');
                if (codeElement) {
                    copyToClipboard(codeElement.innerText, btn);
                }
            });
        });
    }

    function copyToClipboard(text, btnElement) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span style="color: var(--success-color);">Copied!</span>
            `;
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
            }, 2000);
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
            showToast('Failed to copy to clipboard');
        });
    }

    function formatTimestamp(date) {
        const d = date || new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function scrollToBottom() {
        if (chatViewport) {
            chatViewport.scrollTop = chatViewport.scrollHeight;
        }
    }

    function adjustTextareaHeight() {
        if (!messageInput) return;
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + 'px';
        
        const hasText = messageInput.value.trim().length > 0;
        if (sendBtn) {
            sendBtn.disabled = !hasText || isGenerating;
        }
    }

    function showToast(message, type = 'info') {
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        `;

        if (type === 'success') {
            iconHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
        } else if (type === 'error') {
            iconHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        }

        toast.innerHTML = `${iconHTML}<span>${escapeHTML(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 2800);
    }

    // ----------------------------------------------------------------------
    // 15. Mobile Sidebar Navigation
    // ----------------------------------------------------------------------
    function openMobileSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function closeMobileSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    // ----------------------------------------------------------------------
    // 16. Settings Modal Handlers
    // ----------------------------------------------------------------------
    function openSettingsModal() {
        if (settingsModalBackdrop) {
            settingsModalBackdrop.style.display = 'flex';
            settingsModalBackdrop.setAttribute('aria-hidden', 'false');
            if (settingsUsernameInput) {
                settingsUsernameInput.value = localStorage.getItem(STORAGE_KEYS.USERNAME) || 'Mohamed Ashiq';
            }
            if (settingsApiUrl) {
                settingsApiUrl.value = getBackendUrl();
            }
            if (apiStatusMsg) apiStatusMsg.style.display = 'none';
        }
    }

    function closeSettingsModal() {
        if (settingsModalBackdrop) {
            settingsModalBackdrop.style.display = 'none';
            settingsModalBackdrop.setAttribute('aria-hidden', 'true');
        }
    }

    // ----------------------------------------------------------------------
    // 17. Event Listeners Wiring
    // ----------------------------------------------------------------------
    function attachGlobalEventListeners() {
        
        // Textarea events
        messageInput.addEventListener('input', adjustTextareaHeight);
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = messageInput.value.trim();
                if (text && !isGenerating) {
                    sendMessage(text);
                }
            }
        });

        // Form submit
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = messageInput.value.trim();
            if (text && !isGenerating) {
                sendMessage(text);
            }
        });

        // Stop Generating Button
        if (stopGeneratingBtn) {
            stopGeneratingBtn.addEventListener('click', stopGeneration);
        }

        // Starter Suggestion Cards
        suggestionCards.forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.getAttribute('data-prompt');
                if (prompt && !isGenerating) {
                    sendMessage(prompt);
                }
            });
        });

        // New Chat Button
        newChatBtn.addEventListener('click', createNewChat);

        // Clear Chat Button
        clearChatBtn.addEventListener('click', () => {
            const conv = getActiveConversation();
            if (conv) {
                conv.messages = [];
                conv.updatedAt = Date.now();
                saveConversations();
                renderActiveChatMessages();
                showToast('Chat cleared');
            }
        });

        // Search in Sidebar
        if (chatSearchInput) {
            chatSearchInput.addEventListener('input', () => {
                const hasQuery = chatSearchInput.value.trim().length > 0;
                if (searchClearBtn) searchClearBtn.style.display = hasQuery ? 'flex' : 'none';
                renderSidebarHistory();
            });
        }

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', () => {
                chatSearchInput.value = '';
                searchClearBtn.style.display = 'none';
                renderSidebarHistory();
                chatSearchInput.focus();
            });
        }

        // Voice button
        if (voiceBtn) {
            voiceBtn.addEventListener('click', toggleVoiceRecognition);
        }

        // Attachment button & file input
        if (attachmentBtn && fileInput) {
            attachmentBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleFileAttachment(e.target.files[0]);
                }
            });
        }

        // Mobile & Desktop Sidebar toggles
        toggleSidebarBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                if (sidebar.classList.contains('open')) {
                    closeMobileSidebar();
                } else {
                    openMobileSidebar();
                }
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });

        if (sidebarCloseBtn) {
            sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeMobileSidebar);
        }

        // Model selector dropdown toggle
        if (modelBadgeBtn && modelDropdownContainer) {
            modelBadgeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modelDropdownContainer.classList.toggle('open');
                const isOpen = modelDropdownContainer.classList.contains('open');
                modelBadgeBtn.setAttribute('aria-expanded', String(isOpen));
            });

            modelOptions.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const modelId = opt.getAttribute('data-model-id');
                    setModel(modelId, true);
                    modelDropdownContainer.classList.remove('open');
                    modelBadgeBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }

        // Theme Toggle Quick Button
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', toggleThemeQuick);
        }

        // Settings Modal
        if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);
        if (userProfileBtn) userProfileBtn.addEventListener('click', openSettingsModal);
        if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', closeSettingsModal);
        if (settingsSaveBtn) {
            settingsSaveBtn.addEventListener('click', () => {
                if (settingsUsernameInput) {
                    setUserName(settingsUsernameInput.value.trim(), true);
                }
                if (settingsApiUrl) {
                    const cleanUrl = settingsApiUrl.value.trim();
                    if (cleanUrl) localStorage.setItem(STORAGE_KEYS.API_URL, cleanUrl);
                }
                closeSettingsModal();
                showToast('Settings saved');
            });
        }

        // Theme selection inside settings
        themeOptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-theme-val');
                applyTheme(val);
            });
        });

        // Test API Connection button
        if (testApiBtn && settingsApiUrl && apiStatusMsg) {
            testApiBtn.addEventListener('click', async () => {
                const rawUrl = settingsApiUrl.value.trim();
                if (!rawUrl) return;

                apiStatusMsg.textContent = 'Testing connection...';
                apiStatusMsg.className = 'api-status-msg';
                apiStatusMsg.style.display = 'block';

                try {
                    // Extract base url for health check endpoint
                    const urlObj = new URL(rawUrl);
                    const healthCheckUrl = `${urlObj.origin}/`;

                    const res = await fetch(healthCheckUrl, { method: 'GET' });
                    if (res.ok) {
                        const data = await res.json();
                        apiStatusMsg.textContent = `✓ Connected! Model: ${data.model || 'Gemini online'}`;
                        apiStatusMsg.className = 'api-status-msg success';
                    } else {
                        apiStatusMsg.textContent = `⚠️ Server returned HTTP ${res.status}`;
                        apiStatusMsg.className = 'api-status-msg error';
                    }
                } catch (err) {
                    apiStatusMsg.textContent = '✕ Could not reach server. Verify backend is running on port 5000.';
                    apiStatusMsg.className = 'api-status-msg error';
                }
            });
        }

        // Clear All Data
        if (clearAllDataBtn) {
            clearAllDataBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
                    conversations = [];
                    saveConversations();
                    createNewChat();
                    closeSettingsModal();
                    showToast('All conversations deleted');
                }
            });
        }

        // Rename modal buttons
        if (renameSaveBtn) renameSaveBtn.addEventListener('click', saveRenamedChat);
        if (renameCancelBtn) renameCancelBtn.addEventListener('click', closeRenameDialog);
        if (renameCloseBtn) renameCloseBtn.addEventListener('click', closeRenameDialog);
        if (renameChatInput) {
            renameChatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveRenamedChat();
                else if (e.key === 'Escape') closeRenameDialog();
            });
        }

        // Close dropdowns & modals on outside click
        window.addEventListener('click', (e) => {
            if (modelDropdownContainer && !modelDropdownContainer.contains(e.target)) {
                modelDropdownContainer.classList.remove('open');
                if (modelBadgeBtn) modelBadgeBtn.setAttribute('aria-expanded', 'false');
            }

            if (settingsModalBackdrop && e.target === settingsModalBackdrop) {
                closeSettingsModal();
            }

            if (renameModalBackdrop && e.target === renameModalBackdrop) {
                closeRenameDialog();
            }
        });

        // Keyboard Shortcuts: Ctrl+N, Escape
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                createNewChat();
            } else if (e.key === 'Escape') {
                if (modelDropdownContainer) modelDropdownContainer.classList.remove('open');
                closeSettingsModal();
                closeRenameDialog();
                if (window.innerWidth <= 768) closeMobileSidebar();
            }
        });
    }

    // Run initialization
    init();
});

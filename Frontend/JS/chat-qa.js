if (typeof window.ChatQA === 'undefined') {
window.ChatQA = class {
    constructor() {
        this.pdfId = new URLSearchParams(window.location.search).get('pdfId');
        this.messages = [];
        this.welcomeHTML = '';
        this.lastQuestion = null;
        this.loadingHistory = false;
        this.init();
    }

    init() {
        if (!this.pdfId) {
            this.showError('ID del PDF no proporcionado');
            return;
        }

        // Guardar el HTML del mensaje de bienvenida para poder restaurarlo al limpiar el chat
        const welcome = document.querySelector('.qa-welcome');
        if (welcome) {
            this.welcomeHTML = welcome.outerHTML;
        }

        this.loadPdfInfo();
        this.setupEventListeners();
        this.loadHistory();
    }

    async loadPdfInfo() {
        try {
            const response = await apiCall(`/api/pdfs/${this.pdfId}`, {
                method: 'GET'
            });

            if (response && response.ok) {
                const data = await response.json();
                const title = data.pdf.title || data.pdf.file_name;
                document.getElementById('pdfTitle').textContent = `Documento: ${title}`;
            }
        } catch (error) {
            console.error('Error loading PDF info:', error);
        }
    }

    setupEventListeners() {
        const input = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const clearBtn = document.getElementById('clearChatBtn');

        if (!input) {
            console.error('Elemento #chatInput no encontrado.');
            return;
        }

        // Event listener para el botón de enviar
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Event listener para Enter en el input
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Event listener para habilitar/deshabilitar botón
        input.addEventListener('input', () => {
            if (sendButton) {
                sendButton.disabled = input.value.trim().length === 0;
            }
        });

        // Limpiar chat
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearChat());
        }

        // Event listeners para suggestion chips (modernas)
        document.querySelectorAll('.qa-suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const suggestion = chip.getAttribute('data-suggestion') || chip.textContent.trim();
                if (suggestion) {
                    this.sendMessage(suggestion);
                }
            });
        });
    }

    async sendMessage(message = null) {
        const input = document.getElementById('chatInput');
        const question = message || (input ? input.value.trim() : '');

        if (!question) return;

        this.lastQuestion = question;

        // Clear input if it's a manual message
        if (!message && input) {
            input.value = '';
        }

        // Add user message to chat
        this.addMessage(question, 'user');

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const response = await apiCall(`/api/ai/chat/${this.pdfId}`, {
                method: 'POST',
                body: JSON.stringify({ question })
            });

            this.hideTypingIndicator();

            if (!response || !response.ok) {
                const errorData = response ? await response.json().catch(() => ({})) : {};
                throw new Error(errorData.error || `Error ${response?.status}: ${response?.statusText}` || 'Error al obtener respuesta');
            }

            const data = await response.json();
            this.addMessage(data.answer, 'ai');

        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.showError(error.message || 'Error al obtener respuesta del asistente');
        }
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const welcomeMessage = messagesContainer.querySelector('.qa-welcome');
        
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `qa-message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'qa-message-avatar ' + (sender === 'user' ? 'qa-avatar-user' : 'qa-avatar-ai');
        if (sender === 'user') {
            avatar.textContent = 'Yo';
        } else {
            const img = document.createElement('img');
            img.src = '/Assets/Imagenes/Zorro-IA.png';
            img.alt = 'AI';
            img.width = 32;
            img.height = 32;
            avatar.appendChild(img);
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'qa-message-content';
        messageContent.innerHTML = this.formatMessage(content);

        // Botón copiar para respuestas de IA
        if (sender === 'ai') {
            this.attachCopyButton(messageContent, this.stripHtml(content));
        }

        const messageTime = document.createElement('div');
        messageTime.className = 'qa-message-time';
        messageTime.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(avatar);
        const contentWrapper = document.createElement('div');
        contentWrapper.appendChild(messageContent);
        contentWrapper.appendChild(messageTime);
        messageDiv.appendChild(contentWrapper);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        if (!this.loadingHistory) {
            this.messages.push({ content, sender, timestamp: new Date().toISOString() });
            this.saveHistory();
        }
    }

    formatMessage(content) {
        // Simple formatting for better readability
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.style.display = 'flex';
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.style.display = 'none';
    }

    showError(message) {
        // Muestra el error dentro del contenedor de mensajes moderno
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        // Crear estructura similar a addMessage
        const messageDiv = document.createElement('div');
        messageDiv.className = 'qa-message ai';

        const avatar = document.createElement('div');
        avatar.className = 'qa-message-avatar qa-avatar-ai';
        const img = document.createElement('img');
        img.src = '/Assets/Imagenes/Zorro-IA.png';
        img.alt = 'AI';
        img.width = 32;
        img.height = 32;
        avatar.appendChild(img);

        const contentWrapper = document.createElement('div');

        const content = document.createElement('div');
        content.className = 'qa-message-content qa-error';
        content.innerHTML = `<strong>Error:</strong> ${message}`;

        // Botón Reintentar si existe última pregunta
        if (this.lastQuestion) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'qa-copy-btn';
            retryBtn.title = 'Reintentar';
            retryBtn.innerHTML = '↻';
            retryBtn.addEventListener('click', () => this.sendMessage(this.lastQuestion));
            content.appendChild(retryBtn);
        }

        const time = document.createElement('div');
        time.className = 'qa-message-time';
        time.textContent = new Date().toLocaleTimeString();

        contentWrapper.appendChild(content);
        contentWrapper.appendChild(time);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Historial en localStorage
    saveHistory() {
        try {
            const key = `chatQA_history_${this.pdfId}`;
            localStorage.setItem(key, JSON.stringify(this.messages));
        } catch (e) {
            console.warn('No se pudo guardar el historial:', e);
        }
    }

    loadHistory() {
        try {
            const key = `chatQA_history_${this.pdfId}`;
            const raw = localStorage.getItem(key);
            if (!raw) return;
            const history = JSON.parse(raw);
            if (!Array.isArray(history) || history.length === 0) return;
            this.messages = history;
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) messagesContainer.innerHTML = '';
            this.loadingHistory = true;
            history.forEach(m => this.addMessage(m.content, m.sender));
            this.loadingHistory = false;
        } catch (e) {
            console.warn('No se pudo cargar el historial:', e);
        }
    }

    clearChat() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;
        messagesContainer.innerHTML = this.welcomeHTML || '';
        this.messages = [];
        this.saveHistory();
        this.hideTypingIndicator();
    }

    attachCopyButton(contentEl, textToCopy) {
        const btn = document.createElement('button');
        btn.className = 'qa-copy-btn';
        btn.title = 'Copiar respuesta';
        btn.innerHTML = '⎘';
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(textToCopy);
                btn.classList.add('copied');
                btn.title = 'Copiado';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.title = 'Copiar respuesta';
                }, 1500);
            } catch (e) {
                console.warn('No se pudo copiar al portapapeles:', e);
            }
        });
        contentEl.appendChild(btn);
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }
}
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatQA) {
        window.chatQA = new window.ChatQA();
    }
});
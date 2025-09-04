if (typeof window.ChatQA === 'undefined') {
window.ChatQA = class {
    constructor() {
        this.pdfId = new URLSearchParams(window.location.search).get('pdfId');
        this.messages = [];
        this.init();
    }

    init() {
        if (!this.pdfId) {
            this.showError('ID del PDF no proporcionado');
            return;
        }

        this.loadPdfInfo();
        this.setupEventListeners();
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
        const input = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        // Event listener para el botón de enviar
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Event listener para Enter en el input
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Event listener para habilitar/deshabilitar botón
        input.addEventListener('input', () => {
            sendButton.disabled = input.value.trim().length === 0;
        });

        // Event listeners para suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const suggestion = chip.getAttribute('data-suggestion');
                if (suggestion) {
                    this.sendMessage(suggestion);
                }
            });
        });
    }

    async sendMessage(message = null) {
        const input = document.getElementById('messageInput');
        const question = message || input.value.trim();

        if (!question) return;

        // Debug info (can be removed in production)
        console.log('Sending question to PDF ID:', this.pdfId);

        // Clear input if it's a manual message
        if (!message) {
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
            this.addMessage(`Error: ${error.message}. Por favor, verifica que estés autenticado y que el PDF sea válido.`, 'ai');
        }
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMessage(content);

        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(avatar);
        const contentWrapper = document.createElement('div');
        contentWrapper.appendChild(messageContent);
        contentWrapper.appendChild(messageTime);
        messageDiv.appendChild(contentWrapper);

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        this.messages.push({ content, sender, timestamp: new Date() });
    }

    formatMessage(content) {
        // Simple formatting for better readability
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    showTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'flex';
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        document.getElementById('typingIndicator').style.display = 'none';
    }

    showError(message) {
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.innerHTML = `<div class="error-message">${message}</div>`;
    }
}
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatQA) {
        window.chatQA = new window.ChatQA();
    }
});
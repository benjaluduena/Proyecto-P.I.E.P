// Función para inicializar la página con un classroomId específico
function initClassroomPage(classroomId) {
  if (!classroomId) {
    console.error("No se proporcionó classroomId");
    return;
  }

  // Redirige a la misma página con el classroomId en los parámetros de URL
  const url = new URL(window.location.href);
  url.searchParams.set("classroomId", classroomId);
  window.location.href = url.toString();

  // O, si quieres inicializar sin recargar, podrías hacer:
  // const app = new ClassroomApp();
  // app.classroomId = classroomId;
  // app.loadClassroomInfo();
  // app.loadPosts();
  console.log('Clase seleccionada:', classroomId);
}

// Configuration and State Management
class ClassroomApp {
  constructor() {
    this.classroomId = new URLSearchParams(window.location.search).get("classroomId");
    this.posts = [];
    this.isLoading = false;
    this.currentUser = null;

    this.init();
  }

  async init() {
    if (!this.classroomId) {
      this.showNotification("Error","No se encontró el classroom", "error");
      setTimeout(() => window.location.href = "/index.html", 2000);
      return;
    }

    this.initEventListeners();
    await this.loadClassroomInfo();
    await this.loadPosts();
  }

  initEventListeners() {
    // Form submission
    document.getElementById("newPostForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.createPost();
    });

    // Character counter
    const textarea = document.getElementById("postContent");
    const charCount = document.getElementById("charCount");
    textarea.addEventListener("input", () => {
      charCount.textContent = textarea.value.length;
      charCount.style.color = textarea.value.length > 1800 ? "var(--danger)" : "var(--gray-400)";
    });

    // File input
    const fileInput = document.getElementById("postFile");
    fileInput.addEventListener("change", () => this.handleFileSelect());

    // Remove file
    document.getElementById("removeFileBtn").addEventListener("click", () => this.clearFileSelection());

    // Clear form
    document.getElementById("clearFormBtn").addEventListener("click", () => this.clearForm());

    // Share material button
    document.getElementById("shareResourceBtn").addEventListener("click", () => this.openShareMaterialModal());
  }

  // Session Management
  getAccessToken() {
    try {
      const session = localStorage.getItem("session");
      return session ? JSON.parse(session).access_token : null;
    } catch (error) {
      console.error("Error parsing session:", error);
      return null;
    }
  }

  // File Handling
  handleFileSelect() {
    const fileInput = document.getElementById("postFile");
    const file = fileInput.files[0];
    const preview = document.getElementById("filePreview");
    const fileInfo = document.getElementById("fileInfo");

    if (!file) {
      this.clearFileSelection();
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.showNotification("Error","El archivo es demasiado grande (máximo 10MB)", "error");
      fileInput.value = "";
      return;
    }

    if (file.type.startsWith("image/")) {
      this.showImagePreview(file, preview, fileInfo);
    } else {
      this.showFileInfo(file, preview, fileInfo);
    }
  }

  showImagePreview(file, preview, fileInfo) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = "block";
      fileInfo.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  showFileInfo(file, preview, fileInfo) {
    preview.style.display = "none";

    const fileName = document.getElementById("fileName");
    const fileSize = document.getElementById("fileSize");
    const fileIcon = document.getElementById("fileIcon");

    fileName.textContent = file.name;
    fileSize.textContent = this.formatFileSize(file.size);

    // Set appropriate icon based on file type
    if (file.type.includes("pdf")) {
      fileIcon.textContent = "📄";
      fileIcon.style.background = "var(--danger)";
    } else if (file.type.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")) {
      fileIcon.textContent = "📝";
      fileIcon.style.background = "var(--primary)";
    } else {
      fileIcon.textContent = "📎";
      fileIcon.style.background = "var(--gray-500)";
    }

    fileInfo.style.display = "block";
  }

  clearFileSelection() {
    const fileInput = document.getElementById("postFile");
    const preview = document.getElementById("filePreview");
    const fileInfo = document.getElementById("fileInfo");

    fileInput.value = "";
    preview.style.display = "none";
    preview.src = "";
    fileInfo.style.display = "none";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  clearForm() {
    document.getElementById("postContent").value = "";
    document.getElementById("charCount").textContent = "0";
    this.clearFileSelection();
  }

  // API Calls
  async makeRequest(url, options = {}) {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error("Sesión expirada");
    }

    const defaultHeaders = {
      "Authorization": `Bearer ${token}`
    };

    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async loadClassroomInfo() {
    try {
      const classroom = await this.makeRequest(`/api/classroom/${this.classroomId}`);
      document.getElementById("classroomTitle").textContent = classroom.name;
      document.getElementById("classroomSubtitle").textContent = `${classroom.subject} • ${classroom.description}`;
    } catch (error) {
      console.error("Error loading classroom info:", error);
      this.showNotification("Error","No se pudo cargar la información del classroom", "error");
      document.getElementById("classroomTitle").textContent = "Error al cargar";
      document.getElementById("classroomSubtitle").textContent = "No se pudo cargar la información";
    }
  }

  async loadPosts() {
    try {
      this.isLoading = true;
      this.posts = await this.makeRequest(`/api/classroom/${this.classroomId}/posts`);
      this.renderPosts();
      this.updatePostsCount();
    } catch (error) {
      console.error("Error loading posts:", error);
      this.showNotification("Error","Error al cargar las publicaciones", "error");
      document.getElementById("postsContainer").innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <h3>Error al cargar publicaciones</h3>
              <p>Por favor, intenta recargar la página</p>
            </div>
          `;
    } finally {
      this.isLoading = false;
    }
  }

  renderPosts() {
    const container = document.getElementById("postsContainer");

    if (this.posts.length === 0) {
      container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📝</div>
              <h3>No hay publicaciones aún</h3>
              <p>Sé el primero en compartir algo con la clase</p>
            </div>
          `;
      return;
    }

    container.innerHTML = this.posts.map(post => this.renderPostCard(post)).join("");

    // Add event listeners for comment forms
    document.querySelectorAll(".comment-form").forEach(form => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const postId = form.dataset.postId;
        this.addComment(postId, form);
      });
    });
  }

  renderPostCard(post) {
    const authorInitials = this.getInitials(post.author_name || "Docente");
    const postDate = this.formatDate(post.created_at);
    const hasAttachment = post.file_url;
    const isAIMaterial = post.material_type === 'ai_generated';

    return `
          <article class="post-card ${isAIMaterial ? 'ai-material-post' : ''}">
            <div class="post-header">
              <div class="post-author">
                <div class="author-avatar">${authorInitials}</div>
                <div class="author-info">
                  <h4>${this.escapeHtml(post.author_name || "Docente")}</h4>
                  <div class="post-date">${postDate}</div>
                </div>
              </div>
              ${isAIMaterial ? '<div class="ai-material-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6C7 6.23676 7.04072 6.46184 7.11469 6.66999C7.22686 6.98559 7.17357 7.33638 6.97276 7.60444C6.77194 7.8725 6.45026 8.02222 6.11585 8.00327C6.0776 8.0011 6.03898 8 6 8C4.89543 8 4 8.89543 4 10C4 10.5129 4.19174 10.9786 4.50903 11.3331C4.84885 11.7128 4.84885 12.2872 4.50903 12.6669C4.19174 13.0214 4 13.4871 4 14C4 14.8842 4.57447 15.6369 5.37327 15.9001C5.84924 16.057 6.1356 16.5419 6.04308 17.0345C6.01489 17.1846 6 17.3401 6 17.5C6 18.8807 7.11929 20 8.5 20C9.75862 20 10.8015 19.069 10.9746 17.8583C10.9806 17.8165 10.9891 17.7756 11 17.7358V6C11 4.89543 10.1046 4 9 4C7.89543 4 7 4.89543 7 6ZM13 17.7358C13.0109 17.7756 13.0194 17.8165 13.0254 17.8583C13.1985 19.069 14.2414 20 15.5 20C16.8807 20 18 18.8807 18 17.5C18 17.3401 17.9851 17.1846 17.9569 17.0345C17.8644 16.5419 18.1508 16.057 18.6267 15.9001C19.4255 15.6369 20 14.8842 20 14C20 13.4871 19.8083 13.0214 19.491 12.6669C19.1511 12.2872 19.1511 11.7128 19.491 11.3331C19.8083 10.9786 20 10.5129 20 10C20 8.89543 19.1046 8 18 8C17.961 8 17.9224 8.0011 17.8841 8.00327C17.5497 8.02222 17.2281 7.8725 17.0272 7.60444C16.8264 7.33638 16.7731 6.98559 16.8853 6.66999C16.9593 6.46184 17 6.23676 17 6C17 4.89543 16.1046 4 15 4C13.8954 4 13 4.89543 13 6V17.7358ZM9 2C10.1947 2 11.2671 2.52376 12 3.35418C12.7329 2.52376 13.8053 2 15 2C17.2091 2 19 3.79086 19 6C19 6.04198 18.9994 6.08382 18.9981 6.12552C20.7243 6.56889 22 8.13546 22 10C22 10.728 21.8049 11.4116 21.4646 12C21.8049 12.5884 22 13.272 22 14C22 15.4817 21.1949 16.7734 19.9999 17.4646L20 17.5C20 19.9853 17.9853 22 15.5 22C14.0859 22 12.8248 21.3481 12 20.3285C11.1752 21.3481 9.91405 22 8.5 22C6.01472 22 4 19.9853 4 17.5L4.00014 17.4646C2.80512 16.7734 2 15.4817 2 14C2 13.272 2.19513 12.5884 2.53536 12C2.19513 11.4116 2 10.728 2 10C2 8.13546 3.27573 6.56889 5.00194 6.12552C5.00065 6.08382 5 6.04198 5 6C5 3.79086 6.79086 2 9 2Z"></path></svg> Material IA</div>' : ''}
            </div>
            
            <div class="post-content">
              ${post.content ? `<div class="post-text">${this.escapeHtml(post.content)}</div>` : ''}
              
              ${hasAttachment ? this.renderAttachment(post.file_url) : ''}
              
              ${isAIMaterial ? this.renderAIMaterialAccess(post.material_id) : ''}
            </div>

            <div class="comments-section">
              <div class="comments-header">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.29117 20.8242L2 22L3.17581 16.7088C2.42544 15.3056 2 13.7025 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C10.2975 22 8.6944 21.5746 7.29117 20.8242ZM7.58075 18.711L8.23428 19.0605C9.38248 19.6745 10.6655 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 13.3345 4.32549 14.6175 4.93949 15.7657L5.28896 16.4192L4.63416 19.3658L7.58075 18.711Z"></path></svg>
                ${post.comments.length} comentario${post.comments.length !== 1 ? 's' : ''}
              </div>
              
              <div class="comments-list">
                ${post.comments.map(comment => this.renderComment(comment)).join('')}
              </div>
              
              <form class="comment-form" data-post-id="${post.id}">
                <input 
                  type="text" 
                  class="comment-input" 
                  placeholder="Escribe un comentario..."
                  required
                  maxlength="500"
                >
                <button type="submit" class="btn-purple-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 1.34558C3.58425 1.34558 3.66714 1.36687 3.74096 1.40747L22.2034 11.5618C22.4454 11.6949 22.5337 11.9989 22.4006 12.2409C22.3549 12.324 22.2865 12.3924 22.2034 12.4381L3.74096 22.5924C3.499 22.7255 3.19497 22.6372 3.06189 22.3953C3.02129 22.3214 3 22.2386 3 22.1543V1.84558C3 1.56944 3.22386 1.34558 3.5 1.34558ZM5 4.38249V10.9999H10V12.9999H5V19.6174L18.8499 11.9999L5 4.38249Z"></path></svg>
                </button>
              </form>
            </div>
          </article>
        `;
  }

  renderAttachment(fileUrl) {
    const isImage = fileUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i);

    if (isImage) {
      return `
            <div class="post-attachment">
              <img 
                src="${fileUrl}" 
                class="post-image" 
                alt="Imagen adjunta"
                loading="lazy"
                onclick="this.requestFullscreen()"
                style="cursor: zoom-in;"
              />
            </div>
          `;
    } else {
      const fileName = fileUrl.split('/').pop() || 'Archivo adjunto';
      return `
            <div class="post-attachment">
              <a href="${fileUrl}" target="_blank" rel="noopener" class="attachment-link">
                <span>📎</span>
                <span>${this.escapeHtml(fileName)}</span>
                <span>↗️</span>
              </a>
            </div>
          `;
    }
  }

  renderAIMaterialAccess(materialId) {
    return `
          <div class="ai-material-access">
            <div class="ai-material-card">
              <div class="ai-material-header">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6C7 6.23676 7.04072 6.46184 7.11469 6.66999C7.22686 6.98559 7.17357 7.33638 6.97276 7.60444C6.77194 7.8725 6.45026 8.02222 6.11585 8.00327C6.0776 8.0011 6.03898 8 6 8C4.89543 8 4 8.89543 4 10C4 10.5129 4.19174 10.9786 4.50903 11.3331C4.84885 11.7128 4.84885 12.2872 4.50903 12.6669C4.19174 13.0214 4 13.4871 4 14C4 14.8842 4.57447 15.6369 5.37327 15.9001C5.84924 16.057 6.1356 16.5419 6.04308 17.0345C6.01489 17.1846 6 17.3401 6 17.5C6 18.8807 7.11929 20 8.5 20C9.75862 20 10.8015 19.069 10.9746 17.8583C10.9806 17.8165 10.9891 17.7756 11 17.7358V6C11 4.89543 10.1046 4 9 4C7.89543 4 7 4.89543 7 6ZM13 17.7358C13.0109 17.7756 13.0194 17.8165 13.0254 17.8583C13.1985 19.069 14.2414 20 15.5 20C16.8807 20 18 18.8807 18 17.5C18 17.3401 17.9851 17.1846 17.9569 17.0345C17.8644 16.5419 18.1508 16.057 18.6267 15.9001C19.4255 15.6369 20 14.8842 20 14C20 13.4871 19.8083 13.0214 19.491 12.6669C19.1511 12.2872 19.1511 11.7128 19.491 11.3331C19.8083 10.9786 20 10.5129 20 10C20 8.89543 19.1046 8 18 8C17.961 8 17.9224 8.0011 17.8841 8.00327C17.5497 8.02222 17.2281 7.8725 17.0272 7.60444C16.8264 7.33638 16.7731 6.98559 16.8853 6.66999C16.9593 6.46184 17 6.23676 17 6C17 4.89543 16.1046 4 15 4C13.8954 4 13 4.89543 13 6V17.7358ZM9 2C10.1947 2 11.2671 2.52376 12 3.35418C12.7329 2.52376 13.8053 2 15 2C17.2091 2 19 3.79086 19 6C19 6.04198 18.9994 6.08382 18.9981 6.12552C20.7243 6.56889 22 8.13546 22 10C22 10.728 21.8049 11.4116 21.4646 12C21.8049 12.5884 22 13.272 22 14C22 15.4817 21.1949 16.7734 19.9999 17.4646L20 17.5C20 19.9853 17.9853 22 15.5 22C14.0859 22 12.8248 21.3481 12 20.3285C11.1752 21.3481 9.91405 22 8.5 22C6.01472 22 4 19.9853 4 17.5L4.00014 17.4646C2.80512 16.7734 2 15.4817 2 14C2 13.272 2.19513 12.5884 2.53536 12C2.19513 11.4116 2 10.728 2 10C2 8.13546 3.27573 6.56889 5.00194 6.12552C5.00065 6.08382 5 6.04198 5 6C5 3.79086 6.79086 2 9 2Z"></path></svg>
                <span class="ai-title">Material Educativo de IA</span>
              </div>
              <div class="ai-material-description">
                Haz clic para acceder al contenido educativo generado por IA
              </div>
              <button class="btn-purple" onclick="openAIMaterial(${materialId})">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 21V23H11V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H9C10.1947 3 11.2671 3.52375 12 4.35418C12.7329 3.52375 13.8053 3 15 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H13ZM20 19V5H15C13.8954 5 13 5.89543 13 7V19H20ZM11 19V7C11 5.89543 10.1046 5 9 5H4V19H11Z"></path></svg>
                Ver Material
              </button>
            </div>
          </div>
        `;
  }

  renderComment(comment) {
    const authorInitials = this.getInitials(comment.user_name);

    return `
          <div class="comment-item">
            <div class="comment-avatar">${authorInitials}</div>
            <div class="comment-content">
              <div class="comment-author">${this.escapeHtml(comment.user_name)}</div>
              <div class="comment-text">${this.escapeHtml(comment.text)}</div>
            </div>
          </div>
        `;
  }

  async createPost() {
    const content = document.getElementById("postContent").value.trim();
    const fileInput = document.getElementById("postFile");
    const file = fileInput.files[0];
    const createBtn = document.getElementById("createPostBtn");

    if (!content && !file) {
      this.showNotification("Advertencia","Escribe algo o selecciona un archivo", "warning");
      return;
    }

    try {
      createBtn.disabled = true;
      createBtn.innerHTML = '<div class="loading-spinner"></div> Publicando...';

      const formData = new FormData();
      formData.append("content", content);
      if (file) {
        formData.append("file", file);
      }

      await this.makeRequest(`/api/classroom/${this.classroomId}/posts`, {
        method: "POST",
        body: formData
      });

      this.showNotification("Exito","¡Publicación creada exitosamente!", "success");
      this.clearForm();
      await this.loadPosts();

    } catch (error) {
      console.error("Error creating post:", error);
      this.showNotification("Error","Error al crear la publicación. Intenta nuevamente.", "error");
    } finally {
      createBtn.disabled = false;
      createBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19H20V12H22V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V12H4V19ZM13 9V16H11V9H6L12 3L18 9H13Z"></path></svg> Publicar';
    }
  }

  async addComment(postId, form) {
    const input = form.querySelector(".comment-input");
    const text = input.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!text) {
      input.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="loading-spinner"></div>';

      await this.makeRequest(`/api/post/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text })
      });

      input.value = "";
      this.showNotification("Exito","Comentario agregado", "success");
      await this.loadPosts();

    } catch (error) {
      console.error("Error adding comment:", error);
      this.showNotification("Error","Error al agregar el comentario", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💬</span><span class="sr-only">Comentar</span>';
    }
  }

  // Utility functions
  updatePostsCount() {
    const countElement = document.getElementById("postsCount");
    const count = this.posts.length;
    countElement.textContent = `${count} publicación${count !== 1 ? 'es' : ''}`;
  }

  getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `Hace ${diffInMinutes} minuto${diffInMinutes !== 1 ? 's' : ''}`;
      } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours);
        return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
      } else if (diffInHours < 168) { // 7 days
        const days = Math.floor(diffInHours / 24);
        return `Hace ${days} día${days !== 1 ? 's' : ''}`;
      } else {
        return date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return "Fecha inválida";
    }
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  showNotification(title, text, type = "success") {
    const container = document.getElementById("notificationContainer");
    const notification = document.createElement("div");

    // Elige el icono según el tipo
    let icon = "";
    if (type === "success") {
      icon = `<svg class="notif-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM17.4571 9.45711L11 15.9142L6.79289 11.7071L8.20711 10.2929L11 13.0858L16.0429 8.04289L17.4571 9.45711Z"></path></svg>`;
    } else if (type === "error") {
      icon = `<svg class="notif-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444"><path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z"></path></svg>`;
    } else if (type === "info") {
      icon = `<span class="notif-icon" style="color:#3b82f6;">&#8505;</span>`;
    } else {
      icon = `<span class="notif-icon">&#9888;</span>`;
    }

    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notif-content">
            ${icon}
            <div>
                <div class="notif-title">${title}</div>
                <div class="notif-text">${text}</div>
            </div>
        </div>
    `;

    container.appendChild(notification);

    setTimeout(() => notification.classList.add("show"), 100);

    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  // Error boundary
  handleError(error, context = "") {
    console.error(`Error in ${context}:`, error);

    if (error.message.includes("Sesión expirada") || error.message.includes("401")) {
      this.showNotification("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.", "error");
      setTimeout(() => {
        localStorage.removeItem("session");
        window.location.href = "/login.html";
      }, 3000);
      return;
    }

    this.showNotification(`Error: ${error.message}`, "error");
  }

  // Share Material Modal Functions
  async openShareMaterialModal() {
    const modal = document.getElementById("shareMaterialModal");
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 100);

    await this.loadTeacherMaterials();
  }

  closeShareMaterialModal() {
    const modal = document.getElementById("shareMaterialModal");
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      this.resetShareModal();
    }, 300);
  }

  resetShareModal() {
    document.getElementById("materialsList").innerHTML = "";
    document.getElementById("previewSection").style.display = "none";
    document.getElementById("shareMaterialBtn").disabled = true;
    this.selectedMaterial = null;
  }

  async loadTeacherMaterials() {
    const loading = document.getElementById("materialsLoading");
    const materialsList = document.getElementById("materialsList");

    try {
      loading.style.display = "block";
      materialsList.innerHTML = "";

      const response = await this.makeRequest("/api/ai/teacher/materials");
      const { materials } = response;

      if (!materials || materials.length === 0) {
        materialsList.innerHTML = `
              <div class="empty-materials">
                <div class="empty-materials-icon">📚</div>
                <h4>No tienes materiales de IA</h4>
                <p>Primero necesitas generar contenido educativo desde tus PDFs.</p>
                <button class="btn btn-primary" onclick="this.closeShareMaterialModal()">
                  Entendido
                </button>
              </div>
            `;
        return;
      }

      // Renderizar materiales
      materialsList.innerHTML = materials.map(pdf => `
            <div class="pdf-group">
              <h5 style="color: var(--gray-700); margin-bottom: 1rem; font-size: 1rem; font-weight: 600;">
                📄 ${pdf.pdf_title}
              </h5>
              ${pdf.materials.map(material => `
                <div class="material-item" data-material-id="${material.id}" data-pdf-id="${pdf.pdf_id}" data-pdf-title="${pdf.pdf_title}">
                  <div class="material-header">
                    <div class="material-title">${material.type_display}</div>
                    <div class="material-type">${material.type}</div>
                  </div>
                  <div class="material-info">
                    <span>📅 ${new Date(material.created_at).toLocaleDateString()}</span>
                    <span>📄 ${pdf.pdf_file_name}</span>
                  </div>
                  <div class="material-preview-text">
                    ${this.getMaterialPreviewText(material.content, material.type)}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('');

      // Agregar event listeners a los materiales
      document.querySelectorAll('.material-item').forEach(item => {
        item.addEventListener('click', () => this.selectMaterial(item));
      });

    } catch (error) {
      console.error("Error cargando materiales:", error);
      materialsList.innerHTML = `
            <div class="empty-materials">
              <div class="empty-materials-icon">⚠️</div>
              <h4>Error al cargar materiales</h4>
              <p>No se pudieron cargar tus materiales de IA. Intenta nuevamente.</p>
            </div>
          `;
    } finally {
      loading.style.display = "none";
    }
  }

  getMaterialPreviewText(content, type) {
    if (!content) return "Sin contenido disponible";

    switch (type) {
      case 'resumen':
        return content.resumen_general || content.summary || "Resumen disponible";
      case 'multiple_choice':
        return content.preguntas && content.preguntas.length > 0
          ? `${content.preguntas.length} preguntas de opción múltiple`
          : "Preguntas disponibles";
      case 'verdadero_falso':
        return content.preguntas && content.preguntas.length > 0
          ? `${content.preguntas.length} preguntas verdadero/falso`
          : "Preguntas disponibles";
      case 'flashcards':
        return content.__type === 'mapa_mental'
          ? "Mapa mental disponible"
          : "Tarjetas de estudio disponibles";
      case 'problema':
        return "Problemas prácticos disponibles";
      case 'recomendacion_video':
        return "Recomendaciones de videos disponibles";
      case 'recomendacion_texto':
        return "Recomendaciones de textos disponibles";
      default:
        return "Contenido disponible";
    }
  }

  selectMaterial(item) {
    // Remover selección anterior
    document.querySelectorAll('.material-item').forEach(i => i.classList.remove('selected'));

    // Seleccionar nuevo material
    item.classList.add('selected');

    // Obtener datos del material
    const materialId = item.dataset.materialId;
    const pdfId = item.dataset.pdfId;
    const pdfTitle = item.dataset.pdfTitle;

    this.selectedMaterial = {
      id: materialId,
      pdf_id: pdfId,
      pdf_title: pdfTitle,
      element: item
    };

    // Mostrar preview
    this.showMaterialPreview(materialId);

    // Habilitar botón de compartir
    document.getElementById("shareMaterialBtn").disabled = false;
  }

  async showMaterialPreview(materialId) {
    const previewSection = document.getElementById("previewSection");
    const materialPreview = document.getElementById("materialPreview");

    try {
      const response = await this.makeRequest(`/api/ai/content/${materialId}`);
      const { output } = response;

      previewSection.style.display = "block";
      materialPreview.innerHTML = this.renderMaterialPreview(output);

    } catch (error) {
      console.error("Error obteniendo preview:", error);
      materialPreview.innerHTML = `
            <div class="preview-content">
              <p>No se pudo cargar la vista previa del material.</p>
            </div>
          `;
    }
  }

  renderMaterialPreview(output) {
    const { content, type } = output;

    switch (type) {
      case 'resumen':
        return `
              <div class="preview-content">
                <h5>Resumen General</h5>
                <p>${content.resumen_general || content.summary || 'Sin resumen disponible'}</p>
                
                ${content.conceptos_clave && content.conceptos_clave.length > 0 ? `
                  <h5>Conceptos Clave</h5>
                  <ul>
                    ${content.conceptos_clave.map(concepto => `<li>${concepto}</li>`).join('')}
                  </ul>
                ` : ''}
                
                ${content.conclusiones ? `
                  <h5>Conclusiones</h5>
                  <p>${content.conclusiones}</p>
                ` : ''}
              </div>
            `;

      case 'multiple_choice':
        return `
              <div class="preview-content">
                <h5>Preguntas de Opción Múltiple</h5>
                <p>${content.preguntas ? content.preguntas.length : 0} preguntas disponibles</p>
                ${content.preguntas && content.preguntas.length > 0 ? `
                  <div style="margin-top: 1rem;">
                    <strong>Primera pregunta:</strong>
                    <p>${content.preguntas[0].enunciado}</p>
                    <ul>
                      ${content.preguntas[0].opciones.map((opcion, index) =>
          `<li>${String.fromCharCode(65 + index)}. ${opcion}</li>`
        ).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            `;

      case 'verdadero_falso':
        return `
              <div class="preview-content">
                <h5>Preguntas Verdadero/Falso</h5>
                <p>${content.preguntas ? content.preguntas.length : 0} preguntas disponibles</p>
                ${content.preguntas && content.preguntas.length > 0 ? `
                  <div style="margin-top: 1rem;">
                    <strong>Primera pregunta:</strong>
                    <p>${content.preguntas[0].enunciado}</p>
                    <p><strong>Respuesta:</strong> ${content.preguntas[0].respuesta}</p>
                  </div>
                ` : ''}
              </div>
            `;

      case 'flashcards':
        if (content.__type === 'mapa_mental') {
          return `
                <div class="preview-content">
                  <h5>Mapa Mental</h5>
                  <p><strong>Título:</strong> ${content.titulo || 'Mapa Mental'}</p>
                  <p>Mapa mental estructurado disponible para compartir.</p>
                </div>
              `;
        }
        return `
              <div class="preview-content">
                <h5>Tarjetas de Estudio</h5>
                <p>Tarjetas de estudio disponibles para compartir.</p>
              </div>
            `;

      default:
        return `
              <div class="preview-content">
                <h5>Material Educativo</h5>
                <p>Contenido educativo generado por IA disponible para compartir.</p>
              </div>
            `;
    }
  }

  async shareSelectedMaterial() {
    if (!this.selectedMaterial) {
      this.showNotification("Advertencia", "Selecciona un material para compartir", "warning");
      return;
    }

    const shareBtn = document.getElementById("shareMaterialBtn");
    const originalText = shareBtn.innerHTML;

    try {
      shareBtn.disabled = true;
      shareBtn.innerHTML = '<div class="loading-spinner"></div> Compartiendo...';

      // Crear el post con el material
      const postContent = `Material Educativo Compartido

          PDF:${this.selectedMaterial.pdf_title}
          Tipo:${this.selectedMaterial.element.querySelector('.material-type').textContent}

          He compartido este material educativo generado por IA para que puedan estudiarlo. ¡Espero que les sea útil!`;

      const response = await this.makeRequest(`/api/classroom/${this.classroomId}/posts`, {
        method: "POST",
        body: JSON.stringify({
          content: postContent,
          material_id: this.selectedMaterial.id,
          material_type: 'ai_generated'
        })
      });

      this.showNotification("Exito","¡Material compartido exitosamente en el classroom!", "success");
      this.closeShareMaterialModal();
      await this.loadPosts();

    } catch (error) {
      console.error("Error compartiendo material:", error);
      this.showNotification("Error","Error al compartir el material. Intenta nuevamente.", "error");
    } finally {
      shareBtn.disabled = false;
      shareBtn.innerHTML = originalText;
    }
  }

  // Function to open AI material in a new window/tab
  // Reemplaza la versión actual por esta
  async openAIMaterial(materialId) {
    try {
      // obtener classroomId (desde estado o URL)
      const classroomId = this.classroomId || new URLSearchParams(window.location.search).get("classroomId");
      if (!classroomId) {
        this.showNotification("Error","Classroom ID no encontrado en la URL", "error");
        return;
      }

      console.log(`🔍 Solicitando material ${materialId} para classroom ${classroomId}`);


      // Llamada a la ruta segura que verificará que el material está compartido en el aula
      const resp = await this.makeRequest(`/api/classroom/${classroomId}/material/${materialId}`);

      // resp debe ser: { output: { content, type } } según tu backend
      const output = resp;
      if (!output) {
        console.warn("Respuesta sin output:", resp);
        this.showNotification("Error","Material no encontrado o no compartido en este classroom", "error");
        return;
      }

      // Si backend devuelve file_url utilizable, podemos abrirlo directamente
      if (resp.file_url) {
        window.open(resp.file_url, "_blank");
        return;
      }

      // Generar HTML del material (usa la función que ya tienes en la clase)
      const materialHTML = this.generateMaterialHTML(output);

      // Abrir nueva ventana y escribir el HTML
      const materialWindow = window.open("", "_blank", "width=900,height=700,scrollbars=yes,resizable=yes");
      if (!materialWindow) {
        this.showNotification("Advertencia","No se pudo abrir la ventana. Verifica que los pop-ups estén permitidos.", "warning");
        return;
      }

      materialWindow.document.write(materialHTML);
      materialWindow.document.close();
      console.log("✅ Material abierto correctamente");
    } catch (error) {
      console.error("Error abriendo material de IA:", error);
      // Si la makeRequest lanza el error con status 404/403, lo veremos aquí
      this.showNotification("Error","Error al abrir el material. Intenta nuevamente.", "error");
    }
  }

  getTypeDisplayName(type) {
    const typeNames = {
      'resumen': 'Resumen',
      'recomendacion_video': 'Recomendaciones de Video',
      'recomendacion_texto': 'Recomendaciones de Texto',
      'multiple_choice': 'Preguntas de Opción Múltiple',
      'verdadero_falso': 'Preguntas Verdadero/Falso',
      'flashcards': 'Tarjetas de Estudio',
      'problema': 'Problemas Prácticos',
      'mapa_mental': 'Mapa Mental'
    };
    return typeNames[type] || type;
  }

  generateMaterialHTML(output) {
    const { content, type } = output;
    const typeDisplay = this.getTypeDisplayName(type);

    let contentHTML = '';

    switch (type) {
      case 'resumen':
        contentHTML = `
              <div class="material-content">
                <h2>Resumen General</h2>
                <p>${content.resumen_general || content.summary || 'Sin resumen disponible'}</p>
                
                ${content.conceptos_clave && content.conceptos_clave.length > 0 ? `
                  <h3>Conceptos Clave</h3>
                  <ul>
                    ${content.conceptos_clave.map(concepto => `<li>${concepto}</li>`).join('')}
                  </ul>
                ` : ''}
                
                ${content.aplicaciones_practicas && content.aplicaciones_practicas.length > 0 ? `
                  <h3>Aplicaciones Prácticas</h3>
                  <ul>
                    ${content.aplicaciones_practicas.map(aplicacion => `<li>${aplicacion}</li>`).join('')}
                  </ul>
                ` : ''}
                
                ${content.conclusiones ? `
                  <h3>Conclusiones</h3>
                  <p>${content.conclusiones}</p>
                ` : ''}
              </div>
            `;
        break;

      case 'multiple_choice':
        contentHTML = `
              <div class="material-content">
                <h2>Preguntas de Opción Múltiple</h2>
                ${content.preguntas && content.preguntas.length > 0 ? `
                  <div class="questions-container">
                    ${content.preguntas.map((pregunta, index) => `
                      <div class="question-item">
                        <h4>Pregunta ${index + 1}</h4>
                        <p class="question-text">${pregunta.enunciado}</p>
                        <div class="options">
                          ${pregunta.opciones.map((opcion, optIndex) => `
                            <div class="option ${optIndex === pregunta.respuesta ? 'correct' : ''}">
                              ${String.fromCharCode(65 + optIndex)}. ${opcion}
                              ${optIndex === pregunta.respuesta ? ' ✓' : ''}
                            </div>
                          `).join('')}
                        </div>
                        ${pregunta.explicacion ? `
                          <div class="explanation">
                            <strong>Explicación:</strong> ${pregunta.explicacion}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : '<p>No hay preguntas disponibles</p>'}
              </div>
            `;
        break;

      case 'verdadero_falso':
        contentHTML = `
              <div class="material-content">
                <h2>Preguntas Verdadero/Falso</h2>
                ${content.preguntas && content.preguntas.length > 0 ? `
                  <div class="questions-container">
                    ${content.preguntas.map((pregunta, index) => `
                      <div class="question-item">
                        <h4>Pregunta ${index + 1}</h4>
                        <p class="question-text">${pregunta.enunciado}</p>
                        <div class="answer">
                          <strong>Respuesta:</strong> 
                          <span class="answer-value ${pregunta.respuesta}">${pregunta.respuesta}</span>
                        </div>
                        ${pregunta.explicacion ? `
                          <div class="explanation">
                            <strong>Explicación:</strong> ${pregunta.explicacion}
                          </div>
                        ` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : '<p>No hay preguntas disponibles</p>'}
              </div>
            `;
        break;

      case 'flashcards':
        if (content.__type === 'mapa_mental') {
          contentHTML = `
                <div class="material-content">
                  <h2>Mapa Mental</h2>
                  <h3>${content.titulo || 'Mapa Mental'}</h3>
                  <div class="mindmap-content">
                    <pre>${content.markmap}</pre>
                  </div>
                  ${content.notas && content.notas.length > 0 ? `
                    <h3>Notas</h3>
                    <ul>
                      ${content.notas.map(nota => `<li>${nota}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `;
        } else {
          contentHTML = `
                <div class="material-content">
                  <h2>Tarjetas de Estudio</h2>
                  <p>Contenido de tarjetas de estudio disponible.</p>
                </div>
              `;
        }
        break;

      default:
        contentHTML = `
              <div class="material-content">
                <h2>Material Educativo</h2>
                <p>Contenido educativo generado por IA.</p>
              </div>
            `;
    }

    return `
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${typeDisplay} - Material Educativo</title>
            <style>
              body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                line-height: 1.6;
                color: #374151;
                max-width: 800px;
                margin: 0 auto;
                padding: 2rem;
                background: #f9fafb;
              }
              .header {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-bottom: 2rem;
                text-align: center;
              }
              .header h1 {
                color: #1f2937;
                margin: 0;
                font-size: 2rem;
              }
              .header .badge {
                background: #10b981;
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 1rem;
                font-size: 0.875rem;
                margin-top: 0.5rem;
                display: inline-block;
              }
              .material-content {
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .material-content h2 {
                color: #1f2937;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 0.5rem;
                margin-bottom: 1.5rem;
              }
              .material-content h3 {
                color: #374151;
                margin-top: 2rem;
                margin-bottom: 1rem;
              }
              .material-content h4 {
                color: #4b5563;
                margin-top: 1.5rem;
                margin-bottom: 0.5rem;
              }
              .question-item {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
                background: #f9fafb;
              }
              .question-text {
                font-weight: 500;
                margin-bottom: 1rem;
              }
              .options {
                margin: 1rem 0;
              }
              .option {
                padding: 0.5rem;
                margin: 0.25rem 0;
                border-radius: 4px;
                background: white;
                border: 1px solid #d1d5db;
              }
              .option.correct {
                background: #d1fae5;
                border-color: #10b981;
                color: #065f46;
              }
              .answer-value.verdadero {
                color: #10b981;
                font-weight: 600;
              }
              .answer-value.falso {
                color: #ef4444;
                font-weight: 600;
              }
              .explanation {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 6px;
                margin-top: 1rem;
                border-left: 4px solid #3b82f6;
              }
              .mindmap-content pre {
                background: #f3f4f6;
                padding: 1rem;
                border-radius: 6px;
                overflow-x: auto;
                white-space: pre-wrap;
                font-family: 'Courier New', monospace;
              }
              ul {
                padding-left: 1.5rem;
              }
              li {
                margin-bottom: 0.5rem;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${typeDisplay}</h1>
              <div class="badge">🤖 Generado por IA</div>
            </div>
            ${contentHTML}
          </body>
          </html>
        `;
  }
}

// Initialize the application
let classroomApp;
document.addEventListener("DOMContentLoaded", () => {
  try {
    classroomApp = new ClassroomApp();
  } catch (error) {
    console.error("Failed to initialize ClassroomApp:", error);
    document.getElementById("postsContainer").innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <h3>Error al cargar la aplicación</h3>
            <p>Por favor, recarga la página o contacta al soporte técnico</p>
          </div>
        `;
  }
});

// Global functions for modal
function closeShareMaterialModal() {
  if (classroomApp) {
    classroomApp.closeShareMaterialModal();
  }
}

function shareSelectedMaterial() {
  if (classroomApp) {
    classroomApp.shareSelectedMaterial();
  }
}

// Global function to open AI material
function openAIMaterial(materialId) {
  if (classroomApp) {
    classroomApp.openAIMaterial(materialId);
  }
}

// Service Worker registration for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('Service Worker registrado', reg))
    //   .catch(err => console.error('SW registration failed:', err));

  });
}

document.getElementById('backBtn').addEventListener('click', function () {
  // Regresa a la página anterior en el historial
  window.history.back();
  // O si prefieres ir a una página específica:
  // window.location.href = '/classroom-student.html';
});
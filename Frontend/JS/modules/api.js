// Módulo de API
export class ApiModule {
  constructor(authModule) {
    this.auth = authModule;
    this.baseUrl = CONFIG.API.BASE_URL;
  }

  // Realizar llamada a la API con autenticación
  async call(url, options = {}) {
    const headers = this.auth.getAuthHeaders();

    // Si el body es FormData, no agregues Content-Type
    let finalHeaders = { ...headers, ...options.headers };
    if (options.body instanceof FormData) {
      delete finalHeaders['Content-Type'];
    }

    const config = {
      ...options,
      headers: finalHeaders
    };

    try {
      const response = await fetch(this.baseUrl + url, config);
      
      if (response.status === 401) {
        // Token expirado o inválido
        this.auth.clearStoredData();
        this.auth.redirectToLogin();
        return null;
      }
      
      return response;
    } catch (error) {
      console.error('Error en llamada a API:', error);
      throw error;
    }
  }

  // Métodos de conveniencia para diferentes tipos de peticiones
  async get(url, options = {}) {
    return this.call(url, { ...options, method: 'GET' });
  }

  async post(url, data, options = {}) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.call(url, { 
      ...options, 
      method: 'POST',
      body 
    });
  }

  async put(url, data, options = {}) {
    return this.call(url, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url, options = {}) {
    return this.call(url, { ...options, method: 'DELETE' });
  }

  // Métodos específicos de la aplicación
  async getProfile() {
    const response = await this.get(CONFIG.API.PROFILE);
    return response?.ok ? await response.json() : null;
  }

  async updateProfile(profileData) {
    const response = await this.put(CONFIG.API.PROFILE, profileData);
    return response?.ok ? await response.json() : null;
  }

  async uploadPdf(formData) {
    const response = await this.post('/api/pdfs/upload', formData);
    return response?.ok ? await response.json() : null;
  }

  async generateContent(pdfId, type) {
    const response = await this.post(`/api/ai/generate/${pdfId}`, { type });
    return response?.ok ? await response.json() : null;
  }

  async getContent(outputId) {
    const response = await this.get(`/api/ai/content/${outputId}`);
    return response?.ok ? await response.json() : null;
  }

  async getPdfOutputs(pdfId) {
    const response = await this.get(`/api/ai/pdf/${pdfId}`);
    return response?.ok ? await response.json() : null;
  }

  async createSubscription(subscriptionData) {
    const response = await this.post(CONFIG.API.CREATE_SUBSCRIPTION, subscriptionData);
    return response?.ok ? await response.json() : null;
  }

  async getSubscriptionStatus() {
    const response = await this.get('/api/payments/subscription/status');
    return response?.ok ? await response.json() : null;
  }

  async syncSubscription() {
    const response = await this.post('/api/payments/subscription/sync', {});
    return response?.ok ? await response.json() : null;
  }

  async cancelSubscription() {
    const response = await this.post('/api/payments/subscription/cancel', {});
    return response?.ok ? await response.json() : null;
  }

  // Método para manejar errores de respuesta
  async handleResponse(response) {
    if (!response) return null;
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `Error ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.error || error.message || 'Error en la respuesta');
    }
    
    return response.json();
  }
}

// Función para crear instancia del módulo API
export function createApiModule(authModule) {
  return new ApiModule(authModule);
}
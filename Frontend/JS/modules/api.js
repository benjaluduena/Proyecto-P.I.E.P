// Módulo de API
// Utilidades de normalización global para textos con tildes (mojibake)
function normalizeText(str) {
  if (typeof str !== 'string' || !str) return str;
  // Evitar tocar URLs/base64/paths
  const looksLikeUrl = /^(https?:\/\/|data:)/.test(str);
  const looksLikeBase64 = /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 32;
  if (looksLikeUrl || looksLikeBase64) return str;

  // Si contiene patrones típicos de mojibake, intentar decodificar
  if (/Ã|Â|¢|€|™/.test(str)) {
    try {
      // Decodificar latin1->utf8
      // eslint-disable-next-line no-undef
      const fixed = decodeURIComponent(escape(str));
      if (fixed && /[áéíóúñÁÉÍÓÚÑ]/.test(fixed) || !/Ã|Â/.test(fixed)) {
        return fixed;
      }
    } catch (_) {
      // noop
    }
    // Reemplazos comunes si la decodificación falla
    const map = {
      'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
      'Ã': 'Á', 'Ã': 'É', 'Ã': 'Í', 'Ã': 'Ó', 'Ã': 'Ú', 'Ã': 'Ñ',
      'Â¡': '¡', 'Â¿': '¿'
    };
    let res = str;
    Object.entries(map).forEach(([k, v]) => { res = res.split(k).join(v); });
    return res;
  }
  return str;
}

function normalizeDeep(value) {
  if (value == null) return value;
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map(v => normalizeDeep(v));
  if (typeof value === 'object') {
    const out = Array.isArray(value) ? [] : {};
    for (const key in value) {
      out[key] = normalizeDeep(value[key]);
    }
    return out;
  }
  return value;
}

// Exportar globalmente por compatibilidad
if (typeof window !== 'undefined') {
  window.normalizeText = normalizeText;
  window.normalizeStringsDeep = normalizeDeep;
}

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
    const headers = data instanceof FormData ? {} : { 'Content-Type': 'application/json' };
    return this.call(url, { 
      ...options, 
      method: 'POST',
      body,
      headers: { ...headers, ...options.headers }
    });
  }

  async put(url, data, options = {}) {
    return this.call(url, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  }

  async delete(url, options = {}) {
    return this.call(url, { ...options, method: 'DELETE' });
  }

  // Métodos específicos de la aplicación
  async getProfile() {
    const response = await this.get(CONFIG.API.PROFILE);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async updateProfile(profileData) {
    const response = await this.put(CONFIG.API.PROFILE, profileData);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async uploadPdf(formData) {
    const response = await this.post('/api/pdfs/upload', formData);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async generateContent(pdfId, type) {
    const response = await this.post(`/api/ai/generate/${pdfId}`, { type });
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async getContent(outputId) {
    const response = await this.get(`/api/ai/content/${outputId}`);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async getPdfOutputs(pdfId) {
    const response = await this.get(`/api/ai/pdf/${pdfId}`);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async createSubscription(subscriptionData) {
    const response = await this.post(CONFIG.API.CREATE_SUBSCRIPTION, subscriptionData);
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async getSubscriptionStatus() {
    const response = await this.get('/api/payments/subscription/status');
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async syncSubscription() {
    const response = await this.post('/api/payments/subscription/sync', {});
    return response?.ok ? normalizeDeep(await response.json()) : null;
  }

  async cancelSubscription() {
    const response = await this.post('/api/payments/subscription/cancel', {});
    return response?.ok ? normalizeDeep(await response.json()) : null;
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
    
    return normalizeDeep(await response.json());
  }
}

// Función para crear instancia del módulo API
export function createApiModule(authModule) {
  return new ApiModule(authModule);
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdfs');
const aiRoutes = require('./routes/ai');
const studyRoutes = require('./routes/study');
const notificationRoutes = require('./routes/notifications');
const tasksRoutes = require('./routes/tasks');
const paymentsRoutes = require('./routes/payments');
const diagnosticRoutes = require('./routes/diagnostic');
const configRoutes = require('./routes/config');
const analyticsRoutes = require('./routes/analytics');
const goalsRoutes = require('./routes/goals');

const app = express();
const PORT = process.env.PORT || 5500;

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // menos permisivo en desarrollo
  message: {
    error: 'Demasiadas solicitudes desde esta IP',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Devolver info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  // Aplicar diferentes límites para diferentes rutas
  keyGenerator: (req) => {
    // En desarrollo, usar solo IP para evitar fragmentación
    if (process.env.NODE_ENV !== 'production') {
      return req.ip;
    }
    // En producción, usar IP + user agent para mejor identificación
    return req.ip + ':' + (req.get('User-Agent') || '').slice(0, 50);
  },
  skip: (req) => {
    // Saltar rate limiting para health checks y en localhost
    if (req.path === '/api/health') return true;
    if (process.env.NODE_ENV !== 'production' && req.ip === '::1') return true; // localhost IPv6
    if (process.env.NODE_ENV !== 'production' && req.ip === '127.0.0.1') return true; // localhost IPv4
    return false;
  }
});

// Rate limiting específico para rutas de autenticación (más restrictivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // más restrictivo en desarrollo
  message: {
    error: 'Demasiados intentos de autenticación',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar en desarrollo para localhost
    if (process.env.NODE_ENV !== 'production') {
      return req.ip === '::1' || req.ip === '127.0.0.1';
    }
    return false;
  }
});

// Rate limiting para subida de archivos (más restrictivo)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // moderado en desarrollo
  message: {
    error: 'Límite de subidas alcanzado',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar en desarrollo para localhost
    if (process.env.NODE_ENV !== 'production') {
      return req.ip === '::1' || req.ip === '127.0.0.1';
    }
    return false;
  }
});

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          'https://apis.google.com'
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          'https://cdn.jsdelivr.net'
        ],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
          'https://cdnjs.cloudflare.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https://lh3.googleusercontent.com'
        ],
        connectSrc: [
          "'self'",
          'https://fqmpmseabhtvahzdavej.supabase.co',
          'https://apis.google.com',
          'https://accounts.google.com',
          'https://oauth2.googleapis.com'
        ],
        frameSrc: [
          'https://accounts.google.com'
        ]
      }
    }
  })
);

// Configurar CORS explícitamente
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (ej: aplicaciones móviles, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Signature', 'X-Request-Id']
}));

// Aplicar rate limiting general
app.use(limiter);
// Configurar JSON parsing solo para rutas que no sean de subida de archivos
app.use((req, res, next) => {
  if (req.path.includes('/api/pdfs/upload')) {
    // Para subida de archivos, no parsear JSON
    next();
  } else {
    // Para otras rutas, parsear JSON
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas con rate limiting específico
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pdfs', uploadLimiter, pdfRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/config', configRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/goals', goalsRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../Frontend'), { index: false }));

// Ruta para la página principal (landing page)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'landing.html'));
});

// Ruta para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

// Ruta para landing page
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'landing.html'));
});

// Ruta específica para el home de la aplicación
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'index.html'));
});

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    time: new Date().toISOString()
  });
});

// Ruta para resumen.html
app.get('/Frontend/resumen.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'resumen.html'));
});

// Ruta para mapa-mental.html
app.get('/Frontend/mapa-mental.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'mapa-mental.html'));
});

// Ruta para chat-qa.html
app.get('/chat-qa.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'chat-qa.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Ruta fallback para SPA (debe ser la última)
app.get('*', (req, res) => {
  // Si la ruta es de API, devolver 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta de API no encontrada' });
  }
  
  // Para rutas del frontend, servir la landing page
  res.sendFile(path.join(__dirname, '../Frontend', 'landing.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor P.I.E.P. ejecutándose en puerto ${PORT}`);
  console.log(`📚 Plataforma Inteligente de Estudio Personalizado`);
  console.log(`🌐 http://localhost:${PORT}`);
}); 
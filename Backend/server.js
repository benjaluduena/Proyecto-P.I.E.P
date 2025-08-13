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

const app = express();
const PORT = process.env.PORT || 5500;

// Configuración de rate limiting
// Desactivado para desarrollo
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 100, // máximo 100 requests por ventana
//   message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
// });

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          'https://fqmpmseabhtvahzdavej.supabase.co'
        ],
      }
    }
  })
);
// app.use(limiter); // Desactivado para desarrollo
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

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/notifications', notificationRoutes);

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

// Permitir que /index.html sirva el home real desde estáticos

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'P.I.E.P. Backend funcionando correctamente',
    timestamp: new Date().toISOString()
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

// Ruta fallback para SPA (opcional, si usas rutas en el frontend)
app.get('*', (req, res) => {
  // Si la ruta no es una ruta de API, servir la landing page
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../Frontend', 'landing.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor P.I.E.P. ejecutándose en puerto ${PORT}`);
  console.log(`📚 Plataforma Inteligente de Estudio Personalizado`);
  console.log(`🌐 http://localhost:${PORT}`);
}); 
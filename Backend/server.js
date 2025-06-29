const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar rutas
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdfs');
// const aiRoutes = require('./routes/ai');
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
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true
}));
// app.use(limiter); // Desactivado para desarrollo
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);
// app.use('/api/ai', aiRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/notifications', notificationRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../Frontend')));

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

// Ruta para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

// Ruta para index.html (redirige al login)
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

// Ruta fallback para SPA (opcional, si usas rutas en el frontend)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'P.I.E.P. Backend funcionando correctamente',
    timestamp: new Date().toISOString()
  });
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
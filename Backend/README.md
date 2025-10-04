# 🧠 P.I.E.P. Backend

Backend para la **Plataforma Inteligente de Estudio Personalizado (P.I.E.P.)**

## 📋 Descripción

Este backend proporciona una API REST completa para gestionar:
- ✅ Autenticación de usuarios (estudiantes y docentes)
- ✅ Subida y gestión de archivos PDF
- ✅ Generación de contenido educativo con IA
- ✅ Planes de estudio personalizados
- ✅ Seguimiento del progreso
- ✅ Notificaciones por email y WhatsApp

## 🚀 Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Supabase** - Base de datos PostgreSQL
- **OpenAI** - Generación de contenido educativo
- **JWT** - Autenticación
- **Multer** - Manejo de archivos
- **Mercado Pago** - Suscripciones mensuales

## 📦 Instalación

### 1. Clonar el repositorio
```bash
cd Proyecto-P.I.E.P/Backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo `config.env` y configura las siguientes variables:

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Supabase (ya configurado)
SUPABASE_URL=https://fqmpmseabhtvahzdavej.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE

# JWT (cambiar en producción)
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# OpenAI (obtener en https://platform.openai.com/)
OPENAI_API_KEY=tu_openai_api_key_aqui

# Email (Gmail con contraseña de aplicación)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_de_aplicacion

# Twilio (opcional, para WhatsApp)
TWILIO_ACCOUNT_SID=tu_twilio_account_sid
TWILIO_AUTH_TOKEN=tu_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# Mercado Pago
MP_ACCESS_TOKEN=tu_access_token_de_mercado_pago
# URL a la que Mercado Pago volverá después del alta (puede ser tu frontend)
MP_BACK_URL=http://localhost:5500/
```

### 4. Configurar la base de datos
Ejecuta el script SQL de `bd.txt` en tu base de datos Supabase para crear las tablas necesarias.

### 5. Ejecutar el servidor
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Endpoints de la API

### 🔐 Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### 📄 Gestión de PDFs
- `POST /api/pdfs/upload` - Subir PDF
- `GET /api/pdfs/my-pdfs` - Listar PDFs del usuario
- `GET /api/pdfs/:id` - Obtener PDF específico
- `PUT /api/pdfs/:id` - Actualizar título del PDF
- `DELETE /api/pdfs/:id` - Eliminar PDF
- `GET /api/pdfs/file/:filename` - Descargar archivo

### 🤖 Generación de Contenido IA
- `POST /api/ai/generate/:pdfId` - Generar contenido educativo
- `GET /api/ai/content/:outputId` - Obtener contenido generado
- `GET /api/ai/pdf/:pdfId` - Listar contenido de un PDF
- `POST /api/ai/regenerate/:outputId` - Regenerar contenido
- `DELETE /api/ai/content/:outputId` - Eliminar contenido

### 📚 Planes de Estudio
- `POST /api/study/plans` - Crear plan de estudio
- `GET /api/study/plans` - Listar planes
- `GET /api/study/plans/:planId` - Obtener plan específico
- `PUT /api/study/plans/:planId` - Actualizar plan
- `DELETE /api/study/plans/:planId` - Eliminar plan
- `POST /api/study/plans/:planId/tasks` - Crear tarea
- `PUT /api/study/tasks/:taskId` - Actualizar tarea
- `DELETE /api/study/tasks/:taskId` - Eliminar tarea

### 📊 Seguimiento de Progreso
- `POST /api/study/progress` - Registrar progreso
- `GET /api/study/progress/stats` - Estadísticas
- `GET /api/study/progress/history` - Historial

### 🔔 Notificaciones
- `POST /api/notifications` - Crear notificación
- `GET /api/notifications` - Listar notificaciones
- `POST /api/notifications/send/:notificationId` - Enviar notificación
- `DELETE /api/notifications/:notificationId` - Eliminar notificación
- `POST /api/notifications/check-overdue` - Verificar tareas vencidas
- `PUT /api/notifications/preferences` - Configurar preferencias

## 🔧 Tipos de Contenido Educativo

La IA puede generar los siguientes tipos de contenido:

1. **resumen** - Resumen con ideas principales y conceptos clave
2. **recomendacion_video** - Sugerencias de videos educativos
3. **recomendacion_texto** - Textos complementarios
4. **multiple_choice** - Preguntas de opción múltiple
5. **verdadero_falso** - Preguntas verdadero/falso
6. **flashcards** - Tarjetas de memoria
7. **problema** - Problemas prácticos

## 🛡️ Seguridad

- Autenticación JWT
- Validación de datos con Joi
- Rate limiting
- Helmet para headers de seguridad
- CORS configurado
- Encriptación de contraseñas con bcrypt

## 📁 Estructura del Proyecto

```
Backend/
├── config/
│   └── supabase.js          # Configuración de Supabase
├── middleware/
│   └── auth.js              # Middleware de autenticación
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   ├── pdfs.js              # Rutas de gestión de PDFs
│   ├── ai.js                # Rutas de generación IA
│   ├── study.js             # Rutas de planes de estudio
│   └── notifications.js     # Rutas de notificaciones
├── uploads/                 # Directorio para archivos subidos
├── server.js                # Archivo principal del servidor
├── package.json             # Dependencias del proyecto
├── config.env               # Variables de entorno
└── README.md                # Este archivo
```

## 🧪 Pruebas

### Endpoint de salud
```bash
curl http://localhost:3000/api/health
```

### Registro de usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@ejemplo.com",
    "password": "123456",
    "role": "estudiante",
    "education_level": "universitario"
  }'
```

## 🚀 Despliegue

### Variables de entorno para producción
- Cambiar `NODE_ENV=production`
- Usar un `JWT_SECRET` seguro
- Configurar CORS para tu dominio
- Configurar rate limiting apropiado

### Servicios recomendados
- **Vercel** - Despliegue fácil
- **Railway** - Con base de datos incluida
- **Heroku** - Plataforma establecida
- **DigitalOcean** - Control total

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Si tienes problemas o preguntas:
- Abre un issue en GitHub
- Contacta al equipo de desarrollo
- Revisa la documentación de Supabase y OpenAI

---

**¡Disfruta estudiando con P.I.E.P.! 🎓** 
# 🎓 Sistema de Classroom del Profesor - P.I.E.P.

## 📋 Descripción General

Este sistema permite a los profesores gestionar sus classrooms de manera eficiente, incluyendo:
- **Publicaciones y mensajes** en tiempo real
- **Sistema de comentarios** interactivo
- **Compartir recursos educativos** (resúmenes, mapas mentales, etc.)
- **Dashboard** con estadísticas del classroom
- **Gestión de estudiantes** y materiales

## 🚀 Características Principales

### 1. **Sistema de Mensajes**
- ✅ Envío de mensajes de texto
- ✅ Subida de imágenes
- ✅ Reacciones (👍❤️💡🎉)
- ✅ Comentarios anidados
- ✅ Mensajes fijados

### 2. **Gestión de Recursos**
- 📋 Resúmenes
- 🧠 Mapas mentales
- ✅❌ Verdadero/Falso
- 🔢 Opción múltiple
- 🗂️ Flashcards
- ❓ Problemas

### 3. **Dashboard Interactivo**
- 📊 Estadísticas en tiempo real
- 👥 Conteo de estudiantes
- 💬 Total de mensajes
- 📁 Recursos compartidos

### 4. **Navegación Intuitiva**
- 🎯 Tabs organizados por funcionalidad
- 📱 Diseño responsive
- 🔄 Cambio dinámico entre vistas

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js (versión 14 o superior)
- Supabase configurado
- Base de datos con las tablas necesarias

### 1. **Configurar Base de Datos**
Ejecutar el archivo `database_schema.sql` en tu base de datos Supabase:

```sql
-- Crear tablas para mensajes y comentarios
CREATE TABLE IF NOT EXISTS public.classroom_messages (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES public.classrooms(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  file_url TEXT,
  file_name VARCHAR(255),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Y otras tablas necesarias...
```

### 2. **Configurar Variables de Entorno**
Crear archivo `.env` en la raíz del proyecto:

```env
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima
```

### 3. **Instalar Dependencias**
```bash
npm install
# o
yarn install
```

## 📁 Estructura de Archivos

```
Frontend/
├── Pages/
│   └── profesorPage.html          # Página principal del profesor
├── JS/
│   ├── config.js                  # Configuración de Supabase
│   └── classroom-functions.js     # Funciones del classroom
├── Css/
│   ├── profesorPage.css           # Estilos principales
│   └── classroom-functions.css    # Estilos específicos
└── README_CLASSROOM.md            # Este archivo
```

## 🔧 Uso del Sistema

### 1. **Acceder al Classroom**
```
URL: /profesorPage.html?classroomId=123
```

### 2. **Enviar Mensajes**
1. Escribir en el campo de texto
2. Opcional: adjuntar imagen
3. Hacer clic en "Enviar" o presionar Enter

### 3. **Compartir Recursos**
1. Ir a la pestaña "Recursos"
2. Hacer clic en "Compartir Recurso"
3. Seleccionar tipo y completar información
4. Confirmar

### 4. **Gestionar Comentarios**
1. Hacer clic en "Comentar" en cualquier mensaje
2. Escribir comentario
3. Enviar

## 🎨 Personalización

### **Colores y Temas**
Modificar `profesorPage.css`:

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --success-color: #10b981;
  --danger-color: #ef4444;
}
```

### **Iconos**
Cambiar iconos de FontAwesome en el HTML:

```html
<i class="fas fa-comments"></i>  <!-- Cambiar por otro icono -->
```

## 🔒 Seguridad

### **Autenticación**
- Solo usuarios con rol "docente" pueden acceder
- Verificación de sesión en cada operación
- Validación de permisos por classroom

### **Validación de Datos**
- Sanitización de inputs
- Límites de tamaño de archivos
- Verificación de tipos de archivo

## 📱 Responsive Design

El sistema se adapta automáticamente a:
- 📱 Móviles (< 768px)
- 📱 Tablets (768px - 1024px)
- 💻 Desktop (> 1024px)

## 🐛 Solución de Problemas

### **Problema: CSS no se aplica**
```bash
# Verificar rutas de archivos CSS
# Asegurar que los archivos existen en ../Css/
```

### **Problema: JavaScript no funciona**
```bash
# Verificar consola del navegador
# Confirmar que Supabase está configurado
# Verificar que classroomId está en la URL
```

### **Problema: Base de datos no responde**
```bash
# Verificar conexión a Supabase
# Confirmar permisos de RLS (Row Level Security)
# Verificar estructura de tablas
```

## 🚀 Mejoras Futuras

- [ ] **Notificaciones push** en tiempo real
- [ ] **Sistema de archivos** integrado
- [ ] **Analytics avanzados** del classroom
- [ ] **Integración con LMS** externos
- [ ] **API REST** completa
- [ ] **Webhooks** para eventos

## 📞 Soporte

Para soporte técnico o reportar bugs:
1. Revisar la consola del navegador
2. Verificar logs del servidor
3. Consultar documentación de Supabase
4. Contactar al equipo de desarrollo

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

---

**Desarrollado con ❤️ para la comunidad educativa**

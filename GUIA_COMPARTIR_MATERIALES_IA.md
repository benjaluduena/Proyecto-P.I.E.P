# Guía de Funcionalidad: Compartir Materiales de IA en Classroom

## Descripción
Esta funcionalidad permite a los docentes compartir materiales educativos generados por IA directamente en sus classrooms, facilitando el acceso de los estudiantes a contenido educativo personalizado.

## Características Principales

### 1. Botón "Compartir Material IA"
- Ubicado en el formulario de crear posts en `profesorPage.html`
- Permite acceder a todos los materiales de IA generados por el docente

### 2. Modal de Selección de Materiales
- **Lista de Materiales**: Muestra todos los PDFs con contenido generado por IA
- **Vista Previa**: Permite ver el contenido antes de compartir
- **Selección**: Click en cualquier material para seleccionarlo
- **Información Detallada**: Muestra tipo de material, fecha de creación y PDF origen

### 3. Tipos de Materiales Soportados
- **Resúmenes**: Contenido estructurado con conceptos clave y conclusiones
- **Preguntas de Opción Múltiple**: Cuestionarios con respuestas y explicaciones
- **Preguntas Verdadero/Falso**: Ejercicios de evaluación
- **Mapas Mentales**: Estructuras visuales de conocimiento
- **Tarjetas de Estudio**: Material para repaso
- **Problemas Prácticos**: Ejercicios aplicados
- **Recomendaciones**: Videos y textos complementarios

### 4. Posts Especiales en Classroom
- **Identificación Visual**: Posts con materiales de IA tienen un diseño especial
- **Badge de IA**: Indicador visual "🤖 Material IA"
- **Acceso Directo**: Botón para abrir el material en nueva ventana
- **Contenido Formateado**: Presentación profesional del material educativo

## Flujo de Uso

### Para Docentes:
1. **Acceder al Classroom**: Ir a `profesorPage.html` con un `classroomId` válido
2. **Abrir Modal**: Hacer click en "📂 Compartir Material IA"
3. **Seleccionar Material**: Elegir de la lista de materiales disponibles
4. **Vista Previa**: Revisar el contenido antes de compartir
5. **Compartir**: Hacer click en "Compartir en Classroom"
6. **Confirmación**: El material aparece como post especial en el classroom

### Para Estudiantes:
1. **Ver Post**: Los posts con materiales de IA se destacan visualmente
2. **Acceder al Material**: Hacer click en "Ver Material"
3. **Estudiar**: El material se abre en nueva ventana con formato profesional
4. **Interactuar**: Comentar y participar en el classroom

## Implementación Técnica

### Backend (Nuevas Rutas)
```javascript
// Obtener materiales de IA del docente
GET /api/ai/teacher/materials

// Obtener contenido específico de un material
GET /api/ai/content/:outputId

// Crear post con material de IA
POST /api/classroom/:id/posts
Body: {
  content: "Texto del post",
  material_id: 123,
  material_type: "ai_generated"
}
```

### Base de Datos (Nuevas Columnas)
```sql
-- Tabla posts actualizada
ALTER TABLE public.posts 
ADD COLUMN material_id INTEGER,
ADD COLUMN material_type VARCHAR(50);
```

### Frontend (Nuevas Funcionalidades)
- **Modal de Selección**: Interfaz para elegir materiales
- **Vista Previa**: Preview del contenido antes de compartir
- **Renderizado Especial**: Posts con materiales de IA tienen diseño único
- **Ventana de Material**: Presentación profesional del contenido educativo

## Estilos y Diseño

### Posts de Materiales de IA
- **Borde Verde**: Indicador visual de material de IA
- **Fondo Degradado**: Fondo verde claro para destacar
- **Badge de IA**: Etiqueta "🤖 Material IA"
- **Card de Acceso**: Botón especial para abrir el material

### Modal de Selección
- **Diseño Moderno**: Interfaz limpia y profesional
- **Selección Visual**: Feedback visual al seleccionar materiales
- **Vista Previa**: Panel lateral con contenido del material
- **Responsive**: Adaptable a diferentes tamaños de pantalla

## Archivos Modificados

### Backend
- `Backend/routes/ai.js`: Nueva ruta para obtener materiales del docente
- `Backend/routes/posts.js`: Soporte para posts con materiales de IA
- `Backend/migrations/update_posts_table_for_materials.sql`: Migración de BD

### Frontend
- `Frontend/Pages/profesorPage.html`: Modal y funcionalidad completa
- Estilos CSS integrados para modal y posts especiales
- JavaScript para manejo de materiales y vista previa

## Consideraciones de Seguridad
- **Autenticación**: Solo docentes autenticados pueden compartir
- **Autorización**: Solo materiales del propio docente
- **Validación**: Verificación de permisos en classroom
- **Sanitización**: Escape de HTML en contenido dinámico

## Próximas Mejoras Sugeridas
1. **Filtros**: Filtrar materiales por tipo o fecha
2. **Búsqueda**: Buscar materiales por título o contenido
3. **Estadísticas**: Ver qué materiales son más accedidos
4. **Notificaciones**: Avisar a estudiantes sobre nuevos materiales
5. **Descarga**: Permitir descargar materiales como PDF
6. **Compartir Externo**: Compartir fuera del classroom

## Soporte y Mantenimiento
- **Logs**: Registro de acciones de compartir materiales
- **Métricas**: Seguimiento de uso de materiales
- **Backup**: Respaldo de materiales compartidos
- **Actualizaciones**: Mantenimiento de tipos de materiales

---

*Esta funcionalidad mejora significativamente la experiencia educativa al permitir que los docentes compartan fácilmente contenido personalizado generado por IA con sus estudiantes.*

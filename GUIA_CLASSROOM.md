# Guía de Funcionalidad Classroom - P.I.E.P.

## Descripción General

La funcionalidad de **Classroom** permite a los docentes crear clases virtuales y compartir materiales educativos con sus estudiantes, similar a Google Classroom. Los estudiantes pueden unirse a estas clases usando códigos únicos y acceder a los materiales compartidos por sus docentes.

## Características Principales

### Para Docentes:
- ✅ **Crear Classrooms**: Crear nuevas clases con nombre, materia y descripción
- ✅ **Códigos de Unión**: Cada classroom tiene un código único de 6 caracteres
- ✅ **Compartir Materiales**: Agregar PDFs y otros materiales a la clase
- ✅ **Generar Contenido IA**: Crear automáticamente contenido educativo basado en los PDFs
- ✅ **Gestionar Estudiantes**: Ver lista de estudiantes inscritos
- ✅ **Crear Tareas**: Asignar tareas y evaluaciones

### Para Estudiantes:
- ✅ **Unirse a Classrooms**: Usar códigos para unirse a clases
- ✅ **Ver Materiales**: Acceder a todos los materiales compartidos por el docente
- ✅ **Contenido IA**: Ver resúmenes, ejercicios y contenido generado automáticamente
- ✅ **Seguimiento de Progreso**: Registrar interacciones con materiales
- ✅ **Ver Tareas**: Acceder a tareas asignadas por el docente

## Estructura de Base de Datos

### Nuevas Tablas Creadas:

1. **`classrooms`** - Información principal de las clases
2. **`classroom_enrollments`** - Estudiantes inscritos en cada clase
3. **`classroom_materials`** - Materiales compartidos en cada clase
4. **`classroom_study_outputs`** - Contenido generado por IA para materiales
5. **`classroom_progress`** - Progreso de estudiantes en materiales
6. **`classroom_assignments`** - Tareas asignadas por docentes
7. **`assignment_submissions`** - Entregas de tareas por estudiantes

## API Endpoints

### Rutas para Docentes:

#### Crear Classroom
```
POST /api/classroom/create
Body: {
  "name": "Matemáticas 101",
  "description": "Clase de matemáticas básicas",
  "subject": "Matemáticas",
  "grade_level": "secundario"
}
```

#### Obtener Classrooms del Docente
```
GET /api/classroom/teacher/classrooms
```

#### Agregar Material a Classroom
```
POST /api/classroom/:classroomId/materials
Body: {
  "pdf_id": 123,
  "title": "Capítulo 1 - Introducción",
  "description": "Material introductorio",
  "due_date": "2024-01-15",
  "is_required": true
}
```

#### Generar Contenido IA para Material
```
POST /api/classroom/materials/:materialId/generate-content
Body: {
  "contentType": "resumen",
  "educationLevel": "secundario"
}
```

#### Crear Tarea
```
POST /api/classroom/:classroomId/assignments
Body: {
  "title": "Tarea 1",
  "description": "Resolver ejercicios del capítulo 1",
  "material_id": 456,
  "due_date": "2024-01-20T23:59:59Z",
  "points": 10
}
```

### Rutas para Estudiantes:

#### Unirse a Classroom
```
POST /api/classroom/join
Body: {
  "join_code": "ABC123"
}
```

#### Obtener Classrooms del Estudiante
```
GET /api/classroom/student/classrooms
```

#### Obtener Materiales de Classroom
```
GET /api/classroom/:classroomId/materials
```

#### Registrar Progreso
```
POST /api/classroom/materials/:materialId/progress
Body: {
  "output_id": 789,
  "interaction_type": "completado",
  "score": 85
}
```

### Rutas Generales:

#### Obtener Detalles de Classroom
```
GET /api/classroom/:classroomId
```

## Flujo de Uso

### Para Docentes:

1. **Acceder a la plataforma** como docente
2. **Ir a "Classroom"** en el menú lateral
3. **Crear un nuevo classroom** con:
   - Nombre de la clase
   - Materia
   - Nivel educativo
   - Descripción
4. **Compartir el código** de unión con los estudiantes
5. **Subir materiales** (PDFs) al classroom
6. **Generar contenido IA** para cada material
7. **Crear tareas** basadas en los materiales

### Para Estudiantes:

1. **Acceder a la plataforma** como estudiante
2. **Ir a "Classroom"** en el menú lateral
3. **Unirse a un classroom** usando el código proporcionado por el docente
4. **Ver materiales** compartidos por el docente
5. **Acceder a contenido IA** generado automáticamente
6. **Registrar progreso** al interactuar con materiales
7. **Completar tareas** asignadas por el docente

## Archivos Creados/Modificados

### Backend:
- ✅ `Backend/migrations/create_classroom_tables.sql` - Nuevas tablas de BD
- ✅ `Backend/routes/classroom.js` - Rutas de la API
- ✅ `Backend/server.js` - Agregadas rutas de classroom

### Frontend:
- ✅ `Frontend/classroom-teacher.html` - Página para docentes
- ✅ `Frontend/classroom-student.html` - Página para estudiantes
- ✅ `Frontend/index.html` - Agregado botón de classroom
- ✅ `Frontend/JS/main.js` - Función para abrir classroom según rol

## Instalación y Configuración

### 1. Ejecutar Migraciones
```sql
-- Ejecutar el archivo Backend/migrations/create_classroom_tables.sql
-- en tu base de datos de Supabase
```

### 2. Verificar Variables de Entorno
Asegúrate de que las siguientes variables estén configuradas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

### 3. Reiniciar el Servidor
```bash
cd Backend
npm start
```

## Próximas Mejoras

### Funcionalidades Pendientes:
- 🔄 **Vista detallada de classroom** para docentes
- 🔄 **Gestión de materiales** con interfaz completa
- 🔄 **Vista de estudiantes** con estadísticas
- 🔄 **Sistema de tareas completo** con entregas
- 🔄 **Notificaciones** para nuevos materiales y tareas
- 🔄 **Chat/comentarios** en materiales
- 🔄 **Calificaciones automáticas** para ejercicios
- 🔄 **Exportar progreso** de estudiantes

### Mejoras Técnicas:
- 🔄 **Optimización de consultas** para mejor rendimiento
- 🔄 **Caché de contenido IA** para evitar regeneración
- 🔄 **Validación mejorada** de permisos
- 🔄 **Tests unitarios** para las nuevas funcionalidades

## Solución de Problemas

### Error: "No tienes permisos para este material"
- Verificar que el usuario esté inscrito en el classroom
- Verificar que el material pertenezca al classroom correcto

### Error: "Código de classroom inválido"
- Verificar que el código tenga exactamente 6 caracteres
- Verificar que el classroom esté activo
- Verificar que no estés ya inscrito en ese classroom

### Error: "Error generando código de unión"
- Verificar permisos de base de datos
- Verificar que la función `generate_join_code()` esté creada

## Contacto y Soporte

Para reportar problemas o solicitar nuevas funcionalidades:
1. Revisar los logs del servidor
2. Verificar la consola del navegador
3. Documentar los pasos para reproducir el problema
4. Incluir información del usuario y classroom afectado 
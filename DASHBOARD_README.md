# Dashboard P.I.E.P - Panel de Control

## Descripción

El Dashboard de P.I.E.P es una página de control que se muestra después del inicio de sesión exitoso. Proporciona una visión general completa de las estadísticas del proyecto y la actividad del usuario.

## Características

### 📊 Estadísticas Generales
- **Usuarios Registrados**: Total de usuarios en la plataforma
- **PDFs Procesados**: Cantidad total de documentos PDF subidos
- **Contenido Generado**: Total de elementos creados por IA
- **Planes de Estudio**: Número de planes de estudio creados

### 👤 Estadísticas Personales
- **PDFs Subidos**: Documentos subidos por el usuario actual
- **Contenido Creado**: Elementos generados por el usuario
- **Planes Activos**: Planes de estudio del usuario
- **Tareas Completadas**: Tareas finalizadas

### 📈 Progreso del Mes
- Círculo de progreso visual que muestra el avance mensual
- Contador de tareas completadas en el mes actual

### 🎯 Tipos de Contenido
- **Resúmenes**: Contenido resumido generado
- **Verdadero/Falso**: Preguntas de este tipo creadas
- **Opción Múltiple**: Exámenes de opción múltiple
- **Flashcards**: Tarjetas de estudio generadas

### 📝 Actividad Reciente
- Lista de las últimas 10 actividades realizadas
- Muestra el tipo de contenido generado y el PDF asociado
- Tiempo relativo de cada actividad

### ⚡ Acciones Rápidas
- **Subir PDF**: Acceso directo a la página de subida
- **Ver Resúmenes**: Ir a la página de resúmenes
- **Mi Perfil**: Acceder al perfil del usuario
- **Crear Plan**: Crear un nuevo plan de estudio

## Estructura de Archivos

```
Frontend/
├── dashboard.html          # Página principal del dashboard
├── Css/
│   └── dashboard.css      # Estilos del dashboard
└── JS/
    └── dashboard.js       # Funcionalidad JavaScript

Backend/
└── routes/
    └── dashboard.js       # Endpoints de la API para estadísticas
```

## Endpoints de la API

### GET /api/dashboard/stats
Obtiene estadísticas generales del sistema.

### GET /api/dashboard/user-stats
Obtiene estadísticas específicas del usuario actual.

### GET /api/dashboard/recent-activity
Obtiene la actividad reciente (últimas 10 actividades).

### GET /api/dashboard/content-distribution
Obtiene la distribución de tipos de contenido generado.

### GET /api/dashboard/monthly-progress
Obtiene el progreso mensual del usuario.

### GET /api/dashboard/growth-stats
Obtiene estadísticas de crecimiento comparando con el mes anterior.

## Base de Datos

El dashboard utiliza las siguientes vistas de la base de datos:

### user_dashboard_stats
Vista que agrega estadísticas por usuario:
- `user_id`: ID del usuario
- `name`: Nombre del usuario
- `role`: Rol del usuario
- `total_pdfs`: Total de PDFs subidos
- `total_outputs`: Total de contenido generado
- `total_plans`: Total de planes de estudio
- `total_tasks`: Total de tareas
- `completed_tasks`: Tareas completadas

### recent_content
Vista que muestra el contenido reciente:
- `id`: ID del contenido
- `type`: Tipo de contenido
- `content`: Contenido generado
- `created_at`: Fecha de creación
- `pdf_title`: Título del PDF
- `user_name`: Nombre del usuario

## Flujo de Navegación

1. **Login**: El usuario inicia sesión en `/login.html`
2. **Redirección**: Después del login exitoso, se redirige a `/dashboard.html`
3. **Carga de Datos**: El dashboard carga automáticamente todas las estadísticas
4. **Navegación**: El usuario puede navegar a otras secciones desde las acciones rápidas

## Personalización

### Colores y Temas
Los colores del dashboard se pueden personalizar editando las variables CSS en `dashboard.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
}
```

### Agregar Nuevas Estadísticas
Para agregar nuevas estadísticas:

1. Crear el endpoint en `Backend/routes/dashboard.js`
2. Agregar la lógica en `Frontend/JS/dashboard.js`
3. Actualizar el HTML en `Frontend/dashboard.html`
4. Agregar estilos en `Frontend/Css/dashboard.css`

## Responsive Design

El dashboard es completamente responsive y se adapta a diferentes tamaños de pantalla:

- **Desktop**: Layout completo con todas las secciones visibles
- **Tablet**: Reorganización de elementos en grid de 2 columnas
- **Mobile**: Layout de una columna optimizado para móviles

## Seguridad

- Todas las rutas del dashboard requieren autenticación
- Los datos se filtran por usuario para mostrar solo información relevante
- Se utiliza el middleware `supabaseAuth` para verificar tokens

## Mantenimiento

### Actualización de Estadísticas
Las estadísticas se actualizan en tiempo real cada vez que se carga el dashboard. Para optimizar el rendimiento, se recomienda:

- Implementar caché para estadísticas que no cambian frecuentemente
- Usar paginación para listas largas de actividad
- Implementar actualizaciones en tiempo real con WebSockets

### Monitoreo
- Revisar logs del servidor para errores en endpoints
- Monitorear el rendimiento de las consultas a la base de datos
- Verificar que las vistas de la base de datos estén optimizadas

## Troubleshooting

### Problemas Comunes

1. **Dashboard no carga**: Verificar conexión a Supabase y autenticación
2. **Estadísticas vacías**: Verificar que existan datos en la base de datos
3. **Errores de CORS**: Verificar configuración de CORS en el servidor
4. **Vistas no encontradas**: Ejecutar scripts SQL para crear las vistas necesarias

### Logs Útiles
- Revisar la consola del navegador para errores JavaScript
- Verificar logs del servidor para errores de API
- Comprobar logs de Supabase para errores de base de datos 
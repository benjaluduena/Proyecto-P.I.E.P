# P.I.E.P. - Plataforma Inteligente de Estudio Personalizado

## ¿Qué es P.I.E.P.?

P.I.E.P. es una plataforma educativa inteligente que te ayuda a estudiar de manera más efectiva. Simplemente subes tus documentos PDF y la plataforma genera automáticamente diferentes tipos de materiales de estudio personalizados usando inteligencia artificial.

## ¿Cómo funciona?

1. **Sube tu material**: Cargas documentos PDF de tus clases, libros o apuntes
2. **Genera contenido**: La IA crea resúmenes, preguntas, flashcards y más
3. **Estudia a tu ritmo**: Usa los materiales generados cuando y donde quieras
4. **Haz seguimiento**: Ve tu progreso y planifica tus estudios

## Características principales

### 🎯 Generación automática de contenido de estudio
- **Resúmenes**: Puntos clave del material de forma condensada
- **Preguntas de opción múltiple**: Para practicar y evaluar conocimientos
- **Preguntas verdadero/falso**: Verificación rápida de conceptos
- **Flashcards**: Tarjetas de memoria para repasar términos importantes
- **Mapas mentales**: Visualización de conceptos y sus relaciones
- **Chat Q&A**: Haz preguntas específicas sobre el material

### 📚 Gestión de estudios
- **Biblioteca personal**: Todos tus PDFs organizados en un lugar
- **Historial de estudio**: Ve qué has estudiado y cuándo
- **Planificación**: Crea planes de estudio con fechas y recordatorios

### 👨‍🏫 Funciones para docentes (próximamente)
- **Aulas virtuales**: Crea clases y asigna materiales
- **Seguimiento de estudiantes**: Ve el progreso de tus alumnos
- **Tareas y evaluaciones**: Asigna trabajos basados en el contenido

## Arquitectura del Sistema

### Diagrama de Clases

```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String name
        +String role
        +String education_level
        +Date created_at
        +login()
        +logout()
        +updateProfile()
    }

    class Profile {
        +String id
        +String name
        +String role
        +String education_level
        +String subscription_status
        +updateProfile()
        +getSubscriptionStatus()
    }

    class PdfUpload {
        +Integer id
        +String user_id
        +String file_name
        +String file_url
        +String title
        +Date uploaded_at
        +upload()
        +process()
    }

    class StudyOutput {
        +Integer id
        +Integer pdf_id
        +String type
        +JSON content
        +Date created_at
        +generate()
        +getContent()
    }

    class StudyPlan {
        +Integer id
        +String user_id
        +String title
        +String description
        +Date start_date
        +Date end_date
        +Boolean notify_email
        +Boolean notify_whatsapp
        +create()
        +addTask()
    }

    class PlanTask {
        +Integer id
        +Integer plan_id
        +String title
        +String description
        +Date due_date
        +Boolean completed
        +Integer related_output_id
        +complete()
        +setReminder()
    }

    class ProgressTracking {
        +Integer id
        +String user_id
        +Integer output_id
        +String interaction_type
        +Number score
        +Date interacted_at
        +track()
        +updateScore()
    }

    class Notification {
        +Integer id
        +String user_id
        +Integer task_id
        +String method
        +Date scheduled_at
        +Boolean sent
        +send()
        +schedule()
    }

    class Subscription {
        +String user_id
        +String mp_preapproval_id
        +String status
        +Number amount
        +String currency
        +Date next_payment_date
        +create()
        +cancel()
        +sync()
    }

    class Classroom {
        +Integer id
        +String name
        +String description
        +String teacher_id
        +String subject
        +String grade_level
        +String join_code
        +Boolean is_active
        +create()
        +addStudent()
        +assignMaterial()
    }

    class ClassroomEnrollment {
        +Integer id
        +Integer classroom_id
        +String student_id
        +String status
        +Date enrolled_at
        +enroll()
        +updateStatus()
    }

    class ClassroomMaterial {
        +Integer id
        +Integer classroom_id
        +Integer pdf_id
        +String title
        +String description
        +Date assigned_at
        +Date due_date
        +Boolean is_required
        +assign()
        +generateOutputs()
    }

    class ClassroomProgress {
        +Integer id
        +String student_id
        +Integer material_id
        +Integer output_id
        +String interaction_type
        +Number score
        +Date completed_at
        +track()
        +getProgress()
    }

    %% Relaciones principales
    User ||--|| Profile : has
    User ||--o{ PdfUpload : uploads
    User ||--o{ StudyPlan : creates
    User ||--o{ ProgressTracking : tracks
    User ||--o{ Notification : receives
    User ||--o| Subscription : has
    User ||--o{ Classroom : teaches
    User ||--o{ ClassroomEnrollment : enrolls

    PdfUpload ||--o{ StudyOutput : generates
    StudyPlan ||--o{ PlanTask : contains
    PlanTask ||--o{ Notification : triggers
    StudyOutput ||--o{ ProgressTracking : tracked
    PlanTask ||--o| StudyOutput : relates_to

    Classroom ||--o{ ClassroomEnrollment : has
    Classroom ||--o{ ClassroomMaterial : contains
    ClassroomMaterial ||--|| PdfUpload : uses
    ClassroomMaterial ||--o{ ClassroomProgress : tracks
```

### Componentes del Sistema

#### 🎨 Frontend (Interfaz de Usuario)
- **Tecnología**: HTML5, CSS3, JavaScript modular
- **Páginas principales**: Landing, Login, Home, Perfil, Historial
- **Generadores de contenido**: Resumen, Multiple Choice, Verdadero/Falso, Flashcards, Mapa Mental
- **Gestión**: Calendario, Planes de estudio, Suscripciones

#### 🔧 Backend (Servidor)
- **Tecnología**: Node.js con Express
- **Funcionalidades**:
  - Autenticación y autorización
  - Procesamiento de PDFs
  - Integración con IA (OpenAI)
  - Sistema de pagos (MercadoPago)
  - Notificaciones (Email y WhatsApp)

#### 🗄️ Base de Datos
- **Tecnología**: PostgreSQL (vía Supabase)
- **Tablas principales**:
  - Usuarios y perfiles
  - PDFs y contenido generado
  - Planes de estudio y tareas
  - Progreso y estadísticas
  - Aulas y materiales (próximamente)

## Tipos de Contenido que Genera

### 📝 Resúmenes
Extrae los puntos más importantes del documento de forma clara y organizada.

### ❓ Preguntas de Opción Múltiple
Crea preguntas con 4 opciones para evaluar la comprensión del material.

### ✅ Verdadero o Falso
Genera afirmaciones sobre el contenido para verificar conceptos clave.

### 🎴 Flashcards
Tarjetas de memoria con términos y definiciones para repasar vocabulario.

### 🧠 Mapas Mentales
Diagramas visuales que muestran las relaciones entre conceptos principales.

### 💬 Chat Q&A
Sistema de preguntas y respuestas donde puedes hacer consultas específicas sobre el material.

## Cómo empezar

1. **Regístrate**: Crea tu cuenta con email y contraseña
2. **Sube un PDF**: Arrastra y suelta tu primer documento
3. **Genera contenido**: Elige qué tipo de material de estudio quieres crear
4. **¡Estudia!**: Usa el contenido generado para aprender mejor

## Planes de Suscripción

### Plan Gratuito
- Hasta 3 PDFs por mes
- Generación básica de contenido
- Funciones limitadas

### Plan Premium
- PDFs ilimitados
- Todos los tipos de contenido
- Planificación avanzada
- Notificaciones personalizadas
- Prioridad en generación

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **Base de datos**: PostgreSQL con Supabase
- **IA**: OpenAI GPT-4
- **Pagos**: MercadoPago
- **Notificaciones**: Twilio (WhatsApp), Nodemailer (Email)
- **Archivos**: PDF parsing con pdf-parse

## Estado del Proyecto

✅ **Implementado**:
- Sistema de autenticación
- Subida y procesamiento de PDFs
- Generación de todos los tipos de contenido
- Gestión de perfiles y suscripciones
- Sistema de pagos
- Notificaciones por email y WhatsApp

🚧 **En desarrollo**:
- Sistema de aulas virtuales para docentes
- Seguimiento avanzado de progreso
- Aplicación móvil

## Equipo

Desarrollado por el equipo P.I.E.P. con el objetivo de revolucionar la forma en que los estudiantes interactúan con sus materiales de estudio.

---

**P.I.E.P.** - Tu compañero inteligente de estudio 🎓✨
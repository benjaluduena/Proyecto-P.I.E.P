# Instrucciones de Migración para Compartir Materiales de IA

## Problema Actual
El sistema está funcionando pero necesita algunas columnas adicionales en la base de datos para la funcionalidad completa de compartir materiales de IA.

## Errores Encontrados
1. `column posts.material_id does not exist`
2. `column pdf_uploads.created_at does not exist`

## Solución: Migración Manual

### Paso 1: Acceder a Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto P.I.E.P.

### Paso 2: Ejecutar Migración en SQL Editor
1. Ve a la sección **SQL Editor** en el panel lateral
2. Crea una nueva consulta
3. Copia y pega el siguiente SQL:

```sql
-- Agregar columnas para materiales de IA a la tabla posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS material_id INTEGER,
ADD COLUMN IF NOT EXISTS material_type VARCHAR(50) CHECK (material_type IN ('ai_generated', 'pdf', 'link', 'text'));

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_posts_material_id ON public.posts(material_id);
CREATE INDEX IF NOT EXISTS idx_posts_material_type ON public.posts(material_type);

-- Agregar columna created_at a pdf_uploads si no existe
ALTER TABLE public.pdf_uploads 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Crear índice para pdf_uploads.created_at
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created_at ON public.pdf_uploads(created_at);
```

### Paso 3: Ejecutar la Consulta
1. Haz clic en **Run** para ejecutar la migración
2. Verifica que no haya errores en la consola

### Paso 4: Verificar la Migración
Ejecuta esta consulta para verificar que las columnas se agregaron correctamente:

```sql
-- Verificar columnas de posts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
AND table_schema = 'public'
AND column_name IN ('material_id', 'material_type');

-- Verificar columnas de pdf_uploads
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pdf_uploads' 
AND table_schema = 'public'
AND column_name = 'created_at';
```

## Después de la Migración

### Paso 5: Actualizar el Código
Una vez ejecutada la migración, actualiza el archivo `Backend/routes/posts.js`:

```javascript
// En la función GET /api/classroom/:id/posts
const { data, error } = await supabase
  .from("posts")
  .select(`
    id,
    content,
    file_url,
    material_id,
    material_type,
    created_at,
    author:profiles ( id, name ),
    comments:comments (
      id,
      text,
      created_at,
      author:profiles ( id, name )
    )
  `)
  .eq("classroom_id", classroomId)
  .order("created_at", { ascending: false });
```

```javascript
// En la función POST /api/classroom/:id/posts
// Preparar datos del post
const postData = {
  classroom_id: parseInt(classroomId), 
  user_id: userId, 
  content: content?.trim() || null, 
  file_url: fileUrl
};

// Si es un material de IA, agregar información adicional
if (req.body.material_id && req.body.material_type === 'ai_generated') {
  postData.material_id = req.body.material_id;
  postData.material_type = req.body.material_type;
}
```

### Paso 6: Actualizar AI Routes
Actualiza el archivo `Backend/routes/ai.js`:

```javascript
// En la función GET /api/ai/teacher/materials
const { data: pdfs, error: pdfsError } = await s
  .from('pdf_uploads')
  .select(`
    id,
    title,
    file_name,
    file_url,
    created_at,
    study_outputs (
      id,
      type,
      content,
      created_at
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

## Funcionalidad Completa

Una vez completada la migración, la funcionalidad de compartir materiales de IA estará completamente operativa:

### Para Docentes:
1. **Compartir Materiales**: Botón "📂 Compartir Material IA" en profesorPage.html
2. **Selección Visual**: Modal con lista de materiales disponibles
3. **Vista Previa**: Preview del contenido antes de compartir
4. **Posts Especiales**: Los materiales aparecen como posts destacados

### Para Estudiantes:
1. **Identificación Visual**: Posts con materiales de IA tienen diseño especial
2. **Acceso Directo**: Botón "Ver Material" para abrir el contenido
3. **Presentación Profesional**: Materiales se abren en ventana nueva con formato educativo

## Verificación Final

Para verificar que todo funciona correctamente:

1. **Reinicia el servidor backend**:
   ```bash
   cd Backend
   npm run dev
   ```

2. **Prueba la funcionalidad**:
   - Ve a profesorPage.html con un classroomId válido
   - Haz clic en "📂 Compartir Material IA"
   - Verifica que se cargan los materiales
   - Intenta compartir un material

3. **Verifica en el classroom**:
   - El material debe aparecer como post especial
   - Debe tener el badge "🤖 Material IA"
   - El botón "Ver Material" debe funcionar

## Soporte

Si encuentras algún problema después de la migración:

1. Verifica que las columnas se agregaron correctamente
2. Revisa los logs del servidor backend
3. Verifica que el usuario tiene materiales de IA generados
4. Asegúrate de que el classroomId es válido

---

**Nota**: Esta migración es necesaria para que la funcionalidad de compartir materiales de IA funcione completamente. Sin estas columnas, el sistema funcionará en modo básico pero sin las características avanzadas.

const express = require('express');
const OpenAI = require('openai');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
const { validate, aiSchemas, uuidParam } = require('../middleware/validation');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const router = express.Router();

// Configurar OpenAI para usar la API key desde variable de entorno
const openai = new OpenAI();

// Función para extraer texto del PDF (ahora real)
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error al extraer texto del PDF:', error);
    return '';
  }
};

// Utilidad: intentar extraer JSON de texto con o sin fences
const parseJsonFromText = (text) => {
  if (typeof text !== 'string') return text;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json|```/gi, '');
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.substring(first, last + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
};

// Función para generar contenido educativo con IA
const generateEducationalContent = async (pdfText, contentType, educationLevel, language = 'español') => {
  const getTruncatedText = (text, maxChars = 12000) => {
    if (typeof text !== 'string') return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxChars) return cleaned;
    return cleaned.slice(0, maxChars);
  };
  const truncatedForMindmap = getTruncatedText(pdfText, 8000);

  const prompts = {
    resumen: `A partir del siguiente texto, genera un resumen educativo en formato JSON ESTRICTAMENTE con la siguiente estructura y sin ningún texto adicional fuera del JSON:\n\n{\n  "resumen_general": "Texto del resumen general aquí.",\n  "conceptos_clave": ["Concepto 1", "Concepto 2", "Concepto 3"],\n  "aplicaciones_practicas": ["Aplicación 1", "Aplicación 2", "Aplicación 3"],\n  "conclusiones": "Texto de las conclusiones aquí."\n}\n\n- Si algún campo no puede generarse, déjalo vacío pero siempre incluye todos los campos.\n- No expliques nada fuera del JSON.\n- Responde solo en español.\n\nTexto a resumir:\n${pdfText}`,

    recomendacion_video: `Basándote en el siguiente texto, sugiere 3-5 videos educativos relacionados.
    Nivel educativo: ${educationLevel}.
    Para cada video incluye:
    - Título sugerido
    - Descripción del contenido
    - Plataforma recomendada (YouTube, Khan Academy, etc.)
    - Duración estimada
    - Por qué es relevante
    
    Texto: ${pdfText}`,

    recomendacion_texto: `Basándote en el siguiente texto, sugiere 3-5 textos complementarios.
    Nivel educativo: ${educationLevel}.
    Para cada texto incluye:
    - Título sugerido
    - Autor o fuente
    - Descripción del contenido
    - Nivel de dificultad
    - Por qué complementa el texto original
    
    Texto: ${pdfText}`,

    multiple_choice: `Genera 10 preguntas de opción múltiple basadas en el siguiente texto.
    Nivel educativo: ${educationLevel}.
    Devuelve ESTRICTAMENTE un JSON con esta estructura (sin texto adicional):
    {
      "preguntas": [
        {
          "enunciado": "...",
          "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "respuesta": 0,
          "explicacion": "..."
        }
      ]
    }
    - "respuesta" es el índice (0-3) de la opción correcta.
    - Siempre 10 preguntas.
    - No incluyas nada fuera del JSON.
    
    Texto: ${pdfText}`,

    verdadero_falso: `Genera 10 preguntas de verdadero/falso basadas en el siguiente texto.
    Nivel educativo: ${educationLevel}.
    Devuelve ESTRICTAMENTE un JSON válido con la siguiente estructura, sin texto adicional:
    {
      "preguntas": [
        { "enunciado": "...", "respuesta": "verdadero|falso", "explicacion": "..." }
      ]
    }
    - "respuesta" debe ser exactamente "verdadero" o "falso".
    - "preguntas" debe tener 10 elementos.
    - No incluyas nada fuera del JSON.
    
    Texto: ${pdfText}`,

    flashcards: `Genera 15 flashcards educativas basadas en el siguiente texto.
    Nivel educativo: ${educationLevel}.
    Para cada flashcard incluye:
    - Concepto o pregunta en el frente
    - Definición o respuesta en el reverso
    - Categoría temática
    
    Texto: ${pdfText}`,

    problema: `Genera 5 problemas prácticos basados en el siguiente texto.
    Nivel educativo: ${educationLevel}.
    Para cada problema incluye:
    - Enunciado del problema
    - Datos proporcionados
    - Pasos para resolver
    - Solución
    - Explicación del proceso
    
    Texto: ${pdfText}`
    ,
    mapa_mental: `A partir del siguiente texto, genera UN mapa mental en formato Markdown compatible con Markmap, y devuelve ESTRICTAMENTE un JSON con esta estructura SIN texto adicional:
    {
      "titulo": "Título del mapa mental",
      "markmap": "# Título del mapa\n- Tema principal\n  - Concepto 1\n    - Definición breve\n    - Ejemplos:\n      - Ejemplo 1\n      - Ejemplo 2\n  - Concepto 2\n    - Definición breve\n    - Ejemplos:\n      - Ejemplo 1\n      - Ejemplo 2",
      "notas": ["Sugerencia o nota 1", "Sugerencia o nota 2"]
    }
    Requisitos:
    - El campo "markmap" DEBE ser Markdown plano (sin fences de bloque), iniciando por un encabezado (#) y usando listas con guiones para nodos e indentación de dos espacios para subniveles.
    - Incluye bajo cada concepto una subsección "Ejemplos:" con 1-3 ejemplos puntuales.
    - Mantén frases breves en cada nodo (máx. 10-12 palabras) y 4-6 conceptos principales.
    - Responde SOLO el JSON solicitado, en español.
    
    Nivel educativo: ${educationLevel}.
    Texto base:
    ${truncatedForMindmap}`
  };

  try {
    let parsed;
    try {
      const messages = contentType === 'mapa_mental'
        ? [
            {
              role: 'system',
              content: `Eres un asistente educativo experto. BASA tus respuestas UNICAMENTE en el texto proporcionado. Responde en ${language}. Devuelve SOLO JSON válido. No incluyas fences, ni texto fuera del JSON.`
            },
            {
              role: 'user',
              content: prompts[contentType]
            }
          ]
        : [
            {
              role: 'system',
              content: `Eres un asistente educativo experto. Genera contenido educativo de alta calidad, adaptado al nivel educativo especificado. Responde siempre en ${language} y en formato JSON válido.`
            },
            {
              role: 'user',
              content: prompts[contentType]
            }
          ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        max_tokens: contentType === 'mapa_mental' ? 1500 : 2000
      });
      const generatedContent = completion.choices?.[0]?.message?.content || '';
      parsed = parseJsonFromText(generatedContent);
    } catch (modelError) {
      // Fallback para mapa mental si el modelo falla
      if (contentType === 'mapa_mental') {
        const lines = (pdfText || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        const head = lines.slice(0, 6);
        let bullets = head.map((l) => `  - ${l.substring(0, 70)}`);
        if (bullets.length === 0) bullets = ['  - Concepto 1', '  - Concepto 2'];
        const markmap = ['# Mapa mental', '- Tema principal', ...bullets].join('\n');
        return { titulo: 'Mapa mental', markmap, notas: ['Generado en modo de respaldo (sin IA).'] };
      }
      throw modelError;
    }
    // Normalizar según tipo
    if (contentType === 'resumen') {
      return {
        resumen_general: parsed.resumen_general || parsed.summary || '',
        conceptos_clave: Array.isArray(parsed.conceptos_clave) ? parsed.conceptos_clave : [],
        aplicaciones_practicas: Array.isArray(parsed.aplicaciones_practicas) ? parsed.aplicaciones_practicas : [],
        conclusiones: parsed.conclusiones || ''
      };
    }
    if (contentType === 'verdadero_falso') {
      // Asegurar estructura { preguntas: [...] }
      if (Array.isArray(parsed)) {
        return { preguntas: parsed };
      }
      if (parsed && Array.isArray(parsed.preguntas)) {
        return { preguntas: parsed.preguntas };
      }
      return { preguntas: [] };
    }
    if (contentType === 'multiple_choice') {
      let preguntas = [];
      const src = Array.isArray(parsed?.preguntas) ? parsed.preguntas : (Array.isArray(parsed) ? parsed : []);
      preguntas = src.map((q) => {
        const enunciado = q.enunciado || q.pregunta || '';
        let opciones = Array.isArray(q.opciones) ? q.opciones.slice(0, 4) : [];
        if (opciones.length < 4 && Array.isArray(q.opciones)) {
          while (opciones.length < 4) opciones.push('');
        }
        // Normalizar respuesta: índice 0-3
        let respuesta = q.respuesta;
        if (typeof respuesta === 'string') {
          const letter = respuesta.trim().toUpperCase();
          const map = { A: 0, B: 1, C: 2, D: 3 };
          if (letter in map) respuesta = map[letter];
          else {
            // Buscar coincidencia por texto
            const idx = opciones.findIndex(o => (o || '').toString().trim().toLowerCase() === respuesta.toString().trim().toLowerCase());
            respuesta = idx >= 0 ? idx : 0;
          }
        }
        if (typeof respuesta !== 'number' || respuesta < 0 || respuesta > 3) respuesta = 0;
        return {
          enunciado,
          opciones,
          respuesta,
          explicacion: q.explicacion || ''
        };
      });
      return { preguntas };
    }
    if (contentType === 'mapa_mental') {
      // Normalizar salida de mapa mental
      const titulo = parsed.titulo || parsed.title || 'Mapa mental';
      let markmap = parsed.markmap || parsed.markdown || '';
      if (typeof markmap !== 'string') markmap = '';
      const notas = Array.isArray(parsed.notas) ? parsed.notas : [];

      const looksValid = (mm) => typeof mm === 'string' && mm.includes('#') && /\n\s*-\s+/m.test(mm) && mm.length > 60;
      if (!looksValid(markmap)) {
        // Reintentar una vez con un prompt más directo en caso de salida vacía o genérica
        try {
          const retryMsg = [
            { role: 'system', content: `Devuelve SOLO JSON válido con las claves {"titulo","markmap","notas"}. Basado EXCLUSIVAMENTE en el texto. No inventes.` },
            { role: 'user', content: `Crea un mapa mental en formato Markmap. Requisitos: encabezado con #, 5-7 conceptos principales con subpuntos y ejemplos, frases breves. Texto base:\n${truncatedForMindmap}` }
          ];
          const retry = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: retryMsg, temperature: 0.4, max_tokens: 1400 });
          const out = retry.choices?.[0]?.message?.content || '';
          const parsedRetry = parseJsonFromText(out);
          if (parsedRetry && typeof parsedRetry.markmap === 'string' && looksValid(parsedRetry.markmap)) {
            return { titulo: parsedRetry.titulo || titulo, markmap: parsedRetry.markmap, notas: Array.isArray(parsedRetry.notas) ? parsedRetry.notas : notas };
          }
        } catch (e) {
          // Continuar con fallback simple
        }
        const lines = (truncatedForMindmap || '').split(/\.?\s+/).filter(Boolean).slice(0, 6);
        const bullets = lines.map((l) => `  - ${l.substring(0, 70)}`);
        const fallbackMap = ['# ' + (titulo || 'Mapa mental'), '- Tema principal', ...bullets].join('\n');
        return { titulo, markmap: fallbackMap, notas: notas.length ? notas : ['Mapa generado parcialmente por contenido insuficiente.'] };
      }
      return { titulo, markmap, notas };
    }
    // Otros tipos: devolver lo parseado tal cual
    return parsed || {};
  } catch (error) {
    console.error('Error al generar contenido con OpenAI:', error);
    throw new Error('No se pudo generar el contenido con OpenAI.');
  }
};

// Generar contenido educativo
router.post('/generate/:pdfId', supabaseAuth, validate(uuidParam, 'params'), validate(aiSchemas.generateContent), async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { type } = req.body;
    // Normalizar tipo (permitir alias con guion)
    const normalizedType = (type || '').toString().trim().replace(/-/g, '_');
    const storageType = normalizedType === 'mapa_mental' ? 'flashcards' : normalizedType;

    // Validar tipo de contenido
    const validTypes = [
      'resumen', 'recomendacion_video', 'recomendacion_texto', 
      'multiple_choice', 'verdadero_falso', 'flashcards', 'problema', 'mapa_mental'
    ];

    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ 
        error: 'Tipo de contenido inválido',
        validTypes 
      });
    }

    // Obtener el PDF real de la BD
    let pdf = null;
    let pdfExists = true;
    const s = req.supabase || supabase;
    try {
      const { data, error: pdfError } = await s
        .from('pdf_uploads')
        .select('*')
        .eq('id', pdfId)
        .eq('user_id', req.user.id)
        .single();
      if (pdfError || !data) {
        return res.status(404).json({ error: 'PDF no encontrado en BD' });
      } else {
        pdf = data;
      }
    } catch (error) {
      return res.status(500).json({ error: 'Error al verificar PDF' });
    }

    // Verificar si ya existe contenido de este tipo
    let existingContent = null;
    try {
      let query = s
        .from('study_outputs')
        .select('id')
        .eq('pdf_id', pdfId)
        .eq('type', storageType);
      if (normalizedType === 'mapa_mental') {
        query = query.contains('content', { __type: 'mapa_mental' });
      }
      const { data } = await query.single();
      existingContent = data;
    } catch (error) {
      // Si hay error, continuar (no bloquear)
    }

    if (existingContent) {
      return res.status(400).json({ 
        error: 'Ya existe contenido de este tipo para este PDF',
        outputId: existingContent.id
      });
    }

    // Extraer texto real del PDF con validación de path
    let pdfText = '';
    if (pdf && pdf.file_url) {
      try {
        // Validar que la URL del archivo es segura
        const relativeFileUrl = pdf.file_url.replace(/^\//, '');
        if (relativeFileUrl.includes('..') || !relativeFileUrl.startsWith('uploads/')) {
          return res.status(400).json({ error: 'Ruta de archivo inválida.' });
        }
        
        const baseDir = path.join(__dirname, '..');
        const safePath = path.resolve(baseDir, relativeFileUrl);
        
        // Verificar que el path está dentro del directorio esperado
        if (!safePath.startsWith(path.resolve(baseDir, 'uploads'))) {
          return res.status(400).json({ error: 'Acceso a archivo no permitido.' });
        }
        
        pdfText = await extractTextFromPDF(safePath);
        if (!pdfText) {
          return res.status(500).json({ error: 'No se pudo extraer texto del PDF.' });
        }
      } catch (error) {
        console.error('Error validando ruta del PDF:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo PDF.' });
      }
    } else {
      return res.status(404).json({ error: 'PDF no encontrado o sin ruta válida.' });
    }

    // Generar contenido con IA
    let aiContent;
    try {
      aiContent = await generateEducationalContent(
        pdfText, 
        normalizedType, 
        req.user.education_level || 'universitario'
      );
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Error al generar el contenido con IA.' });
    }

    // Guardar en la base de datos
    let studyOutput;
    try {
      const contentToSave = normalizedType === 'mapa_mental' ? { __type: 'mapa_mental', ...aiContent } : aiContent;
      const { data, error: insertError } = await s
        .from('study_outputs')
        .insert([{
          pdf_id: pdfId,
          type: storageType,
          content: contentToSave // objeto JSON directo para jsonb
        }])
        .select('*')
        .single();

      if (insertError) {
        console.error('Error al guardar en BD:', insertError);
        return res.status(500).json({ error: 'Error al guardar el contenido en la base de datos.' });
      } else {
        studyOutput = data;
      }
    } catch (dbError) {
      console.error('Error de BD:', dbError);
      return res.status(500).json({ error: 'Error de base de datos.' });
    }

    res.status(201).json({
      message: 'Contenido educativo generado exitosamente',
      output: {
        id: studyOutput.id,
        type: studyOutput.type,
        content: studyOutput.content,
        createdAt: studyOutput.created_at
      }
    });

  } catch (error) {
    console.error('Error al generar contenido:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener contenido generado
router.get('/content/:outputId', supabaseAuth, async (req, res) => {
  try {
    const { outputId } = req.params;
    const s = req.supabase || supabase;

    let output;
    try {
      const { data, error } = await s
        .from('study_outputs')
        .select(`
          id,
          type,
          content,
          created_at,
          pdf_uploads!inner (
            id,
            title,
            user_id
          )
        `)
        .eq('id', outputId)
        .eq('pdf_uploads.user_id', req.user.id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Contenido no encontrado en BD' });
      } else {
        output = data;
      }
    } catch (dbError) {
      console.error('Error de BD:', dbError);
      return res.status(500).json({ error: 'Error de base de datos.' });
    }

    res.json({ output });

  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Listar todo el contenido generado para un PDF
router.get('/pdf/:pdfId', supabaseAuth, async (req, res) => {
  try {
    const { pdfId } = req.params;
    const s = req.supabase || supabase;

    // Verificar que el PDF pertenece al usuario
    const { data: pdf } = await s
      .from('pdf_uploads')
      .select('id')
      .eq('id', pdfId)
      .eq('user_id', req.user.id)
      .single();

    if (!pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    const { data: outputs, error } = await s
      .from('study_outputs')
      .select('id, type, created_at')
      .eq('pdf_id', pdfId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener outputs:', error);
      return res.status(500).json({ error: 'Error al obtener el contenido' });
    }

    res.json({ outputs });

  } catch (error) {
    console.error('Error al listar contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Regenerar contenido (eliminar y crear nuevo)
router.post('/regenerate/:outputId', supabaseAuth, async (req, res) => {
  try {
    const { outputId } = req.params;

    // Obtener el output existente
    const { data: existingOutput, error: fetchError } = await supabase
      .from('study_outputs')
      .select(`
        id,
        type,
        content,
        pdf_uploads!inner (
          id,
          title,
          user_id
        )
      `)
      .eq('id', outputId)
      .eq('pdf_uploads.user_id', req.user.id)
      .single();

    if (fetchError || !existingOutput) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Volver a extraer texto del PDF real usando file_url
    const { data: pdfRecord } = await supabase
      .from('pdf_uploads')
      .select('file_url, user_id')
      .eq('id', existingOutput.pdf_uploads.id)
      .single();

    if (!pdfRecord || pdfRecord.user_id !== req.user.id) {
      return res.status(404).json({ error: 'PDF no encontrado para regeneración' });
    }

    // Validar y construir ruta segura para regeneración
    const relativeFileUrl = (pdfRecord.file_url || '').replace(/^\//, '');
    if (relativeFileUrl.includes('..') || !relativeFileUrl.startsWith('uploads/')) {
      return res.status(400).json({ error: 'Ruta de archivo inválida para regeneración.' });
    }
    
    const baseDir = path.join(__dirname, '..');
    const safePath = path.resolve(baseDir, relativeFileUrl);
    
    // Verificar que el path está dentro del directorio esperado
    if (!safePath.startsWith(path.resolve(baseDir, 'uploads'))) {
      return res.status(400).json({ error: 'Acceso a archivo no permitido para regeneración.' });
    }
    
    const pdfText = await extractTextFromPDF(safePath);

    // Generar nuevo contenido
    const isMindmapAlias = existingOutput.type === 'flashcards' && existingOutput.content && existingOutput.content.__type === 'mapa_mental';
    const effectiveType = isMindmapAlias ? 'mapa_mental' : existingOutput.type;
    const newContent = await generateEducationalContent(
      pdfText,
      effectiveType,
      req.user.education_level || 'universitario'
    );

    // Actualizar en la base de datos
    const contentToSave = isMindmapAlias ? { __type: 'mapa_mental', ...newContent } : newContent;
    const { data: updatedOutput, error: updateError } = await supabase
      .from('study_outputs')
      .update({ content: contentToSave })
      .eq('id', outputId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error al actualizar contenido:', updateError);
      return res.status(500).json({ error: 'Error al regenerar el contenido' });
    }

    res.json({
      message: 'Contenido regenerado exitosamente',
      output: {
        id: updatedOutput.id,
        type: updatedOutput.type,
        content: updatedOutput.content,
        createdAt: updatedOutput.created_at
      }
    });

  } catch (error) {
    console.error('Error al regenerar contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar contenido generado
router.delete('/content/:outputId', supabaseAuth, async (req, res) => {
  try {
    const { outputId } = req.params;

    // Verificar que el contenido pertenece al usuario
    const { data: output } = await supabase
      .from('study_outputs')
      .select(`
        id,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('id', outputId)
      .eq('pdf_uploads.user_id', req.user.id)
      .single();

    if (!output) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Eliminar el contenido
    const { error } = await supabase
      .from('study_outputs')
      .delete()
      .eq('id', outputId);

    if (error) {
      console.error('Error al eliminar contenido:', error);
      return res.status(500).json({ error: 'Error al eliminar el contenido' });
    }

    res.json({ message: 'Contenido eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 
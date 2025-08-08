const express = require('express');
const OpenAI = require('openai');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
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

// Función para limpiar la respuesta de OpenAI
const cleanOpenAIResponse = (response) => {
  let parsed;
  try {
    parsed = typeof response === 'string' ? JSON.parse(response) : response;
  } catch (error) {
    let cleaned = response;
    cleaned = cleaned.replace(/```json|```/gi, '');
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.substring(first, last + 1);
    }
    cleaned = cleaned.replace(/\n/g, '').trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      parsed = {};
    }
  }
  return {
    resumen_general: parsed.resumen_general || '',
    conceptos_clave: Array.isArray(parsed.conceptos_clave) ? parsed.conceptos_clave : [],
    aplicaciones_practicas: Array.isArray(parsed.aplicaciones_practicas) ? parsed.aplicaciones_practicas : [],
    conclusiones: parsed.conclusiones || ''
  };
};

// Función para generar contenido educativo con IA
const generateEducationalContent = async (pdfText, contentType, educationLevel, language = 'español') => {
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
    Para cada pregunta incluye:
    - Pregunta clara
    - 4 opciones (A, B, C, D)
    - Respuesta correcta
    - Explicación de por qué es correcta
    
    Texto: ${pdfText}`,

    verdadero_falso: `Genera 10 preguntas de verdadero/falso basadas en el siguiente texto.
    Nivel educativo: ${educationLevel}.
    Para cada pregunta incluye:
    - Afirmación clara
    - Respuesta (verdadero/falso)
    - Explicación
    
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
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un asistente educativo experto. Genera contenido educativo de alta calidad, \n          adaptado al nivel educativo especificado. Responde siempre en ${language} y en formato JSON válido.\n          Para resúmenes, incluye: resumen_general, conceptos_clave (array), aplicaciones_practicas (array), conclusiones.`
        },
        {
          role: "user",
          content: prompts[contentType]
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
    const generatedContent = completion.choices[0].message.content;
    const cleanedContent = cleanOpenAIResponse(generatedContent);
    // Devolver como objeto JSON (no string) para almacenar en jsonb correctamente
    return cleanedContent;
  } catch (error) {
    console.error('Error al generar contenido con OpenAI:', error);
    throw new Error('No se pudo generar el contenido con OpenAI.');
  }
};

// Generar contenido educativo
router.post('/generate/:pdfId', supabaseAuth, async (req, res) => {
  try {
    const { pdfId } = req.params;
    const { type } = req.body;

    // Validar tipo de contenido
    const validTypes = [
      'resumen', 'recomendacion_video', 'recomendacion_texto', 
      'multiple_choice', 'verdadero_falso', 'flashcards', 'problema'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo de contenido inválido',
        validTypes 
      });
    }

    // Obtener el PDF real de la BD
    let pdf = null;
    let pdfExists = true;
    try {
      const { data, error: pdfError } = await supabase
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
      const { data } = await supabase
        .from('study_outputs')
        .select('id')
        .eq('pdf_id', pdfId)
        .eq('type', type)
        .single();
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

    // Extraer texto real del PDF
    let pdfText = '';
    if (pdf && pdf.file_url) {
      // Normalizar a ruta relativa dentro del proyecto (Backend/uploads/...)
      const relativeFileUrl = pdf.file_url.replace(/^\//, '');
      const pdfPath = path.join(__dirname, '..', relativeFileUrl);
      pdfText = await extractTextFromPDF(pdfPath);
      if (!pdfText) {
        return res.status(500).json({ error: 'No se pudo extraer texto del PDF.' });
      }
    } else {
      return res.status(404).json({ error: 'PDF no encontrado o sin ruta válida.' });
    }

    // Generar contenido con IA
    let aiContent;
    try {
      aiContent = await generateEducationalContent(
        pdfText, 
        type, 
        req.user.education_level || 'universitario'
      );
    } catch (error) {
      return res.status(500).json({ error: error.message || 'Error al generar el contenido con IA.' });
    }

    // Guardar en la base de datos
    let studyOutput;
    try {
      const { data, error: insertError } = await supabase
        .from('study_outputs')
        .insert([{
          pdf_id: pdfId,
          type: type,
          content: aiContent // objeto JSON directo para jsonb
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

    let output;
    try {
      const { data, error } = await supabase
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

    // Verificar que el PDF pertenece al usuario
    const { data: pdf } = await supabase
      .from('pdf_uploads')
      .select('id')
      .eq('id', pdfId)
      .eq('user_id', req.user.id)
      .single();

    if (!pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    const { data: outputs, error } = await supabase
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

    const relativeFileUrl = (pdfRecord.file_url || '').replace(/^\//, '');
    const pdfPath = path.join(__dirname, '..', relativeFileUrl);
    const pdfText = await extractTextFromPDF(pdfPath);

    // Generar nuevo contenido
    const newContent = await generateEducationalContent(
      pdfText,
      existingOutput.type,
      req.user.education_level || 'universitario'
    );

    // Actualizar en la base de datos
    const { data: updatedOutput, error: updateError } = await supabase
      .from('study_outputs')
      .update({ content: newContent })
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
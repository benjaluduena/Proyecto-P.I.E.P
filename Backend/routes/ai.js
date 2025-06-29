const express = require('express');
const OpenAI = require('openai');
const supabase = require('../config/supabase');
const { simpleAuth } = require('../middleware/auth');

const router = express.Router();

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función para extraer texto del PDF (simulada por ahora)
const extractTextFromPDF = async (filePath) => {
  // En una implementación real, usarías una librería como pdf-parse
  // Por ahora retornamos texto de ejemplo
  return `Este es un ejemplo de contenido extraído del PDF. 
  Contiene información educativa sobre el tema que el usuario ha subido.
  La IA analizará este contenido para generar recursos educativos personalizados.`;
};

// Función para generar contenido educativo con IA
const generateEducationalContent = async (pdfText, contentType, educationLevel, language = 'español') => {
  const prompts = {
    resumen: `Genera un resumen educativo del siguiente texto. 
    Nivel educativo: ${educationLevel}. 
    Incluye:
    - Ideas principales
    - Conceptos clave
    - Esquema organizado
    - Puntos importantes para recordar
    
    Texto: ${pdfText}`,

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
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Eres un asistente educativo experto. Genera contenido educativo de alta calidad, 
          adaptado al nivel educativo especificado. Responde siempre en ${language} y en formato JSON válido.`
        },
        {
          role: "user",
          content: prompts[contentType]
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error al generar contenido con OpenAI:', error);
    throw new Error('Error al generar contenido educativo');
  }
};

// Generar contenido educativo
router.post('/generate/:pdfId', simpleAuth, async (req, res) => {
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

    // Verificar que el PDF pertenece al usuario
    const { data: pdf, error: pdfError } = await supabase
      .from('pdf_uploads')
      .select('*')
      .eq('id', pdfId)
      .eq('user_id', req.user.id)
      .single();

    if (pdfError || !pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    // Verificar si ya existe contenido de este tipo
    const { data: existingContent } = await supabase
      .from('study_outputs')
      .select('id')
      .eq('pdf_id', pdfId)
      .eq('type', type)
      .single();

    if (existingContent) {
      return res.status(400).json({ 
        error: 'Ya existe contenido de este tipo para este PDF',
        outputId: existingContent.id
      });
    }

    // Extraer texto del PDF (simulado)
    const pdfText = await extractTextFromPDF(pdf.file_url);

    // Generar contenido con IA
    const aiContent = await generateEducationalContent(
      pdfText, 
      type, 
      req.user.education_level || 'universitario'
    );

    // Guardar en la base de datos
    const { data: studyOutput, error: insertError } = await supabase
      .from('study_outputs')
      .insert([{
        pdf_id: pdfId,
        type: type,
        content: aiContent
      }])
      .select('*')
      .single();

    if (insertError) {
      console.error('Error al guardar contenido generado:', insertError);
      return res.status(500).json({ error: 'Error al guardar el contenido' });
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener contenido generado
router.get('/content/:outputId', simpleAuth, async (req, res) => {
  try {
    const { outputId } = req.params;

    const { data: output, error } = await supabase
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

    if (error || !output) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    res.json({ output });

  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar todo el contenido generado para un PDF
router.get('/pdf/:pdfId', simpleAuth, async (req, res) => {
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
router.post('/regenerate/:outputId', simpleAuth, async (req, res) => {
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

    // Extraer texto del PDF (simulado)
    const pdfText = await extractTextFromPDF(existingOutput.pdf_uploads.title);

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
router.delete('/content/:outputId', simpleAuth, async (req, res) => {
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
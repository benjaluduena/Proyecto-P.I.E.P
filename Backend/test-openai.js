const OpenAI = require('openai');
require('dotenv').config();

// Configurar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('🧪 Probando conexión con OpenAI...\n');
    
    // Verificar que la API key esté configurada
    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ No se encontró OPENAI_API_KEY en las variables de entorno');
      return;
    }
    
    if (process.env.OPENAI_API_KEY === 'tu_openai_api_key_aqui') {
      console.log('❌ La API key no ha sido configurada (está usando el valor por defecto)');
      return;
    }
    
    console.log('✅ API key encontrada');
    console.log('🔑 API key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');
    
    // Probar una petición simple
    console.log('\n📡 Enviando petición de prueba a OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente educativo experto. Responde en español."
        },
        {
          role: "user",
          content: "Genera un resumen muy breve (2-3 líneas) sobre inteligencia artificial en formato JSON con campos: resumen_general, conceptos_clave (array), conclusiones."
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });
    
    const response = completion.choices[0].message.content;
    console.log('✅ Respuesta recibida de OpenAI:');
    console.log('📝 Contenido:', response);
    
    // Intentar parsear como JSON
    try {
      const jsonResponse = JSON.parse(response);
      console.log('✅ Respuesta es JSON válido');
      console.log('📊 Estructura:', Object.keys(jsonResponse));
    } catch (parseError) {
      console.log('⚠️ La respuesta no es JSON válido, pero OpenAI funciona');
      console.log('📝 Contenido como texto:', response);
    }
    
    console.log('\n🎉 ¡Prueba completada exitosamente!');
    console.log('✅ OpenAI está funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error al probar OpenAI:', error.message);
    
    if (error.code === 'invalid_api_key') {
      console.log('🔑 La API key parece ser inválida');
    } else if (error.code === 'insufficient_quota') {
      console.log('💰 Has agotado tu cuota de OpenAI');
    } else if (error.code === 'rate_limit_exceeded') {
      console.log('⏱️ Has excedido el límite de peticiones');
    } else {
      console.log('🔍 Error desconocido, verifica tu conexión a internet');
    }
  }
}

// Ejecutar la prueba
testOpenAI(); 
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// URL base del servidor
const BASE_URL = 'http://localhost:5500';

// Función para crear un archivo de prueba
function createTestFile() {
  const testContent = `
    Este es un documento de prueba sobre inteligencia artificial.
    
    La inteligencia artificial (IA) es una rama de la informática que se enfoca en crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana.
    
    Conceptos clave:
    - Machine Learning: Algoritmos que aprenden de los datos
    - Deep Learning: Redes neuronales profundas
    - Natural Language Processing: Procesamiento del lenguaje natural
    - Computer Vision: Visión por computadora
    
    Aplicaciones prácticas:
    - Asistentes virtuales como Siri y Alexa
    - Sistemas de recomendación en Netflix y Amazon
    - Diagnóstico médico asistido por IA
    - Vehículos autónomos
    
    La IA está transformando múltiples industrias y se espera que continúe evolucionando rápidamente en los próximos años.
  `;
  
  const testFilePath = path.join(__dirname, 'test-document.txt');
  fs.writeFileSync(testFilePath, testContent);
  return testFilePath;
}

// Función para simular el flujo completo
async function testCompleteFlow() {
  try {
    console.log('🧪 Iniciando prueba del flujo completo de resumen...\n');

    // 1. Crear archivo de prueba
    console.log('1. Creando archivo de prueba...');
    const testFilePath = createTestFile();
    console.log('✅ Archivo de prueba creado\n');

    // 2. Simular subida de PDF
    console.log('2. Simulando subida de PDF...');
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(testFilePath));
    
    const uploadResponse = await fetch(`${BASE_URL}/api/pdfs/upload`, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Error en subida: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
    }

    const { pdf } = await uploadResponse.json();
    console.log(`✅ PDF subido exitosamente. ID: ${pdf.id}\n`);

    // 3. Generar resumen con IA (usando contenido de respaldo)
    console.log('3. Generando resumen con IA...');
    const summaryResponse = await fetch(`${BASE_URL}/api/ai/generate/${pdf.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ type: 'resumen' })
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`Error en generación: ${summaryResponse.status} ${summaryResponse.statusText} - ${errorText}`);
    }

    const { output } = await summaryResponse.json();
    console.log(`✅ Resumen generado exitosamente. ID: ${output.id}\n`);

    // 4. Obtener el resumen generado
    console.log('4. Obteniendo resumen generado...');
    const getResponse = await fetch(`${BASE_URL}/api/ai/content/${output.id}`);

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Error al obtener resumen: ${getResponse.status} ${getResponse.statusText} - ${errorText}`);
    }

    const { output: retrievedOutput } = await getResponse.json();
    console.log('✅ Resumen obtenido exitosamente\n');

    // 5. Mostrar el resumen
    console.log('5. Contenido del resumen:');
    console.log('='.repeat(50));
    
    try {
      const summaryData = JSON.parse(retrievedOutput.content);
      console.log('📋 Resumen General:', summaryData.resumen_general);
      console.log('🔑 Conceptos Clave:', summaryData.conceptos_clave?.length || 0, 'conceptos');
      console.log('💡 Aplicaciones Prácticas:', summaryData.aplicaciones_practicas?.length || 0, 'aplicaciones');
      console.log('📝 Conclusiones:', summaryData.conclusiones);
    } catch (parseError) {
      console.log('⚠️ No se pudo parsear como JSON, mostrando como texto:');
      console.log(retrievedOutput.content.substring(0, 300) + '...');
    }
    
    console.log('='.repeat(50));

    // 6. Verificar URL de redirección
    const redirectUrl = `${BASE_URL}/Frontend/resumen.html?pdfId=${pdf.id}&outputId=${output.id}&fileName=test-document.txt`;
    console.log('\n6. URL de redirección esperada:');
    console.log(redirectUrl);

    // Limpiar archivo de prueba
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Archivo de prueba eliminado');
    
    console.log('\n🎉 ¡Prueba completada exitosamente!');
    console.log('✅ El flujo completo funciona correctamente');
    console.log('🌐 Puedes probar manualmente en: http://localhost:5500/Frontend/Pages/home.html');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    
    // Mostrar detalles del error si están disponibles
    if (error.response) {
      try {
        const errorDetails = await error.response.text();
        console.error('Detalles del error:', errorDetails);
      } catch (e) {
        console.error('No se pudieron obtener detalles del error');
      }
    }
  }
}

// Ejecutar la prueba
testCompleteFlow(); 
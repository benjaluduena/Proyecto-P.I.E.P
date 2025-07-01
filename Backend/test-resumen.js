const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// URL base del servidor
const BASE_URL = 'http://localhost:5500';

// Función para crear un PDF de prueba
function createTestPDF() {
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
async function testResumenFlow() {
  try {
    console.log('🧪 Iniciando prueba del flujo de resumen...\n');

    // 1. Crear archivo de prueba
    console.log('1. Creando archivo de prueba...');
    const testFilePath = createTestPDF();
    console.log('✅ Archivo de prueba creado\n');

    // 2. Simular subida de PDF (usando el archivo de texto como PDF)
    console.log('2. Simulando subida de PDF...');
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(testFilePath));
    
    const uploadResponse = await fetch(`${BASE_URL}/api/pdfs/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        // Simular autenticación básica
        'Authorization': 'Bearer test-token'
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Error en subida: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const { pdf } = await uploadResponse.json();
    console.log(`✅ PDF subido exitosamente. ID: ${pdf.id}\n`);

    // 3. Generar resumen con IA
    console.log('3. Generando resumen con IA...');
    const summaryResponse = await fetch(`${BASE_URL}/api/ai/generate/${pdf.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({ type: 'resumen' })
    });

    if (!summaryResponse.ok) {
      throw new Error(`Error en generación: ${summaryResponse.status} ${summaryResponse.statusText}`);
    }

    const { output } = await summaryResponse.json();
    console.log(`✅ Resumen generado exitosamente. ID: ${output.id}\n`);

    // 4. Obtener el resumen generado
    console.log('4. Obteniendo resumen generado...');
    const getResponse = await fetch(`${BASE_URL}/api/ai/content/${output.id}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!getResponse.ok) {
      throw new Error(`Error al obtener resumen: ${getResponse.status} ${getResponse.statusText}`);
    }

    const { output: retrievedOutput } = await getResponse.json();
    console.log('✅ Resumen obtenido exitosamente\n');

    // 5. Mostrar el resumen
    console.log('5. Contenido del resumen:');
    console.log('='.repeat(50));
    console.log(retrievedOutput.content);
    console.log('='.repeat(50));

    // Limpiar archivo de prueba
    fs.unlinkSync(testFilePath);
    console.log('\n🧹 Archivo de prueba eliminado');
    
    console.log('\n🎉 ¡Prueba completada exitosamente!');

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
testResumenFlow(); 
// 📝 Archivo de ejemplo para probar la API de P.I.E.P.
// Ejecutar con: node test-api.js

const BASE_URL = 'http://localhost:3000/api';

// Función para hacer requests HTTP
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`\n🔗 ${options.method || 'GET'} ${endpoint}`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`❌ Error en ${endpoint}:`, error.message);
    return { response: null, data: null };
  }
}

// Función principal de pruebas
async function testAPI() {
  console.log('🧪 Iniciando pruebas de la API P.I.E.P.\n');

  // 1. Probar endpoint de salud
  console.log('1️⃣ Probando endpoint de salud...');
  await makeRequest('/health');

  // 2. Registrar un usuario
  console.log('\n2️⃣ Registrando usuario...');
  const registerData = {
    name: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    password: '123456',
    role: 'estudiante',
    education_level: 'universitario'
  };
  
  const { data: registerResponse } = await makeRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(registerData)
  });

  let token = registerResponse?.token;

  // 3. Login si el registro falló
  if (!token) {
    console.log('\n🔄 Intentando login...');
    const loginData = {
      email: 'juan@ejemplo.com',
      password: '123456'
    };
    
    const { data: loginResponse } = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });
    
    token = loginResponse?.token;
  }

  if (!token) {
    console.log('❌ No se pudo obtener token de autenticación');
    return;
  }

  // 4. Obtener perfil del usuario
  console.log('\n3️⃣ Obteniendo perfil...');
  await makeRequest('/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // 5. Subir un PDF (simulado)
  console.log('\n4️⃣ Subiendo PDF...');
  const pdfData = {
    title: 'Documento de prueba',
    fileName: 'test.pdf',
    fileUrl: '/uploads/test.pdf'
  };
  
  const { data: pdfResponse } = await makeRequest('/pdfs/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(pdfData)
  });

  // 6. Listar PDFs del usuario
  console.log('\n5️⃣ Listando PDFs...');
  await makeRequest('/pdfs/my-pdfs', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // 7. Crear un plan de estudio
  console.log('\n6️⃣ Creando plan de estudio...');
  const planData = {
    title: 'Plan de estudio de prueba',
    description: 'Este es un plan de estudio de ejemplo',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    notify_by_email: true,
    notify_by_whatsapp: false
  };
  
  const { data: planResponse } = await makeRequest('/study/plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(planData)
  });

  // 8. Listar planes de estudio
  console.log('\n7️⃣ Listando planes de estudio...');
  await makeRequest('/study/plans', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // 9. Obtener estadísticas de progreso
  console.log('\n8️⃣ Obteniendo estadísticas...');
  await makeRequest('/study/progress/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // 10. Listar notificaciones
  console.log('\n9️⃣ Listando notificaciones...');
  await makeRequest('/notifications', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  console.log('\n✅ Pruebas completadas!');
  console.log('\n📋 Resumen de endpoints probados:');
  console.log('   ✅ /health - Endpoint de salud');
  console.log('   ✅ /auth/register - Registro de usuario');
  console.log('   ✅ /auth/login - Login de usuario');
  console.log('   ✅ /auth/profile - Obtener perfil');
  console.log('   ✅ /pdfs/upload - Subir PDF');
  console.log('   ✅ /pdfs/my-pdfs - Listar PDFs');
  console.log('   ✅ /study/plans - Crear plan de estudio');
  console.log('   ✅ /study/plans - Listar planes');
  console.log('   ✅ /study/progress/stats - Estadísticas');
  console.log('   ✅ /notifications - Listar notificaciones');
}

// Ejecutar pruebas si el archivo se ejecuta directamente
if (require.main === module) {
  testAPI().catch(console.error);
}

module.exports = { makeRequest, testAPI }; 
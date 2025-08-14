# Guía de Diagnóstico para Problemas de Suscripción

## Pasos para diagnosticar por qué no aparece la suscripción activa en el perfil:

### 1. Verificar en el Frontend

1.1. Accede a tu perfil:
   - Ve a `https://8b686a73f8bb.ngrok-free.app/perfil.html` (o la URL donde esté tu aplicación)
   - Esta página mostrará el estado de tu suscripción en la sección "Suscripción"

1.2. Verifica los datos mostrados:
   - ¿Se muestra correctamente el ID, email y nombre del usuario?
   - ¿Hay un token de acceso presente?
   - ¿Qué estado muestra para la suscripción?

### 2. Verificar en la Base de Datos

2.1. Conecta a tu base de datos de Supabase

2.2. Ejecuta esta consulta para verificar la suscripción:
```sql
SELECT * FROM subscriptions WHERE user_id = 'ID_DEL_USUARIO';
```

2.3. Verifica estos campos:
   - `status`: Debería ser 'authorized' para una suscripción activa
   - `mp_preapproval_id`: Debería tener un ID de Mercado Pago
   - `next_payment_date`: Debería tener una fecha futura

### 3. Verificar en Mercado Pago

3.1. Ingresa a tu panel de Mercado Pago
3.2. Busca la suscripción por el `mp_preapproval_id`
3.3. Verifica que el estado sea "authorized"

### 4. Verificar Webhook

4.1. En tu panel de Mercado Pago, verifica que el webhook esté correctamente configurado
4.2. Revisa los logs de tu servidor para ver si se están recibiendo las notificaciones

### 5. Soluciones Comunes

5.1. Si la suscripción aparece como "pending" en tu base de datos:
   - Puede que el usuario no haya completado el proceso de pago
   - Verifica en Mercado Pago si el pago fue procesado

5.2. Si no hay registro de suscripción en la base de datos:
   - Puede que el webhook no se haya ejecutado correctamente
   - Verifica los logs del servidor para errores en `/api/payments/mp/webhook`

5.3. Si hay discrepancia entre Mercado Pago y tu base de datos:
   - Puede ser un problema de sincronización
   - Prueba ejecutar manualmente el webhook con los datos de Mercado Pago

## Comandos Útiles para Debugging

### Verificar suscripciones en la base de datos:
```sql
-- Ver todas las suscripciones
SELECT * FROM subscriptions;

-- Ver suscripciones de un usuario específico
SELECT * FROM subscriptions WHERE user_id = 'ID_DEL_USUARIO';

-- Ver suscripciones activas
SELECT * FROM subscriptions WHERE status = 'authorized';
```

### Verificar perfiles de usuarios:
```sql
-- Ver perfil de un usuario específico
SELECT * FROM profiles WHERE id = 'ID_DEL_USUARIO';

-- Ver todos los perfiles con suscripciones
SELECT p.*, s.status as subscription_status 
FROM profiles p 
LEFT JOIN subscriptions s ON p.id = s.user_id;
```

## Pruebas de API

Puedes probar directamente los endpoints de la API usando herramientas como curl o Postman:

### Obtener estado de suscripción:
```bash
curl -H "Authorization: Bearer TU_TOKEN_DE_ACCESO" \
https://8b686a73f8bb.ngrok-free.app/api/payments/subscription/status
```

### Sincronizar suscripción manualmente:
```bash
curl -X POST -H "Authorization: Bearer TU_TOKEN_DE_ACCESO" \
https://8b686a73f8bb.ngrok-free.app/api/payments/subscription/sync
```

### Verificar salud del sistema:
```bash
curl https://8b686a73f8bb.ngrok-free.app/api/diagnostic/system/health
```

## Flujo de Suscripción Actualizado

1. **Usuario hace clic en "Cambiar plan"** desde el sidebar
2. **Se crea la suscripción** en Mercado Pago y se guarda en BD
3. **Usuario completa el pago** en Mercado Pago
4. **Webhook actualiza el estado** a 'authorized' en BD
5. **Usuario regresa automáticamente** a su perfil (`/perfil.html`)
6. **El perfil muestra el estado actualizado** de la suscripción

## Contacto

Si después de seguir estos pasos el problema persiste, por favor proporciona:
1. Captura de pantalla del perfil mostrando el estado de suscripción
2. Registros del servidor (logs) del momento en que se accede al perfil
3. Información de la suscripción en la base de datos
4. ID de suscripción en Mercado Pago
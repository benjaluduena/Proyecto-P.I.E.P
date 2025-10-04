const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');

// Configuración de Mercado Pago
function getMpClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Falta MP_ACCESS_TOKEN en variables de entorno');
  }
  return new MercadoPagoConfig({ accessToken });
}

// Crear suscripción (preapproval)
// Protegido con auth para conocer el usuario
router.post('/mp/create-subscription', supabaseAuth, async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Configuración faltante: MP_ACCESS_TOKEN no definido en el servidor' });
    }
    const {
      reason = 'Suscripción mensual P.I.E.P.',
      amount = 100,
      currency = 'ARS',
      frequency = 1,
      frequencyType = 'months',
      backUrl: bodyBackUrl,
      plan // Nuevo parámetro para identificar el plan
    } = req.body || {};

    // Validar y forzar back_url a ser HTTPS válido
    let backUrl = process.env.MP_BACK_URL || 'https://www.mercadopago.com.ar';
    try {
      const candidate = new URL(bodyBackUrl || '');
      if (candidate.protocol === 'https:') {
        backUrl = candidate.href;
      }
    } catch (_) {
      // Ignorar; usamos el de entorno o fallback https
    }

    const client = getMpClient();
    const preApproval = new PreApproval(client);

    console.log('MP back_url usado:', backUrl);

    const result = await preApproval.create({
      body: {
        reason,
        auto_recurring: {
          frequency,
          frequency_type: frequencyType,
          transaction_amount: Number(amount),
          currency_id: currency
        },
        back_url: backUrl,
        external_reference: req.user.id,
        payer_email: req.user.email
      }
    });

    // Guardar/actualizar en BD el intento de suscripción (si existe tabla)
    try {
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: req.user.id,
          mp_preapproval_id: result.id,
          status: result.status || 'pending',
          reason,
          amount: Number(amount),
          currency,
          frequency,
          frequency_type: frequencyType,
          next_payment_date: result.auto_recurring?.next_payment_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            plan: plan || 'estudiante' // Guardar el plan en metadata
          }
        }, { onConflict: 'user_id' });
    } catch (_) {}

    return res.json({
      ok: true,
      id: result.id,
      init_point: result.init_point,
      status: result.status
    });
  } catch (error) {
    console.error('Error creando suscripción MP:', error);
    const status = Number(error?.status) || 500;
    const message = typeof error?.message === 'string' ? error.message : 'No se pudo crear la suscripción';
    return res.status(status).json({ error: message });
  }
});

// Webhook de Mercado Pago para eventos de suscripciones
router.post('/mp/webhook', async (req, res) => {
  try {
    // Mercado Pago envía diferentes formatos; soportamos ambos
    const queryType = req.query.type || req.body?.type;
    const action = req.query.action || req.body?.action;
    const resourceId = req.query.id || req.query['data.id'] || req.body?.data?.id || req.body?.id;

    if (!resourceId) {
      return res.status(200).json({ received: true });
    }

    const client = getMpClient();
    const preApproval = new PreApproval(client);

    let preapprovalData = null;
    try {
      preapprovalData = await preApproval.get({ id: String(resourceId) });
    } catch (e) {
      // Si no es un preapproval válido, confirmamos recepción para evitar reintentos
      return res.status(200).json({ received: true });
    }

    const userId = preapprovalData.external_reference;
    const status = preapprovalData.status; // authorized | paused | cancelled | pending
    const nextPayment = preapprovalData.auto_recurring?.next_payment_date || null;

    if (userId) {
      // Actualizar tabla subscriptions si existe
      try {
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            mp_preapproval_id: preapprovalData.id,
            status,
            next_payment_date: nextPayment,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (_) {}

      // También opcionalmente actualizar profiles con un flag simple
      try {
        await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (_) {}
      
      // Enviar notificación al usuario sobre cambio de estado
      try {
        const { data: user } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('id', userId)
          .single();
        
        if (user && user.email) {
          // Enviar email de notificación (usando nodemailer configurado en notifications.js)
          const subject = status === 'authorized' 
            ? '✅ Tu suscripción P.I.E.P. está activa' 
            : status === 'cancelled' 
              ? '⚠️ Tu suscripción P.I.E.P. ha sido cancelada'
              : 'ℹ️ Actualización de tu suscripción P.I.E.P.';
          
          const html = `
            <h2>Hola ${user.name},</h2>
            <p>Tu suscripción P.I.E.P. ha sido actualizada.</p>
            <p><strong>Nuevo estado:</strong> ${status}</p>
            ${nextPayment ? `<p><strong>Próximo pago:</strong> ${new Date(nextPayment).toLocaleDateString()}</p>` : ''}
            <p>Accede a tu cuenta para más detalles.</p>
          `;
          
          // Aquí deberías llamar a la función de envío de email
          // sendEmail(user.email, subject, html);
        }
      } catch (emailError) {
        console.error('Error al enviar notificación por email:', emailError);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook MP:', error);
    return res.status(200).json({ received: true }); // Evitar reintentos masivos
  }
});

// Obtener estado de suscripción del usuario
router.get('/subscription/status', supabaseAuth, async (req, res) => {
  try {
    console.log('Obteniendo estado de suscripción para usuario:', req.user.id);
    
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // Log para debugging
    console.log('Resultado de la consulta:', { subscription, error });

    if (error || !subscription) {
      // Si no hay suscripción, devolver estado por defecto
      console.log('No se encontró suscripción para el usuario');
      return res.json({
        status: 'inactive',
        plan: 'gratis',
        next_payment_date: null,
        created_at: null
      });
    }

    const responseData = {
      status: subscription.status,
      plan: subscription.metadata?.plan || 'estudiante',
      next_payment_date: subscription.next_payment_date,
      created_at: subscription.created_at
    };
    
    console.log('Enviando datos de suscripción:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error al obtener estado de suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cancelar suscripción
router.post('/subscription/cancel', supabaseAuth, async (req, res) => {
  try {
    // Obtener la suscripción actual del usuario
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('mp_preapproval_id')
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    // Cancelar en Mercado Pago
    const client = getMpClient();
    const preApproval = new PreApproval(client);
    
    const result = await preApproval.update({
      id: subscription.mp_preapproval_id,
      body: {
        status: 'cancelled'
      }
    });

    // Actualizar en la base de datos
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id);

    if (updateError) {
      console.error('Error al actualizar suscripción:', updateError);
    }

    res.json({ 
      message: 'Suscripción cancelada correctamente',
      mp_result: result
    });
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    res.status(500).json({ error: 'Error al cancelar la suscripción' });
  }
});

module.exports = router;

// Endpoint de salud/diagnóstico (no expone secretos)
router.get('/mp/health', async (req, res) => {
  const hasToken = !!process.env.MP_ACCESS_TOKEN;
  const configuredBackUrl = process.env.MP_BACK_URL || null;
  let isBackUrlHttps = false;
  try {
    const u = new URL(configuredBackUrl || '');
    isBackUrlHttps = u.protocol === 'https:';
  } catch (_) {}
  let subscriptionsTableOk = true;
  try {
    // Intento mínimo para verificar existencia de tabla
    await supabase.from('subscriptions').select('user_id').limit(1);
  } catch (_) {
    subscriptionsTableOk = false;
  }
  return res.json({
    mp_access_token_configured: hasToken,
    mp_back_url_configured: !!configuredBackUrl,
    mp_back_url_is_https: isBackUrlHttps,
    mp_back_url_value: configuredBackUrl,
    subscriptions_table_exists: subscriptionsTableOk
  });
});



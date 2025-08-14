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
  
  // Log temporal para debugging
  console.log('🔍 MP Token configurado:', accessToken.substring(0, 15) + '...');
  
  return new MercadoPagoConfig({ accessToken });
}

// Crear suscripción (preapproval)
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
      plan = 'estudiante'
    } = req.body || {};

    // Validar y forzar back_url a ser HTTPS válido
    let backUrl = process.env.MP_BACK_URL || 'https://www.mercadopago.com.ar';
    try {
      const candidate = new URL(bodyBackUrl || '');
      if (candidate.protocol === 'https:') {
        backUrl = candidate.href;
      }
    } catch (_) {
      // Si no hay MP_BACK_URL configurado, usar la URL del perfil
      backUrl = `${req.protocol}://${req.get('host')}/perfil.html`;
    }

    const client = getMpClient();
    const preApproval = new PreApproval(client);

    console.log('Creando suscripción MP para usuario:', req.user.id, 'con back_url:', backUrl);

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

    console.log('Suscripción MP creada:', { id: result.id, status: result.status });

    // Guardar en BD
    try {
      const { error } = await supabase
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
          metadata: { plan }
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error al guardar suscripción en BD:', error);
      } else {
        console.log('Suscripción guardada en BD para usuario:', req.user.id);
      }
    } catch (dbError) {
      console.error('Error de BD al guardar suscripción:', dbError);
    }

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

// Webhook de Mercado Pago
router.post('/mp/webhook', async (req, res) => {
  try {
    const resourceId = req.query.id || req.query['data.id'] || req.body?.data?.id || req.body?.id;

    if (!resourceId) {
      console.log('Webhook recibido sin ID de recurso');
      return res.status(200).json({ received: true });
    }

    console.log('Procesando webhook MP para ID:', resourceId);

    const client = getMpClient();
    const preApproval = new PreApproval(client);

    let preapprovalData;
    try {
      preapprovalData = await preApproval.get({ id: String(resourceId) });
    } catch (e) {
      console.error('Error al obtener datos de suscripción de MP:', e);
      return res.status(200).json({ received: true });
    }

    const userId = preapprovalData.external_reference;
    const status = preapprovalData.status;
    const nextPayment = preapprovalData.auto_recurring?.next_payment_date || null;

    console.log('Actualizando suscripción:', { userId, status, nextPayment });

    if (userId) {
      // Actualizar tabla subscriptions
      try {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            mp_preapproval_id: preapprovalData.id,
            status,
            next_payment_date: nextPayment,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('Error al actualizar suscripción en BD:', error);
        } else {
          console.log('Suscripción actualizada en BD para usuario:', userId);
        }
      } catch (dbError) {
        console.error('Error de BD al actualizar suscripción:', dbError);
      }

      // Actualizar profiles
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error al actualizar perfil:', error);
        } else {
          console.log('Perfil actualizado para usuario:', userId);
        }
      } catch (profileError) {
        console.error('Error al actualizar perfil:', profileError);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook MP:', error);
    return res.status(200).json({ received: true });
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

    if (error || !subscription) {
      console.log('No se encontró suscripción para usuario:', req.user.id);
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

// Sincronizar suscripción con Mercado Pago
router.post('/subscription/sync', supabaseAuth, async (req, res) => {
  try {
    console.log('Sincronizando suscripción para usuario:', req.user.id);
    
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('mp_preapproval_id')
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !subscription || !subscription.mp_preapproval_id) {
      return res.status(404).json({ error: 'Suscripción no encontrada para sincronizar' });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Configuración faltante: MP_ACCESS_TOKEN no definido en el servidor' });
    }

    const client = getMpClient();
    const preApproval = new PreApproval(client);

    console.log('Consultando estado en MP para ID:', subscription.mp_preapproval_id);
    const preapprovalData = await preApproval.get({ id: String(subscription.mp_preapproval_id) });
    const status = preapprovalData.status;
    const nextPayment = preapprovalData.auto_recurring?.next_payment_date || null;

    console.log('Estado en MP:', { status, nextPayment });

    // Actualizar tabla subscriptions
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        next_payment_date: nextPayment,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id);

    if (updateError) {
      console.error('Error al actualizar suscripción en BD:', updateError);
      return res.status(500).json({ error: 'Error al actualizar la suscripción en la base de datos' });
    }

    // Actualizar profiles
    try {
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', req.user.id);
    } catch (profileError) {
      console.error('Error al actualizar perfil:', profileError);
    }

    console.log('Suscripción sincronizada exitosamente');
    return res.json({ ok: true, status, next_payment_date: nextPayment });
  } catch (error) {
    console.error('Error al sincronizar suscripción:', error);
    return res.status(500).json({ error: 'No se pudo sincronizar la suscripción' });
  }
});

// Cancelar suscripción
router.post('/subscription/cancel', supabaseAuth, async (req, res) => {
  try {
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
      body: { status: 'cancelled' }
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

// Endpoint de salud/diagnóstico
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

module.exports = router;



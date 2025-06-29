const express = require('express');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const { simpleAuth } = require('../middleware/auth');

const router = express.Router();

// Configurar transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para enviar email
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error al enviar email:', error);
    return false;
  }
};

// Crear notificación
router.post('/', simpleAuth, async (req, res) => {
  try {
    const { task_id, method, scheduled_at } = req.body;

    if (!task_id || !method || !scheduled_at) {
      return res.status(400).json({ 
        error: 'ID de tarea, método y fecha programada son requeridos' 
      });
    }

    if (!['email'].includes(method)) {
      return res.status(400).json({ error: 'Método debe ser email' });
    }

    // Verificar que la tarea pertenece al usuario
    const { data: task } = await supabase
      .from('plan_tasks')
      .select(`
        id,
        title,
        due_date,
        study_plans!inner (
          user_id,
          users (
            email,
            name
          )
        )
      `)
      .eq('id', task_id)
      .single();

    if (!task || task.study_plans.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: req.user.id,
        task_id,
        method,
        scheduled_at
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear notificación:', error);
      return res.status(500).json({ error: 'Error al crear la notificación' });
    }

    res.status(201).json({
      message: 'Notificación programada exitosamente',
      notification
    });

  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar notificaciones del usuario
router.get('/', simpleAuth, async (req, res) => {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        id,
        method,
        scheduled_at,
        sent,
        plan_tasks (
          id,
          title,
          due_date,
          completed
        )
      `)
      .eq('user_id', req.user.id)
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error al obtener notificaciones:', error);
      return res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }

    res.json({ notifications });

  } catch (error) {
    console.error('Error al listar notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar notificación inmediata (para pruebas)
router.post('/send/:notificationId', simpleAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Obtener notificación
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        id,
        method,
        plan_tasks (
          id,
          title,
          due_date,
          study_plans!inner (
            user_id,
            users (
              email,
              name
            )
          )
        )
      `)
      .eq('id', notificationId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const task = notification.plan_tasks;
    const user = task.study_plans.users;
    let sent = false;

    if (notification.method === 'email') {
      const subject = `Recordatorio de tarea: ${task.title}`;
      const html = `
        <h2>Recordatorio de P.I.E.P.</h2>
        <p>Hola ${user.name},</p>
        <p>Tienes una tarea pendiente:</p>
        <h3>${task.title}</h3>
        <p><strong>Fecha de vencimiento:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
        <p>¡No olvides completarla!</p>
        <br>
        <p>Saludos,<br>Equipo P.I.E.P.</p>
      `;

      sent = await sendEmail(user.email, subject, html);
    }

    // Actualizar estado de envío
    if (sent) {
      await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notificationId);
    }

    res.json({
      message: sent ? 'Notificación enviada exitosamente' : 'Error al enviar notificación',
      sent
    });

  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar notificación
router.delete('/:notificationId', simpleAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error al eliminar notificación:', error);
      return res.status(500).json({ error: 'Error al eliminar la notificación' });
    }

    res.json({ message: 'Notificación eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para verificar tareas vencidas y enviar notificaciones
router.post('/check-overdue', simpleAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Obtener tareas vencidas del usuario
    const { data: overdueTasks, error } = await supabase
      .from('plan_tasks')
      .select(`
        id,
        title,
        due_date,
        completed,
        study_plans!inner (
          user_id,
          notify_by_email,
          notify_by_whatsapp,
          users (
            email,
            name
          )
        )
      `)
      .eq('study_plans.user_id', req.user.id)
      .lt('due_date', today)
      .eq('completed', false);

    if (error) {
      console.error('Error al obtener tareas vencidas:', error);
      return res.status(500).json({ error: 'Error al verificar tareas vencidas' });
    }

    const notificationsSent = [];

    for (const task of overdueTasks) {
      const plan = task.study_plans;
      const user = plan.users;

      // Enviar notificación por email si está habilitado
      if (plan.notify_by_email) {
        const subject = `⚠️ Tarea vencida: ${task.title}`;
        const html = `
          <h2>Alerta de P.I.E.P.</h2>
          <p>Hola ${user.name},</p>
          <p>Tienes una tarea vencida:</p>
          <h3>${task.title}</h3>
          <p><strong>Fecha de vencimiento:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
          <p style="color: red;">Esta tarea está vencida. ¡Complétala lo antes posible!</p>
          <br>
          <p>Saludos,<br>Equipo P.I.E.P.</p>
        `;

        const emailSent = await sendEmail(user.email, subject, html);
        if (emailSent) {
          notificationsSent.push({
            taskId: task.id,
            method: 'email',
            sent: true
          });
        }
      }
    }

    res.json({
      message: 'Verificación de tareas vencidas completada',
      overdueTasksCount: overdueTasks.length,
      notificationsSent
    });

  } catch (error) {
    console.error('Error al verificar tareas vencidas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Configurar preferencias de notificación
router.put('/preferences', simpleAuth, async (req, res) => {
  try {
    const { notify_by_email, notify_by_whatsapp } = req.body;

    // Actualizar preferencias en todos los planes del usuario
    const { error } = await supabase
      .from('study_plans')
      .update({
        notify_by_email: notify_by_email || false,
        notify_by_whatsapp: notify_by_whatsapp || false
      })
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error al actualizar preferencias:', error);
      return res.status(500).json({ error: 'Error al actualizar las preferencias' });
    }

    res.json({
      message: 'Preferencias de notificación actualizadas exitosamente',
      preferences: {
        notify_by_email: notify_by_email || false,
        notify_by_whatsapp: notify_by_whatsapp || false
      }
    });

  } catch (error) {
    console.error('Error al actualizar preferencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 
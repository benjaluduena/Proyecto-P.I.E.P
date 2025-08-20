const Joi = require('joi');

// Middleware de validación genérico
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false, // Recopilar todos los errores
      stripUnknown: true // Eliminar campos no definidos en el schema
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errorMessage,
        fields: error.details.map(detail => detail.path.join('.'))
      });
    }
    
    next();
  };
};

// Esquemas de validación para autenticación
const authSchemas = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'string.pattern.base': 'El nombre solo puede contener letras y espacios',
        'any.required': 'El nombre es obligatorio'
      }),
    email: Joi.string()
      .email()
      .max(100)
      .required()
      .messages({
        'string.email': 'Debe ser un email válido',
        'string.max': 'El email no puede exceder 100 caracteres',
        'any.required': 'El email es obligatorio'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.max': 'La contraseña no puede exceder 128 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial',
        'any.required': 'La contraseña es obligatoria'
      }),
    role: Joi.string()
      .valid('estudiante', 'profesor', 'admin')
      .default('estudiante')
      .messages({
        'any.only': 'El rol debe ser estudiante, profesor o admin'
      }),
    education_level: Joi.string()
      .valid('primaria', 'secundaria', 'universitario', 'posgrado')
      .default('universitario')
      .messages({
        'any.only': 'El nivel educativo debe ser primaria, secundaria, universitario o posgrado'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Debe ser un email válido',
        'any.required': 'El email es obligatorio'
      }),
    password: Joi.string()
      .min(1)
      .required()
      .messages({
        'string.min': 'La contraseña es obligatoria',
        'any.required': 'La contraseña es obligatoria'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'string.pattern.base': 'El nombre solo puede contener letras y espacios'
      }),
    role: Joi.string()
      .valid('estudiante', 'profesor', 'admin')
      .messages({
        'any.only': 'El rol debe ser estudiante, profesor o admin'
      }),
    education_level: Joi.string()
      .valid('primaria', 'secundaria', 'universitario', 'posgrado')
      .messages({
        'any.only': 'El nivel educativo debe ser primaria, secundaria, universitario o posgrado'
      })
  })
};

// Esquemas de validación para IA
const aiSchemas = {
  generateContent: Joi.object({
    type: Joi.string()
      .valid('resumen', 'recomendacion_video', 'recomendacion_texto', 'multiple_choice', 'verdadero_falso', 'flashcards', 'problema', 'mapa_mental', 'mapa-mental')
      .required()
      .messages({
        'any.only': 'Tipo de contenido inválido',
        'any.required': 'El tipo de contenido es obligatorio'
      })
  })
};

// Esquemas de validación para pagos
const paymentSchemas = {
  createSubscription: Joi.object({
    reason: Joi.string()
      .max(200)
      .default('Suscripción mensual P.I.E.P.')
      .messages({
        'string.max': 'La razón no puede exceder 200 caracteres'
      }),
    amount: Joi.number()
      .positive()
      .min(1)
      .max(1000000)
      .default(100)
      .messages({
        'number.positive': 'El monto debe ser positivo',
        'number.min': 'El monto mínimo es 1',
        'number.max': 'El monto máximo es 1,000,000'
      }),
    currency: Joi.string()
      .valid('ARS', 'USD', 'EUR')
      .default('ARS')
      .messages({
        'any.only': 'La moneda debe ser ARS, USD o EUR'
      }),
    frequency: Joi.number()
      .integer()
      .min(1)
      .max(12)
      .default(1)
      .messages({
        'number.integer': 'La frecuencia debe ser un número entero',
        'number.min': 'La frecuencia mínima es 1',
        'number.max': 'La frecuencia máxima es 12'
      }),
    frequencyType: Joi.string()
      .valid('days', 'months')
      .default('months')
      .messages({
        'any.only': 'El tipo de frecuencia debe ser days o months'
      }),
    plan: Joi.string()
      .valid('estudiante', 'premium', 'pro')
      .default('estudiante')
      .messages({
        'any.only': 'El plan debe ser estudiante, premium o pro'
      }),
    backUrl: Joi.string()
      .uri()
      .messages({
        'string.uri': 'La URL de retorno debe ser válida'
      })
  })
};

// Esquemas de validación para tareas y planes
const taskSchemas = {
  createTask: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.min': 'El título es obligatorio',
        'string.max': 'El título no puede exceder 200 caracteres',
        'any.required': 'El título es obligatorio'
      }),
    description: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'La descripción no puede exceder 1000 caracteres'
      }),
    due_date: Joi.date()
      .iso()
      .min('now')
      .required()
      .messages({
        'date.iso': 'La fecha debe estar en formato ISO',
        'date.min': 'La fecha debe ser futura',
        'any.required': 'La fecha de vencimiento es obligatoria'
      }),
    plan_id: Joi.string()
      .uuid()
      .messages({
        'string.uuid': 'El ID del plan debe ser un UUID válido'
      }),
    completed: Joi.boolean()
      .default(false),
    reminder_email: Joi.boolean()
      .default(false),
    reminder_whatsapp: Joi.boolean()
      .default(false),
    reminder_datetime: Joi.date()
      .iso()
      .when(Joi.alternatives().try(
        Joi.ref('reminder_email', { adjust: (value) => value === true }),
        Joi.ref('reminder_whatsapp', { adjust: (value) => value === true })
      ), {
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'date.iso': 'La fecha de recordatorio debe estar en formato ISO',
        'any.required': 'La fecha de recordatorio es obligatoria si se habilitan recordatorios'
      })
  }),

  updateTask: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .messages({
        'string.min': 'El título no puede estar vacío',
        'string.max': 'El título no puede exceder 200 caracteres'
      }),
    description: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'La descripción no puede exceder 1000 caracteres'
      }),
    due_date: Joi.date()
      .iso()
      .messages({
        'date.iso': 'La fecha debe estar en formato ISO'
      }),
    plan_id: Joi.string()
      .uuid()
      .allow(null)
      .messages({
        'string.uuid': 'El ID del plan debe ser un UUID válido'
      }),
    completed: Joi.boolean(),
    reminder_email: Joi.boolean(),
    reminder_whatsapp: Joi.boolean(),
    reminder_datetime: Joi.date()
      .iso()
      .allow(null)
      .messages({
        'date.iso': 'La fecha de recordatorio debe estar en formato ISO'
      })
  })
};

// Validación de parámetros UUID
const uuidParam = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'El ID debe ser un UUID válido',
      'any.required': 'El ID es obligatorio'
    })
});

// Validación de parámetros de PDF ID (enteros)
const pdfIdParam = Joi.object({
  pdfId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'El PDF ID debe ser un número',
      'number.integer': 'El PDF ID debe ser un número entero',
      'number.positive': 'El PDF ID debe ser un número positivo',
      'any.required': 'El PDF ID es obligatorio'
    })
});

module.exports = {
  validate,
  authSchemas,
  aiSchemas,
  paymentSchemas,
  taskSchemas,
  uuidParam,
  pdfIdParam
};
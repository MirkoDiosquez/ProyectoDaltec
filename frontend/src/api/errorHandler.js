/**
 * errorHandler.js — API error handler utility (T138)
 * 
 * Normalizes error messages from API responses and provides toast notifications.
 */

/**
 * Normalize API error response to user-friendly message
 */
export function normalizeApiError(error) {
  // Network error
  if (!error.response) {
    return {
      title: 'Error de Conexión',
      message: 'No se pudo conectar al servidor. Verifica tu conexión a internet.',
      statusCode: null,
      type: 'network',
    };
  }

  const { status, data } = error.response;

  // Unauthorized
  if (status === 401) {
    return {
      title: 'No Autorizado',
      message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
      statusCode: 401,
      type: 'auth',
    };
  }

  // Forbidden
  if (status === 403) {
    return {
      title: 'Acceso Denegado',
      message: 'No tienes permiso para realizar esta acción.',
      statusCode: 403,
      type: 'permission',
    };
  }

  // Not found
  if (status === 404) {
    return {
      title: 'No Encontrado',
      message: 'El recurso que buscas no existe.',
      statusCode: 404,
      type: 'notfound',
    };
  }

  // Validation error
  if (status === 400) {
    // Try to extract field-specific errors
    if (typeof data === 'object' && data !== null) {
      const messages = [];
      
      Object.entries(data).forEach(([field, errors]) => {
        if (Array.isArray(errors)) {
          errors.forEach((err) => {
            messages.push(`${field}: ${err}`);
          });
        } else if (typeof errors === 'string') {
          messages.push(`${field}: ${errors}`);
        }
      });

      if (messages.length > 0) {
        return {
          title: 'Datos Inválidos',
          message: messages.join('\n'),
          statusCode: 400,
          type: 'validation',
        };
      }
    }
    
    return {
      title: 'Datos Inválidos',
      message: 'Verifica que todos los campos estén completos y correctos.',
      statusCode: 400,
      type: 'validation',
    };
  }

  // Server error
  if (status >= 500) {
    return {
      title: 'Error del Servidor',
      message: 'El servidor encontró un error. Por favor, intenta más tarde.',
      statusCode: status,
      type: 'server',
    };
  }

  // Default error
  return {
    title: 'Error',
    message: data?.detail || data?.message || 'Algo salió mal. Por favor, intenta nuevamente.',
    statusCode: status,
    type: 'unknown',
  };
}

/**
 * Show error toast notification (requires toast provider in app)
 */
export function showErrorToast(error, toastFn) {
  if (!toastFn) {
    console.error('Toast function not provided');
    return;
  }

  const normalized = normalizeApiError(error);
  
  toastFn({
    title: normalized.title,
    message: normalized.message,
    type: 'error',
    duration: 5000,
  });
}

/**
 * Log error for debugging
 */
export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    message: error?.message,
    statusCode: error?.response?.status,
    data: error?.response?.data,
    url: error?.config?.url,
    method: error?.config?.method,
  };

  console.error('API Error:', errorInfo);

  // In production, could send to error tracking service (Sentry, etc)
  if (process.env.NODE_ENV === 'production') {
    // window.Sentry?.captureException(error, { extra: errorInfo });
  }
}

/**
 * Default error handler for API calls
 * Combines normalization, logging, and toast notification
 */
export function handleApiError(error, context = '', toastFn = null) {
  logError(error, context);
  
  if (toastFn) {
    showErrorToast(error, toastFn);
  }

  // Return normalized error for component handling
  return normalizeApiError(error);
}

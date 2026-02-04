import { FormGroup } from '@angular/forms';

export interface BackendFieldError {
  field?: string;
  defaultMessage?: string;
  message?: string;
}

export interface BackendErrorPayload {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | string>;
  errors?: BackendFieldError[];
}

export function mapBackendErrorsToForm(
  form: FormGroup,
  rawError: unknown
): string | null {
  const payload = extractPayload(rawError);
  if (!payload) {
    return null;
  }

  let message: string | null = null;

  if (payload.fieldErrors) {
    Object.entries(payload.fieldErrors).forEach(([field, messages]) => {
      const control = form.get(field);
      if (!control) {
        return;
      }
      const errorMessage = Array.isArray(messages) ? messages[0] : messages;
      if (errorMessage) {
        control.setErrors({ backend: errorMessage });
      }
    });
  }

  if (Array.isArray(payload.errors)) {
    payload.errors.forEach((err) => {
      if (!err.field) {
        return;
      }
      const control = form.get(err.field);
      if (!control) {
        return;
      }
      const errorMessage = err.defaultMessage || err.message;
      if (errorMessage) {
        control.setErrors({ backend: errorMessage });
      }
    });
  }

  if (payload.message) {
    message = payload.message;
  } else if (payload.error) {
    message = payload.error;
  }

  return message;
}

function extractPayload(rawError: unknown): BackendErrorPayload | null {
  if (!rawError || typeof rawError !== 'object') {
    return null;
  }

  const errorWithPayload = rawError as { error?: BackendErrorPayload };
  if (errorWithPayload.error && typeof errorWithPayload.error === 'object') {
    return errorWithPayload.error;
  }

  return rawError as BackendErrorPayload;
}

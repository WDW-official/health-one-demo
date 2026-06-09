export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const err = error as any;

    if (err.code === 11000) {
      const fields = Object.keys(err.keyPattern || err.keyValue || {});
      return fields.length > 0
        ? `A record with this ${fields.join(', ')} already exists.`
        : 'A record with these unique details already exists.';
    }

    if (err.name === 'ValidationError' && err.errors) {
      const messages = Object.values(err.errors)
        .map((value: any) => value?.message)
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    if (err.name === 'CastError' && err.path) {
      return `Invalid value for ${err.path}.`;
    }

    if (typeof err.message === 'string' && err.message.trim()) {
      return err.message;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

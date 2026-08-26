export function getErrorMessage(err: any, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const data = err.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.error?.message === 'string') return data.error.message;
    if (typeof data.message === 'string') return data.message;
  }

  if (typeof err.message === 'string') return err.message;
  return fallback;
}

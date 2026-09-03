export class ProxyError extends Error {
  override name = 'ProxyError';
}

export class StorageError extends Error {
  override name = 'StorageError';
}

export class BackendError extends Error {
  override name = 'BackendError';
}

export class ValidationError extends Error {
  override name = 'ValidationError';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请重试';
}

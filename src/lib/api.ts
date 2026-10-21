export interface ApiErrorShape {
  error: string
  code?: string
  details?: Array<{ path: string; message: string }>
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: Array<{ path: string; message: string }>
  constructor(message: string, status = 0, code?: string, details?: Array<{ path: string; message: string }>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('x-requested-with', 'leaf')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new ApiError('Cannot reach the LEAF server. Check your connection and try again.', 0, 'NETWORK')
  }
  if (response.status === 204) return undefined as T
  const type = response.headers.get('content-type') || ''
  let payload: unknown = null
  if (type.includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  } else {
    payload = await response.text()
  }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      window.dispatchEvent(new CustomEvent('leaf:unauthorized'))
    }
    const shape = (payload || {}) as ApiErrorShape
    throw new ApiError(
      shape.error || (typeof payload === 'string' && payload) || 'Something went wrong. Please try again.',
      response.status,
      shape.code,
      shape.details,
    )
  }
  return payload as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = void>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }),
  upload: <T>(path: string, file: File) => {
    const data = new FormData()
    data.append('photo', file)
    return request<T>(path, { method: 'POST', body: data })
  },
}

async function responseBlob(path: string): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      credentials: 'include',
      headers: { 'x-requested-with': 'leaf' },
    })
  } catch {
    throw new ApiError('Cannot reach the LEAF server.', 0, 'NETWORK')
  }
  if (!response.ok) {
    let payload: ApiErrorShape = { error: 'Could not create the file.' }
    try {
      payload = (await response.json()) as ApiErrorShape
    } catch {
      /* non-json */
    }
    throw new ApiError(payload.error || 'Could not create the file.', response.status, payload.code)
  }
  return response.blob()
}

export async function downloadPdf(path: string, filename: string): Promise<void> {
  const blob = await responseBlob(path)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function pdfBlobUrl(path: string): Promise<string> {
  const blob = await responseBlob(path)
  return URL.createObjectURL(blob)
}

export function apiBase() {
  return API_BASE
}

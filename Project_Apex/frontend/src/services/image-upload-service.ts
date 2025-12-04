import { OpenAPI } from '@/api/core/OpenAPI'
import { getAccessToken } from '@/api/client-config'

const buildUrl = (path: string) => {
  const base = OpenAPI.BASE || ''
  return `${base}${path}`
}

export type UploadResult<T = unknown> = {
  ok: boolean
  status: number
  data?: T
  error?: string
}

export async function uploadUserProfilePicture(file: Blob): Promise<UploadResult<Record<string, unknown>>> {
  const url = buildUrl('/api/v1/users/profile-picture')
  const token = getAccessToken()
  const fd = new FormData()
  fd.append('file', file, 'avatar.webp')

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : undefined

  if (!res.ok) {
    const error = (data?.detail as string) || res.statusText
    return { ok: false, status: res.status, error }
  }
  return { ok: true, status: res.status, data }
}

export async function uploadTraderAvatar(traderId: string, file: Blob): Promise<UploadResult<Record<string, unknown>>> {
  const url = buildUrl(`/api/v1/traders/${encodeURIComponent(traderId)}/avatar`)
  const token = getAccessToken()
  const fd = new FormData()
  fd.append('file', file, 'trader-avatar.webp')

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await res.json() : undefined

  if (!res.ok) {
    const error = (data?.detail as string) || res.statusText
    return { ok: false, status: res.status, error }
  }
  return { ok: true, status: res.status, data }
}

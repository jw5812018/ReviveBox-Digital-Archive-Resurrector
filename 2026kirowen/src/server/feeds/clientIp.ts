import { isIP } from 'node:net'

/**
 * 计算限频使用的客户端 IP（Requirement 9 AC12）。
 *
 * - headerName 为空：返回 req.ip（由 TRUST_PROXY_HOPS 决定），行为不变。
 * - headerName 已配置：只接受该请求头中单个合法的 IPv4/IPv6 值；
 *   缺失、多个值、逗号列表或非法值一律回退到 req.ip。
 * 任何情况下都返回一个非空 key，请求不会绕过限频。
 */
export function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  fallbackIp: string | undefined,
  headerName: string | undefined,
): string {
  const fallback = fallbackIp != null && fallbackIp.length > 0 ? fallbackIp : 'unknown'
  const name = headerName?.trim().toLowerCase() ?? ''
  if (name.length === 0) return fallback

  const raw = headers[name]
  if (typeof raw !== 'string') return fallback
  const value = raw.trim()
  if (value.includes(',') || isIP(value) === 0) return fallback
  return value.toLowerCase()
}

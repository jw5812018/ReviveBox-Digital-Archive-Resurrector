import { describe, expect, it } from 'vitest'
import { resolveClientIp } from '@server/feeds/clientIp'

const PROXY_IP = '10.0.0.7'

describe('resolveClientIp', () => {
  it('uses req.ip when no header is configured', () => {
    const headers = { 'x-real-ip': '203.0.113.9' }
    expect(resolveClientIp(headers, PROXY_IP, undefined)).toBe(PROXY_IP)
    expect(resolveClientIp(headers, PROXY_IP, '  ')).toBe(PROXY_IP)
  })

  it('reads a valid IPv4 value; the header name is case-insensitive', () => {
    const headers = { 'x-real-ip': ' 203.0.113.9 ' }
    expect(resolveClientIp(headers, PROXY_IP, 'X-Real-IP')).toBe('203.0.113.9')
  })

  it('reads a valid IPv6 value', () => {
    const headers = { 'x-real-ip': '2001:DB8::1' }
    expect(resolveClientIp(headers, PROXY_IP, 'x-real-ip')).toBe('2001:db8::1')
  })

  it('falls back to req.ip when the header is missing', () => {
    expect(resolveClientIp({}, PROXY_IP, 'x-real-ip')).toBe(PROXY_IP)
  })

  it('falls back to req.ip for invalid values', () => {
    for (const value of ['', 'not-an-ip', '999.1.1.1', '203.0.113.9:443', 'unknown']) {
      expect(resolveClientIp({ 'x-real-ip': value }, PROXY_IP, 'x-real-ip')).toBe(PROXY_IP)
    }
  })

  it('falls back to req.ip for comma-separated lists', () => {
    const headers = { 'x-real-ip': '203.0.113.9, 198.51.100.4' }
    expect(resolveClientIp(headers, PROXY_IP, 'x-real-ip')).toBe(PROXY_IP)
  })

  it('falls back to req.ip for array values', () => {
    const headers = { 'x-real-ip': ['203.0.113.9', '198.51.100.4'] }
    expect(resolveClientIp(headers, PROXY_IP, 'x-real-ip')).toBe(PROXY_IP)
  })

  it('always returns a non-empty key, even without req.ip', () => {
    expect(resolveClientIp({}, undefined, 'x-real-ip')).toBe('unknown')
    expect(resolveClientIp({}, '', undefined)).toBe('unknown')
  })
})

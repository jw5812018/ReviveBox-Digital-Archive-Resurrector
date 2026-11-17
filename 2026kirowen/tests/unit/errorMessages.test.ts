import { describe, expect, it } from 'vitest'
import { describeImportError } from '@shared/import/errorMessages'
import { planImport } from '@shared/import/pipeline'
import { ImportErrorType } from '@shared/models/types'

describe('describeImportError', () => {
  it('has a readable message for every error type that does not expose the code', () => {
    for (const type of Object.values(ImportErrorType)) {
      const message = describeImportError(type)
      expect(message.length).toBeGreaterThan(10)
      expect(message).not.toContain(type)
    }
  })

  it('names the rejected link type', () => {
    expect(describeImportError(ImportErrorType.InvalidUrlProtocol, 'javascript:alert(1)')).toBe(
      'Only http and https links can be imported (this one uses javascript:).',
    )
  })

  it('is what the import preview shows for invalid records', async () => {
    const result = await planImport(
      'x.html',
      '<DL><p><DT><A HREF="javascript:alert(1)">Evil</A></DL><p>',
      [],
      [],
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const detail = result.plan.summary.details[0]
    expect(detail.errorType).toBe(ImportErrorType.InvalidUrlProtocol)
    expect(detail.message).toBe('Only http and https links can be imported (this one uses javascript:).')
  })
})
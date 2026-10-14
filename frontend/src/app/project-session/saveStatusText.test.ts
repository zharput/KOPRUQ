import { describe, expect, it } from 'vitest'
import { ApiError } from '../../shared/api/http'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import { describeSaveProblem } from './saveStatusText'

const snapshot = (patch: Partial<ProjectSessionSnapshot>): ProjectSessionSnapshot => ({
  epoch: 1, projectId: 'p1', revision: 1, status: 'idle', pendingCount: 0, failedKey: null, lastError: null, ...patch,
})

describe('describeSaveProblem', () => {
  it('has nothing to say while idle or saving', () => {
    expect(describeSaveProblem(snapshot({ status: 'idle' }))).toBeNull()
    expect(describeSaveProblem(snapshot({ status: 'saving' }))).toBeNull()
  })

  it('describes a save error with its section and retry/discard actions', () => {
    const problem = describeSaveProblem(snapshot({ status: 'error', failedKey: 'loads/wind', lastError: new ApiError({ status: 500, message: 'Server down' }) }))
    expect(problem).toEqual({ title: 'Kayıt hatası: Server down', details: ['Bölüm: loads/wind'], actions: 'retry-discard' })
  })

  it('lists the first three field errors of a rejection and counts the rest', () => {
    const fieldErrors = [1, 2, 3, 4, 5].map((n) => ({ field: `f${n}`, message: `m${n}` }))
    const problem = describeSaveProblem(snapshot({ status: 'rejected', failedKey: 'workspace', lastError: new ApiError({ status: 422, message: 'Invalid', fieldErrors }) }))
    expect(problem?.title).toBe('Kayıt reddedildi')
    expect(problem?.details).toEqual(['f1: m1', 'f2: m2', 'f3: m3', '+2 hata daha', 'Bölüm: workspace'])
    expect(problem?.actions).toBe('retry-discard')
  })

  it('falls back to the error text of a rejection without field errors', () => {
    const problem = describeSaveProblem(snapshot({ status: 'rejected', lastError: new Error('cannot send') }))
    expect(problem?.details).toEqual(['cannot send'])
  })

  it('offers reload for a conflict', () => {
    const problem = describeSaveProblem(snapshot({ status: 'conflict', lastError: new ApiError({ status: 409, message: 'conflict' }) }))
    expect(problem).toEqual({ title: 'Çakışma: proje başka bir yerde değiştirildi.', details: ['Yeniden yüklemek bekleyen değişiklikleri atar.'], actions: 'reload' })
  })
})

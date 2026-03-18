import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, expect } from 'vitest'
import ExportHistory from '../../pages/dashboard/ExportHistory'
import exportService from '@/api/services/exportService'

global.expect = expect

vi.mock('@/api/services/exportService', () => ({
  default: {
    listRuns: vi.fn(),
    getRun: vi.fn()
  }
}))

describe('ExportHistory page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders list and allows viewing details', async () => {
    const fakeRuns = [
      { runId: 'r1', createdAt: '2026-01-01T00:00:00Z', sourceType: 'universal', status: 'done', counts: { a:1 }, logs: [] }
    ]
    exportService.listRuns.mockResolvedValue(fakeRuns)
    exportService.getRun.mockResolvedValue({ ...fakeRuns[0], logs:[{ts:'2026-01-01T00:00:00Z',level:'info',message:'ok'}] })

    render(<ExportHistory />)
    expect(await screen.findByText('r1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('r1'))
    expect(await screen.findByText('Detalle')).toBeInTheDocument()
  })
})
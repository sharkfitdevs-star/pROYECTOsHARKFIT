import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardEVO from '../DashboardEVO';

// Mock the frontend API client used by DashboardEVO
vi.mock('../../api/axios', () => {
  return {
    default: {
      get: vi.fn().mockResolvedValue({
        data: {
          total_sales: 2,
          total_prospects: 1,
          total_entries: 3,
          total_revenue: 1000,
          avg_sale_amount: 500,
          recent_sales: [{ evo_sale_id: 'S1', amount: 500, sale_date: new Date().toISOString(), status: 'won' }],
          recent_prospects: [{ id: 'P1', name: 'Prospecto X', email: 'x@ex.com', registration_date: new Date().toISOString() }],
          recent_entries: [{ id: 'E1', access_time: new Date().toISOString(), location: 'central', member_id: 'M1' }],
          source: 'extractor',
          last_sync: new Date().toISOString()
        }
      })
    }
  };
});

describe('DashboardEVO (integration) — extractor → UI render', () => {
  test('renders extractor-provided stats and recent sales', async () => {
    render(<DashboardEVO />);

    // Wait for async fetch to complete and UI to update
    await waitFor(() => expect(screen.getByText(/Fuente:/i)).toBeInTheDocument());

    // Source must show "extractor"
    expect(screen.getByText(/Fuente: extractor/i)).toBeInTheDocument();

    // Verify totals and recent sale rendered (sales stat card)
    const salesCard = screen.getByText('Ventas').closest('.stat-card.sales')
    expect(within(salesCard).getByText('2')).toBeInTheDocument()

    // Recent sale id displayed in table
    expect(await screen.findByText('S1')).toBeInTheDocument();
  });
});
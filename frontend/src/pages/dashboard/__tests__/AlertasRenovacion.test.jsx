import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, expect } from 'vitest';
import AlertasRenovacionPage from '../AlertasRenovacion';
import api from '@/api/axios';

// mock axios
vi.mock('@/api/axios', () => ({
  get: vi.fn()
}));

describe('AlertasRenovacionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fetches alerts with exportOnly flag on load', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    render(<AlertasRenovacionPage />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/alertas', { params: { exportOnly: true } });
  });
});

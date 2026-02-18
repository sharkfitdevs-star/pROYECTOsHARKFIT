import { describe, it, expect, vi } from 'vitest';
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import Login from '../Login'

// Mock the usuarios service used by the Login component
vi.mock('../../../api/services/usuariosService', () => ({
  default: {
    requestAccess: vi.fn()
  }
}))

import usuariosService from '../../../api/services/usuariosService'

// Mock the auth context used by Login so tests don't need AuthProvider
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), register: vi.fn(), error: null })
}))

describe('Login — Request access flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('shows success message after sending request access', async () => {
    usuariosService.requestAccess.mockResolvedValue({ success: true })

    render(<MemoryRouter><Login /></MemoryRouter>)

    // Open request form and wait for it to render
    fireEvent.click(screen.getByText('Solicitar acceso'))
    await screen.findByText('Enviar solicitud')

    // Fill required fields (labels are not associated to inputs in markup)
    const firstNameInput = document.querySelector('input[name="firstName"]')
    const lastNameInput = document.querySelector('input[name="lastName"]')
    const emailInput = document.querySelector('input[name="email"]')

    fireEvent.change(firstNameInput, { target: { value: 'Ana' } })
    fireEvent.change(lastNameInput, { target: { value: 'Pérez' } })
    fireEvent.change(emailInput, { target: { value: 'ana@example.com' } })

    // Submit
    fireEvent.click(screen.getByText('Enviar solicitud'))

    // The component closes the request form on success — wait for API call and assert form closed
    await waitFor(() => expect(usuariosService.requestAccess).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' })
    ))

    expect(screen.queryByText('Enviar solicitud')).not.toBeInTheDocument()
    expect(screen.getByText('Solicitar acceso')).toBeInTheDocument()
  })

  test('shows validation error when required fields are missing', async () => {
    render(<MemoryRouter><Login /></MemoryRouter>)

    fireEvent.click(screen.getByText('Solicitar acceso'))
    fireEvent.click(screen.getByText('Enviar solicitud'))

    expect(await screen.findByText(/Nombre, apellido y email son requeridos/i)).toBeInTheDocument()
    expect(usuariosService.requestAccess).not.toHaveBeenCalled()
  })

  test('displays server error message when API fails', async () => {
    usuariosService.requestAccess.mockRejectedValue({ response: { data: { message: 'Error enviando solicitud' } } })

    render(<MemoryRouter><Login /></MemoryRouter>)

    fireEvent.click(screen.getByText('Solicitar acceso'))
    await screen.findByText('Enviar solicitud')

    const firstNameInput = document.querySelector('input[name="firstName"]')
    const lastNameInput = document.querySelector('input[name="lastName"]')
    const emailInput = document.querySelector('input[name="email"]')

    fireEvent.change(firstNameInput, { target: { value: 'Ana' } })
    fireEvent.change(lastNameInput, { target: { value: 'Pérez' } })
    fireEvent.change(emailInput, { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByText('Enviar solicitud'))

    expect(await screen.findByText(/Error enviando solicitud/i)).toBeInTheDocument()
    expect(usuariosService.requestAccess).toHaveBeenCalled()
  })
})
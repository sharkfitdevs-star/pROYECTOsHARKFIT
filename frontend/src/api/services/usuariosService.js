/**
 * Service: Autenticación de Usuarios
 * Login, logout, perfil, etc
 */

import client from '../client'
import { API_ENDPOINTS } from '../endpoints'
import { setAccessToken, clearAccessToken, refreshAccessToken } from '../axios'

class UsuariosService {
  /**
   * Login con email y password
   */
  async login(identifier, password) {
    try {
      const isEmail = identifier.includes('@')
      const payload = isEmail
        ? { email: identifier, password }
        : { username: identifier, password }

      const response = await client.post(API_ENDPOINTS.AUTH.LOGIN, payload)

      if (response.data.accessToken) {
        setAccessToken(response.data.accessToken)
      }

      return response.data
    } catch (error) {
      console.error('Error en login:', error)
      throw error
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await client.post(API_ENDPOINTS.AUTH.LOGOUT)
      clearAccessToken()
    } catch (error) {
      console.error('Error en logout:', error)
      // Limpiar aunque falle la petición
      clearAccessToken()
      throw error
    }
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser() {
    try {
      const response = await client.get(API_ENDPOINTS.AUTH.ME)
      return response.data
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error)
      throw error
    }
  }

  /**
   * Obtener perfil del usuario logueado
   */
  async getProfile() {
    try {
      const response = await client.get(API_ENDPOINTS.AUTH.ME)
      return response.data
    } catch (error) {
      console.error('Error obteniendo perfil:', error)
      throw error
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(data) {
    try {
      if (!data?.id) {
        throw new Error('Se requiere id de usuario')
      }

      const response = await client.put(API_ENDPOINTS.USUARIOS.UPDATE(data.id), data)
      return response.data
    } catch (error) {
      console.error('Error actualizando perfil:', error)
      throw error
    }
  }

  /**
   * Cambiar contraseña
   */
  async cambiarPassword(passwordActual, passwordNueva) {
    try {
      const response = await client.post('/auth/change-password', {
        currentPassword: passwordActual,
        newPassword: passwordNueva,
      })
      return response.data
    } catch (error) {
      console.error('Error cambiando contraseña:', error)
      throw error
    }
  }

  /**
   * Refresh token
   */
  async refreshToken() {
    try {
      const token = await refreshAccessToken()
      return { accessToken: token }
    } catch (error) {
      console.error('Error refrescando token:', error)
      throw error
    }
  }
}

// Exportar instancia singleton
export default new UsuariosService()

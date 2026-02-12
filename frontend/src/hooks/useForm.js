/**
 * Hook: useForm
 * Hook genérico para manejo de formularios
 * Maneja valores, errores, y submit
 */

import { useState, useCallback } from 'react'

export function useForm(initialValues = {}, onSubmit) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Manejar cambios en inputs
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }, [])

  /**
   * Manejar blur (marcar como tocado)
   */
  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }))
  }, [])

  /**
   * Manejar submit del formulario
   */
  const handleSubmit = useCallback(
    async (e) => {
      if (e.preventDefault) {
        e.preventDefault()
      }

      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } catch (err) {
        if (err.response?.data?.errors) {
          setErrors(err.response.data.errors)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, onSubmit]
  )

  /**
   * Resetear formulario
   */
  const resetForm = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  /**
   * Establecer valores manualmente
   */
  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }))
  }, [])

  /**
   * Establecer errores manualmente
   */
  const setFieldError = useCallback((name, error) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }))
  }, [])

  return {
    // Estado
    values,
    errors,
    touched,
    isSubmitting,
    // Métodos
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
  }
}

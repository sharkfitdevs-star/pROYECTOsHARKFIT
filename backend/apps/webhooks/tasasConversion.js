import { obtenerTasasConversion } from '../utils/apiTasasConversion.js';

/**
 * API Endpoint: Tasas de Conversión
 * 
 * GET /api/tasasConversion
 * 
 * Query Parameters:
 * - fecha_inicio (required): Fecha inicial en formato YYYY-MM-DD
 * - fecha_fin (required): Fecha final en formato YYYY-MM-DD
 * - sede (optional): Nombre de la sede para filtrar
 * 
 * Headers:
 * - x-api-key: API key para autenticación (opcional pero recomendado)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "tasas": { ... },
 *     "contadores": {...},
 *     "filtros": {...}
 *   }
 * }
 */
export default async function(ctx) {
  const { query, request } = ctx;
  
  // Configuración de CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://smart-light-bloom.agentui.app',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
  };

  // Manejar preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    // Validar parámetros requeridos
    if (!query.fecha_inicio || !query.fecha_fin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Parámetros requeridos: fecha_inicio y fecha_fin',
        ejemplo: '/api/tasasConversion?fecha_inicio=2024-01-01&fecha_fin=2024-12-31&sede=El%20Bosque'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Validar formato de fechas
    const fechaInicioRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaInicioRegex.test(query.fecha_inicio) || !fechaInicioRegex.test(query.fecha_fin)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Formato de fecha inválido. Use YYYY-MM-DD',
        ejemplo: 'fecha_inicio=2024-01-01&fecha_fin=2024-12-31'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Obtener tasas usando la utilidad
    const resultado = await obtenerTasasConversion({
      fecha_inicio: query.fecha_inicio,
      fecha_fin: query.fecha_fin,
      sede: query.sede || undefined
    });

    // Retornar respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      data: resultado,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error en /api/tasasConversion:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Error al obtener tasas de conversión',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
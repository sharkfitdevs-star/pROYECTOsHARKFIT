#!/usr/bin/env pwsh

# 🎯 PROTOTIPO GESTIONADOR DE VENTAS - QUICK START (Windows)
# Stage 4 Completado - Sistema 100% Implementado

Write-Host @"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚀 PROTOTIPO GESTIONADOR DE VENTAS - STAGE 4 COMPLETADO 🚀           ║
║                                                               ║
║     Tu sistema está listo para ser activado                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"@

Write-Host "📋 INSTRUCCIONES DE ACTIVACIÓN" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ PASO 1: Django Backend (Puerto 8000)" -ForegroundColor Green
Write-Host "─────────────────────────────────────" -ForegroundColor Green
Write-Host "cd backend" -ForegroundColor Yellow
Write-Host "pip install -r requirements.txt" -ForegroundColor Yellow
Write-Host "python manage.py makemigrations" -ForegroundColor Yellow
Write-Host "python manage.py migrate" -ForegroundColor Yellow
Write-Host "python seed_data.py" -ForegroundColor Yellow
Write-Host "python manage.py runserver" -ForegroundColor Yellow
Write-Host ""
Write-Host "📍 Resultado: http://localhost:8000" -ForegroundColor Magenta
Write-Host "👤 Admin: admin / admin123" -ForegroundColor Magenta
Write-Host ""

Write-Host "✅ PASO 2: Frontend React (Puerto 5173)" -ForegroundColor Green
Write-Host "─────────────────────────────────────" -ForegroundColor Green
Write-Host "cd ../frontend" -ForegroundColor Yellow
Write-Host "npm install" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "📍 Resultado: http://localhost:5173" -ForegroundColor Magenta
Write-Host ""

Write-Host "✅ PASO 3: Data Intake Service (Puerto 3001)" -ForegroundColor Green
Write-Host "─────────────────────────────────────" -ForegroundColor Green
Write-Host "cd ../backend-data-intake" -ForegroundColor Yellow
Write-Host "npm install" -ForegroundColor Yellow
Write-Host "cp .env.example .env          # Editar .env con credenciales" -ForegroundColor Yellow
Write-Host "npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "📍 Resultado: http://localhost:3001" -ForegroundColor Magenta
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📚 DOCUMENTACIÓN DISPONIBLE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 docs/documentado/GUIA_ACTIVACION_COMPLETA.md" -ForegroundColor Magenta
Write-Host "   → Pasos detallados para activar TODO el sistema" -ForegroundColor Gray
Write-Host "   → Comandos exactos a ejecutar" -ForegroundColor Gray
Write-Host "   → Validaciones y troubleshooting" -ForegroundColor Gray
Write-Host ""

Write-Host "📄 docs/documentado/RESUMEN_STAGE_4.md" -ForegroundColor Magenta
Write-Host "   → Resumen visual de lo completado" -ForegroundColor Gray
Write-Host "   → Checklist de implementación" -ForegroundColor Gray
Write-Host "   → Estadísticas finales" -ForegroundColor Gray
Write-Host ""

Write-Host "📄 docs/documentado/STAGE_4_COMPLETADO.md" -ForegroundColor Magenta
Write-Host "   → Documentación técnica detallada" -ForegroundColor Gray
Write-Host "   → Arquitectura completa" -ForegroundColor Gray
Write-Host "   → Flujos de sincronización" -ForegroundColor Gray
Write-Host ""

Write-Host "📄 docs/documentado/API_DOCUMENTACION_COMPLETA.md" -ForegroundColor Magenta
Write-Host "   → Todos los endpoints (60+)" -ForegroundColor Gray
Write-Host "   → Ejemplos curl" -ForegroundColor Gray
Write-Host "   → Parámetros y respuestas" -ForegroundColor Gray
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "🎯 ACTIVIDAD RECOMENDADA AHORA:" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Lee: docs/documentado/GUIA_ACTIVACION_COMPLETA.md" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Ejecuta los 3 pasos en 3 terminales diferentes:" -ForegroundColor White
Write-Host "   Terminal 1: Django backend (cd backend && python manage.py runserver)" -ForegroundColor Yellow
Write-Host "   Terminal 2: Frontend (cd frontend && npm run dev)" -ForegroundColor Yellow
Write-Host "   Terminal 3: Data Intake (cd backend-data-intake && npm start)" -ForegroundColor Yellow
Write-Host ""
Write-Host "3️⃣  Abre navegador: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  Crea datos en Django admin: http://localhost:8000/admin" -ForegroundColor White
Write-Host ""
Write-Host "5️⃣  Verifica en frontend que los datos aparecen" -ForegroundColor White
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Status: 🟢 LISTO PARA USAR" -ForegroundColor Green
Write-Host "📦 Total: 117+ archivos creados" -ForegroundColor White
Write-Host "📝 Documentación: 49 archivos .md" -ForegroundColor White
Write-Host "🔌 Endpoints: 60+ en Django + 4+ en Data Intake" -ForegroundColor White
Write-Host "⚙️  Tecnología: React + Django + Node.js + Socket.IO" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Preguntar si quiere ver la guía
Write-Host "¿Quieres abrir la guía de activación? (s/n)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq 's' -or $response -eq 'S') {
    $guideFile = ".\docs\documentado\GUIA_ACTIVACION_COMPLETA.md"
    if (Test-Path $guideFile) {
        Start-Process notepad $guideFile
    } else {
        Write-Host "Archivo no encontrado: $guideFile" -ForegroundColor Red
    }
}

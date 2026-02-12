# Script para medir performance de índices
# Uso: .\measure_indexes.ps1

# Colores
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

Write-Host "`n╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📊 MEDICIÓN DE PERFORMANCE: Antes vs Después de Índices              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$dbPath = ".\db.sqlite3"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ db.sqlite3 no encontrado en directorio actual" -ForegroundColor Red
    Write-Host "   Navegad a: c:\...\backend\" -ForegroundColor Yellow
    exit 1
}

# Función para medir tiempo de query
function Measure-SQLiteQuery {
    param(
        [string]$Query,
        [string]$Description
    )
    
    $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $Result = & sqlite3 $dbPath $Query 2>&1
    $Stopwatch.Stop()
    
    $Ms = $Stopwatch.Elapsed.TotalMilliseconds
    
    return @{
        Query = $Query
        Description = $Description
        Time = $Ms
        Result = $Result
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "⏳ Ejecutando mediciones... (esto toma ~30 segundos)`n" -ForegroundColor Yellow

$measurements = @()

# Test 1: Access Logs (Critical)
Write-Host "1/5: Verificando access_logs..." -ForegroundColor Cyan
$q1 = Measure-SQLiteQuery -Query "SELECT COUNT(*) FROM access_logs;" -Description "Access Logs - Contar total"
$measurements += $q1

# Test 2: Sales (Critical)
Write-Host "2/5: Verificando sales..." -ForegroundColor Cyan
$q2 = Measure-SQLiteQuery -Query "SELECT COUNT(*) FROM sales WHERE status='completed';" -Description "Sales - Filtrar completadas"
$measurements += $q2

# Test 3: Members
Write-Host "3/5: Verificando members..." -ForegroundColor Cyan
$q3 = Measure-SQLiteQuery -Query "SELECT COUNT(*) FROM members WHERE status='active';" -Description "Members - Activos"
$measurements += $q3

# Test 4: Memberships
Write-Host "4/5: Verificando memberships..." -ForegroundColor Cyan
$q4 = Measure-SQLiteQuery -Query "SELECT COUNT(*) FROM memberships WHERE status='active';" -Description "Memberships - Activas"
$measurements += $q4

# Test 5: Sync Queue
Write-Host "5/5: Verificando sync_queue..." -ForegroundColor Cyan
$q5 = Measure-SQLiteQuery -Query "SELECT COUNT(*) FROM sync_queue WHERE status IN ('pending','processing');" -Description "Sync Queue - Tareas"
$measurements += $q5

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                          📊 RESULTADOS                                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Mostrar resultados
foreach ($m in $measurements) {
    if ($m.Time -gt 1000) {
        $Color = $Red
        $Status = "⚠️  LENTO"
    } elseif ($m.Time -gt 200) {
        $Color = $Yellow
        $Status = "⚠️  BORDERLINE"
    } else {
        $Color = $Green
        $Status = "✅ OK"
    }
    
    Write-Host "$($m.Description)" -ForegroundColor Cyan
    Write-Host "  Tiempo: $([Math]::Round($m.Time, 1))ms  $Status" -ForegroundColor $Color
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# Mostrar índices disponibles
Write-Host "`n╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                       📋 ÍNDICES DISPONIBLES                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$indexList = & sqlite3 $dbPath ".indices"
$indexCount = ($indexList | Measure-Object -Line).Lines

Write-Host "Total de índices: $indexCount`n" -ForegroundColor Yellow

$indexList | ForEach-Object {
    if ($_ -like "idx_*") {
        Write-Host "  ✅ $_" -ForegroundColor Green
    } else {
        Write-Host "  • $_" -ForegroundColor Gray
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "`n╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                          📈 RECOMENDACIONES                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$slowQueries = $measurements | Where-Object { $_.Time -gt 200 }

if ($slowQueries.Count -gt 0) {
    Write-Host "⚠️  SE ENCONTRARON QUERIES LENTAS:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($q in $slowQueries) {
        Write-Host "  • $($q.Description)" -ForegroundColor Yellow
        Write-Host "    Tiempo: $([Math]::Round($q.Time, 1))ms" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "🚀 SOLUCIÓN:" -ForegroundColor Cyan
    Write-Host "  1. cd backend" -ForegroundColor Green
    Write-Host "  2. python add_indexes_phase2.py" -ForegroundColor Green
    Write-Host "  3. Vuelve a ejecutar este script" -ForegroundColor Green
    Write-Host ""
    
} else {
    Write-Host "✅ Todas las queries están optimizadas!" -ForegroundColor Green
    Write-Host "   Índices parecen estar funcionando correctamente." -ForegroundColor Green
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         ✅ ANÁLISIS COMPLETADO                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Para más detalles:" -ForegroundColor Cyan
Write-Host "  • RESUMEN_OPTIMIZACION.md" -ForegroundColor Green
Write-Host "  • INDICES_AVANZADOS_RECOMENDADOS.md" -ForegroundColor Green
Write-Host "  • EJEMPLOS_QUERIES_REALES.md" -ForegroundColor Green
Write-Host ""

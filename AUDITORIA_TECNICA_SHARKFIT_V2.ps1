# AUDITORIA TECNICA SHARKFIT v2 - Optimizada (sin node_modules)
# Ejecutar en la raiz del proyecto

$outputFile = ".\AUDITORIA_TECNICA_V2.txt"
$ErrorActionPreference = "SilentlyContinue"

# Funcion para excluir node_modules y carpetas innecesarias
function Get-ProjectFiles {
    param([string]$Path, [string]$Filter = "*", [int]$Depth = 3)
    Get-ChildItem -Path $Path -Filter $Filter -Recurse -Depth $Depth |
    Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build|\.next|__pycache__|\.venv|venv|migrations" }
}

# Limpiar archivo anterior
"" | Out-File $outputFile

# Header
@"
================================================================================
AUDITORIA TECNICA SHARKFIT DASHBOARD v2
Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
================================================================================

"@ | Out-File $outputFile -Append

# ============================================================================
# 1. ESTRUCTURA GENERAL
# ============================================================================
@"
################################################################################
[1/7] ESTRUCTURA GENERAL DEL PROYECTO
################################################################################

"@ | Out-File $outputFile -Append

">> Carpetas principales (Depth 2, sin node_modules):" | Out-File $outputFile -Append
Get-ChildItem -Recurse -Depth 2 -Directory |
    Where-Object { $_.FullName -notmatch "node_modules|\.git|dist|build|__pycache__|\.venv" } |
    Select-Object FullName | Out-File $outputFile -Append

# ============================================================================
# 2. BACKEND DATA INTAKE
# ============================================================================
@"

################################################################################
[2/7] BACKEND DATA INTAKE (Puerto 3005)
################################################################################

"@ | Out-File $outputFile -Append

">> package.json:" | Out-File $outputFile -Append
Get-Content "backend-data-intake\package.json" | Out-File $outputFile -Append

">> Estructura src/:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src" -Recurse -Depth 2 |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    Select-Object FullName | Out-File $outputFile -Append

">> app.js:" | Out-File $outputFile -Append
"`n=== backend-data-intake/src/app.js ===" | Out-File $outputFile -Append
Get-Content "backend-data-intake\src\app.js" | Out-File $outputFile -Append

">> index.js:" | Out-File $outputFile -Append
"`n=== backend-data-intake/src/index.js ===" | Out-File $outputFile -Append
Get-Content "backend-data-intake\src\index.js" | Out-File $outputFile -Append

">> MODELOS:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src\models" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> SERVICIOS:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src\services" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> RUTAS:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src\routes" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> CONECTORES:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src\connectors" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> MIDDLEWARES:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend-data-intake\src\middleware" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

# ============================================================================
# 3. USERS MICROSERVICE
# ============================================================================
@"

################################################################################
[3/7] USERS MICROSERVICE (Puerto 3001)
################################################################################

"@ | Out-File $outputFile -Append

">> package.json:" | Out-File $outputFile -Append
Get-Content "users-microservice\package.json" | Out-File $outputFile -Append

">> Estructura (sin node_modules):" | Out-File $outputFile -Append
Get-ChildItem -Path "users-microservice" -Recurse -Depth 2 |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    Select-Object FullName | Out-File $outputFile -Append

">> Archivos JS principales:" | Out-File $outputFile -Append
Get-ChildItem -Path "users-microservice" -Filter "*.js" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

# ============================================================================
# 4. FRONTEND LANDING
# ============================================================================
@"

################################################################################
[4/7] FRONTEND LANDING (Puerto 5173)
################################################################################

"@ | Out-File $outputFile -Append

">> package.json:" | Out-File $outputFile -Append
Get-Content "landing\package.json" | Out-File $outputFile -Append

">> Estructura src/ (Depth 3):" | Out-File $outputFile -Append
Get-ChildItem -Path "landing\src" -Recurse -Depth 3 -Directory |
    Select-Object FullName | Out-File $outputFile -Append

">> CONTEXTOS:" | Out-File $outputFile -Append
Get-ChildItem -Path "landing\src\context" -Filter "*.jsx" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> API - axios.js:" | Out-File $outputFile -Append
Get-Content "landing\src\api\axios.js" | Out-File $outputFile -Append

">> API SERVICES:" | Out-File $outputFile -Append
Get-ChildItem -Path "landing\src\api\services" -Filter "*.js" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> PAGINAS DASHBOARD:" | Out-File $outputFile -Append
Get-ChildItem -Path "landing\src\pages\dashboard" -Filter "*.jsx" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> COMPONENTES DASHBOARD:" | Out-File $outputFile -Append
Get-ChildItem -Path "landing\src\pages\dashboard\components" -Filter "*.jsx" | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

# ============================================================================
# 5. BACKEND DJANGO
# ============================================================================
@"

################################################################################
[5/7] BACKEND DJANGO (Bridge Legacy)
################################################################################

"@ | Out-File $outputFile -Append

">> Estructura (sin __pycache__, venv, migrations):" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Recurse -Depth 2 |
    Where-Object { $_.FullName -notmatch "__pycache__|venv|\.venv|migrations|\.pyc" } |
    Select-Object FullName | Out-File $outputFile -Append

">> settings.py (sin secrets):" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Filter "settings.py" -Recurse | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | ForEach-Object {
        if ($_ -match "(SECRET|PASSWORD|KEY|TOKEN).*=") { $_ -replace "=.*", "= '***HIDDEN***'" } else { $_ }
    } | Out-File $outputFile -Append
}

">> models.py:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Filter "models.py" -Recurse |
    Where-Object { $_.FullName -notmatch "venv|\.venv" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> views.py:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Filter "views.py" -Recurse |
    Where-Object { $_.FullName -notmatch "venv|\.venv" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> urls.py:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Filter "urls.py" -Recurse |
    Where-Object { $_.FullName -notmatch "venv|\.venv" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> serializers.py:" | Out-File $outputFile -Append
Get-ChildItem -Path "backend" -Filter "serializers.py" -Recurse |
    Where-Object { $_.FullName -notmatch "venv|\.venv" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

# ============================================================================
# 6. FRONTEND PRINCIPAL (si existe)
# ============================================================================
@"

################################################################################
[6/7] FRONTEND PRINCIPAL (si existe carpeta frontend/)
################################################################################

"@ | Out-File $outputFile -Append

if (Test-Path "frontend") {
    ">> package.json:" | Out-File $outputFile -Append
    Get-Content "frontend\package.json" | Out-File $outputFile -Append

    ">> Estructura src/:" | Out-File $outputFile -Append
    Get-ChildItem -Path "frontend\src" -Recurse -Depth 2 -Directory |
        Select-Object FullName | Out-File $outputFile -Append
} else {
    ">> No existe carpeta frontend/ separada" | Out-File $outputFile -Append
}

# ============================================================================
# 7. CONFIGURACION Y ENTORNO
# ============================================================================
@"

################################################################################
[7/7] CONFIGURACION Y ENTORNO
################################################################################

"@ | Out-File $outputFile -Append

">> Archivos .env (claves ocultas):" | Out-File $outputFile -Append
Get-ChildItem -Path "." -Filter ".env*" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules|venv" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | ForEach-Object {
        if ($_ -match "=") {
            $parts = $_ -split "=", 2
            "$($parts[0])=***HIDDEN***"
        } else { $_ }
    } | Out-File $outputFile -Append
}

">> Docker files:" | Out-File $outputFile -Append
Get-ChildItem -Path "." -Filter "docker*" -Recurse |
    Where-Object { $_.FullName -notmatch "node_modules" } | ForEach-Object {
    "`n=== $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\\'), '') ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

">> Archivos config raiz:" | Out-File $outputFile -Append
Get-ChildItem -Path "." -Depth 0 -File |
    Where-Object { $_.Name -match "\.(json|yaml|yml)$" } | ForEach-Object {
    "`n=== $($_.Name) ===" | Out-File $outputFile -Append
    Get-Content $_.FullName | Out-File $outputFile -Append
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
@"

================================================================================
AUDITORIA COMPLETADA
================================================================================
Archivo generado: $outputFile
Fecha: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

ESTADISTICAS:
"@ | Out-File $outputFile -Append

$stats = Get-Content $outputFile
"- Lineas totales: $($stats.Count)" | Out-File $outputFile -Append
"- Tamano: $((Get-Item $outputFile).Length / 1KB) KB" | Out-File $outputFile -Append

Write-Host "========================================" -ForegroundColor Green
Write-Host "AUDITORIA COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Archivo generado: $outputFile" -ForegroundColor Cyan
Write-Host "Tamano: $((Get-Item $outputFile).Length / 1KB) KB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora sube el archivo AUDITORIA_TECNICA_V2.txt a Claude" -ForegroundColor Yellow

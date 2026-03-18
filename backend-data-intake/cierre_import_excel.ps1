# cierre_import_excel.ps1
# Script para ejecutar el flujo de cierre de importación Excel en local.
# Requisitos según petición: validar token, archivo y mapping, ejecutar varias
# llamadas REST y manejar errores de autenticación.

# --- configuración inicial --------------------------------------------------
# credenciales para login si no hay token válido
$loginUrl      = 'http://localhost:4001/api/auth/login'
$importBaseUrl = 'http://localhost:3005/api'
$identifier    = 'admin@example.com'    # ajustar según entorno
$password      = 'change-me'            # ajustar según entorno

# variables de sesión; pueden inyectarse desde el entorno antes de llamar
if (-not $token) { $token = '' }
if (-not $filePath) { $filePath = 'C:\temp\datos.xlsx' }   # ejemplo
if (-not $mapping)  { $mapping  = @{ 'Nombre' = 'name'; 'Email' = 'email' } }

function Ensure-Token {
    param()
    if ([string]::IsNullOrEmpty($token) -or $token.Length -le 50) {
        Write-Host "No token válido, realizando login..."
        try {
            $resp = Invoke-RestMethod -Method Post -Uri $loginUrl -ContentType 'application/json' -Body (@{ identifier=$identifier; password=$password } | ConvertTo-Json)
        } catch {
            Write-Error "Login failed: $_"
            exit 1
        }
        # buscar token en distintas propiedades posibles
        $token = $resp.token ?? $resp.accessToken ?? $resp.data?.token ?? $resp.data?.accessToken
    }
    if (-not $token -or $token.Length -le 50) {
        Write-Error "Token vacío o demasiado corto ($($token.Length))"
        exit 1
    }
    Write-Host "Token OK Len=$($token.Length)"
}

function Check-TokenInResponse {
    param($obj)
    if ($null -ne $obj.error -and $obj.error -eq 'MISSING_TOKEN') {
        Write-Error "Token vacío o sesión perdida"
        exit 1
    }
}

# validar archivo
if (-not (Test-Path $filePath)) {
    Write-Error "Archivo no encontrado: $filePath"
    exit 1
}

# preparar mapping JSON comprimido
$mappingJson = $mapping | ConvertTo-Json -Compress

# asegurar token
Ensure-Token

$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== Selftest ==="
$resp = Invoke-RestMethod -Method Get -Uri "$importBaseUrl/selftest" -Headers $headers
Check-TokenInResponse $resp
Write-Host (ConvertTo-Json $resp -Depth 5)

Write-Host "`n=== Commit Excel ==="
try {
    $commitResp = Invoke-RestMethod -Method Post -Uri "$importBaseUrl/excel/commit" -Headers $headers -Form @{ file=(Get-Item $filePath); entidad='clientes'; mapping=$mappingJson }
} catch {
    Write-Error "Error en commit: $_"
    exit 1
}
Check-TokenInResponse $commitResp
Write-Host (ConvertTo-Json $commitResp -Depth 5)

Write-Host "`n=== Consultar clientes (máx 5) ==="
$cResp = Invoke-RestMethod -Method Get -Uri "$importBaseUrl/clientes?limit=5" -Headers $headers
Check-TokenInResponse $cResp
Write-Host (ConvertTo-Json $cResp -Depth 5)

Write-Host "`n=== Historial import ==="
$hResp = Invoke-RestMethod -Method Get -Uri "$importBaseUrl/import/history" -Headers $headers
Check-TokenInResponse $hResp
Write-Host (ConvertTo-Json $hResp -Depth 5)

Write-Host "
Flujo completado."
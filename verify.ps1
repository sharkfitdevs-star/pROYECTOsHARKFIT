#!/usr/bin/env pwsh

# simple E2E smoke tests for local services
# quits with non-zero if critical requests fail

$baseIntake = 'http://localhost:3005'
$baseUsers = 'http://localhost:4001'

function tryRequest($method, $url, $body=$null, $headers=@{}) {
    $attempt = 0
    while ($attempt -lt 4) {
        try {
            if ($body) {
                return irm $url -Method $method -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 3) -Headers $headers
            } else {
                return irm $url -Method $method -Headers $headers
            }
        } catch {
            $attempt++
            $isConnError = -not $_.Exception.Response
            if (-not $isConnError -or $attempt -ge 4) {
                $status = $_.Exception.Response.StatusCode.value__ 2>$null
                Write-Host "[ERROR] $method $url → STATUS: $status" -ForegroundColor Red
                if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
                return $null
            }
            # connection error, retry with backoff
            Start-Sleep -Seconds $attempt
        }
    }
    return $null
}

Write-Host "---- inicio verificación ----" -ForegroundColor Cyan

# 1. /api/health
$h = tryRequest GET "$baseIntake/api/health"
Write-Host "health ->" ($h | ConvertTo-Json -Depth 3)

# 2. settings before
$s1 = tryRequest GET "$baseIntake/api/settings/imports-connection"
Write-Host "settings (before) ->" ($s1 | ConvertTo-Json -Depth 3)

# 3. login on users
$loginResp = tryRequest POST "$baseUsers/api/auth/login" @{identifier='stafftest'; password='Matiasmartinez13'}
if (-not $loginResp) {
    Write-Host "Login falló; users-microservice no responde." -ForegroundColor Red
    exit 1
}
# extract token from common fields (robust, no `?.` operator)
$token = $null
foreach ($f in 'token','accessToken','access_token') {
    if ($loginResp.PSObject.Properties.Name -contains $f -and $loginResp.$f) {
        $token = $loginResp.$f; break
    }
}
if (-not $token -and $loginResp.PSObject.Properties.Name -contains 'data' -and $loginResp.data) {
    foreach ($f in 'token','accessToken') {
        if ($loginResp.data.PSObject.Properties.Name -contains $f -and $loginResp.data.$f) {
            $token = $loginResp.data.$f; break
        }
    }
}

if ($token) {
    Write-Host "TokenLen=$($token.Length)"
} else {
    Write-Host "No se pudo obtener token válido de login" -ForegroundColor Red
    Write-Host "Respuesta completa:" ($loginResp | ConvertTo-Json -Depth 5)
    exit 1
} 

$authHeaders = @{ Authorization = "Bearer $token" }

# 4. PATCH settings with token
$p = tryRequest PATCH "$baseIntake/api/settings/imports-connection" @{importsConnected=$true} $authHeaders
Write-Host "settings (patch) ->" ($p | ConvertTo-Json -Depth 3)

# 5. GET settings again
$s2 = tryRequest GET "$baseIntake/api/settings/imports-connection" $null $authHeaders
Write-Host "settings (after) ->" ($s2 | ConvertTo-Json -Depth 3)

Write-Host "---- fin verificación ----" -ForegroundColor Cyan

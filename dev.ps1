#!/usr/bin/env pwsh

# script para iniciar de forma estable los tres servicios locales
# 1) mata puertos ocupados
# 2) abre 3 consolas separadas y lanza el dev server de cada carpeta
# 3) imprime URLs y ejecuta verify.ps1 si existe

function Kill-Port($port) {
  $pids = netstat -ano | Select-String "LISTENING\s+\d+$" | Select-String ":$port\s" | ForEach-Object {
    ($_ -split '\s+')[-1]
  } | Select-Object -Unique

  if (-not $pids) { Write-Host "? Puerto $port libre"; return }

  foreach ($pid in $pids) {
    Write-Host "?? Puerto $port ocupado por PID $pid"
    Get-CimInstance Win32_Process -Filter "ProcessId=$pid" | Select ProcessId,Name,CommandLine | Format-List
    taskkill /PID $pid /F | Out-Host
  }

  Start-Sleep 1
  if (netstat -ano | Select-String ":$port\s") { Write-Host "? Puerto $port SIGUE ocupado (abre PowerShell como Admin y repite)"; }
  else { Write-Host "? Puerto $port liberado"; }
}

$ports = @(5173,3005,4001)
foreach($p in $ports){ Kill-Port $p }

$base = Get-Location
Write-Host "Arrancando servicios en nuevas consolas..." -ForegroundColor Green

Start-Process pwsh -ArgumentList "-NoExit","-Command","cd `"$base\users-microservice`"; npm run dev" -WorkingDirectory "$base\users-microservice"
# ensure logs directory exists
if (-not (Test-Path "$base\logs")) { New-Item -ItemType Directory -Path "$base\logs" | Out-Null }

Start-Process pwsh -ArgumentList "-NoExit","-Command","cd `"$base\backend-data-intake`"; npm run dev" -WorkingDirectory "$base\backend-data-intake" -RedirectStandardOutput "$base\logs\intake.log" -RedirectStandardError "$base\logs\intake.log" -NoNewWindow
Start-Process pwsh -ArgumentList "-NoExit","-Command","cd `"$base\landing`"; npm run dev" -WorkingDirectory "$base\landing"

Write-Host ""
Write-Host "URLs (puertos fijos):" -ForegroundColor Cyan
Write-Host " - http://localhost:4001 (users-microservice)"
Write-Host " - http://localhost:3005 (backend-data-intake)"
Write-Host " - http://localhost:5173 (landing frontend)"

# helper that waits until a port is LISTENING or timeout
function Wait-Port($port, $timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (netstat -ano | Select-String "LISTENING" | Select-String ":$port\s") {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    Write-Host "Timeout esperando puerto $port" -ForegroundColor Red
    return $false
}

# helper that waits until HTTP succeeds or timeout
function Wait-Http($url, $timeoutSeconds) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 2 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    Write-Host "Timeout esperando HTTP $url" -ForegroundColor Red
    return $false
}

# esperar servicios
$okUsers = Wait-Port 4001 45
$okIntake = Wait-Port 3005 45
# opcional front: $okFront = Wait-Port 5173 45

if ($okUsers -and $okIntake) {
    if (Test-Path .\verify.ps1) {
        Write-Host "";
        Write-Host "Ejecutando verificación rápida..." -ForegroundColor Cyan
        & .\verify.ps1
    } else {
        Write-Host "";
        Write-Host "Ejecuta .\verify.ps1 para comprobar endpoints" -ForegroundColor Yellow
    }
} else {
    if (-not $okIntake) {
        Write-Host "backend-data-intake no está escuchando en el puerto 3005" -ForegroundColor Red
        Write-Host "Puedes abrir solo ese servicio y ver el error con:" -ForegroundColor Yellow
        Write-Host "  cd backend-data-intake; $env:NODE_ENV='development'; node src/server.js" -ForegroundColor Yellow
    }
    Write-Host "Uno o más servicios no escucharon en tiempo; abre la consola del servicio que falló y revisa el error." -ForegroundColor Yellow
}
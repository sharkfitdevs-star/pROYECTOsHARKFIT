Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AUDITORÍA TÉCNICA SHARKFIT DASHBOARD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. ESTRUCTURA GENERAL DEL PROYECTO
Write-Host "`n[1/6] ESTRUCTURA GENERAL DEL PROYECTO" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Get-ChildItem -Recurse -Depth 2 -Directory | Select-Object FullName | Format-Table -AutoSize

# 2. BACKEND DATA INTAKE (Puerto 3005)
Write-Host "`n[2/6] BACKEND DATA INTAKE" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Write-Host "`n>> Estructura:" -ForegroundColor Green
Get-ChildItem -Path "backend-data-intake" -Recurse -Depth 2 | Select-Object FullName | Format-Table -AutoSize
Write-Host "`n>> package.json:" -ForegroundColor Green
Get-Content "backend-data-intake\package.json" -ErrorAction SilentlyContinue
Write-Host "`n>> Modelos:" -ForegroundColor Green
Get-ChildItem -Path "backend-data-intake\src\models" -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.Name; Get-Content $_.FullName }
Write-Host "`n>> Servicios:" -ForegroundColor Green
Get-ChildItem -Path "backend-data-intake\src\services" -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.Name; Get-Content $_.FullName }
Write-Host "`n>> Rutas:" -ForegroundColor Green
Get-ChildItem -Path "backend-data-intake\src\routes" -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.Name; Get-Content $_.FullName }
Write-Host "`n>> Conectores:" -ForegroundColor Green
Get-ChildItem -Path "backend-data-intake\src\connectors" -Filter "*.js" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_.Name; Get-Content $_.FullName }
Write-Host "`n>> App.js principal:" -ForegroundColor Green
Get-Content "backend-data-intake\src\app.js" -ErrorAction SilentlyContinue
Write-Host "`n>> Index.js:" -ForegroundColor Green
Get-Content "backend-data-intake\src\index.js" -ErrorAction SilentlyContinue

# 3. USERS MICROSERVICE (Puerto 3001)
Write-Host "`n[3/6] USERS MICROSERVICE" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Write-Host "`n>> Estructura:" -ForegroundColor Green
Get-ChildItem -Path "users-microservice" -Recurse -Depth 2 | Select-Object FullName | Format-Table -AutoSize
Write-Host "`n>> package.json:" -ForegroundColor Green
Get-Content "users-microservice\package.json" -ErrorAction SilentlyContinue
Write-Host "`n>> Todos los archivos JS:" -ForegroundColor Green
Get-ChildItem -Path "users-microservice" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }

# 4. FRONTEND LANDING (Puerto 5173)
Write-Host "`n[4/6] FRONTEND LANDING" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Write-Host "`n>> Estructura src:" -ForegroundColor Green
Get-ChildItem -Path "landing\src" -Recurse -Depth 2 -Directory | Select-Object FullName | Format-Table -AutoSize
Write-Host "`n>> package.json:" -ForegroundColor Green
Get-Content "landing\package.json" -ErrorAction SilentlyContinue
Write-Host "`n>> Contextos:" -ForegroundColor Green
Get-ChildItem -Path "landing\src\context" -Filter "*.jsx" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.Name) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> API Services:" -ForegroundColor Green
Get-ChildItem -Path "landing\src\api" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> Páginas Dashboard:" -ForegroundColor Green
Get-ChildItem -Path "landing\src\pages\dashboard" -Filter "*.jsx" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.Name) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> Componentes Dashboard:" -ForegroundColor Green
Get-ChildItem -Path "landing\src\pages\dashboard\components" -Filter "*.jsx" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.Name) ===" -ForegroundColor Magenta; Get-Content $_.FullName }

# 5. BACKEND DJANGO (Bridge)
Write-Host "`n[5/6] BACKEND DJANGO" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Write-Host "`n>> Estructura:" -ForegroundColor Green
Get-ChildItem -Path "backend" -Recurse -Depth 2 | Select-Object FullName | Format-Table -AutoSize
Write-Host "`n>> Models.py:" -ForegroundColor Green
Get-ChildItem -Path "backend" -Filter "models.py" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> Views.py:" -ForegroundColor Green
Get-ChildItem -Path "backend" -Filter "views.py" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> URLs.py:" -ForegroundColor Green
Get-ChildItem -Path "backend" -Filter "urls.py" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }

# 6. ARCHIVOS DE CONFIGURACIÓN Y ENTORNO
Write-Host "`n[6/6] CONFIGURACIÓN Y ENTORNO" -ForegroundColor Yellow
Write-Host "--------------------------------------"
Write-Host "`n>> Archivos .env (sin valores sensibles):" -ForegroundColor Green
Get-ChildItem -Path "." -Filter ".env*" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName | ForEach-Object { if ($_ -match "=") { $parts = $_ -split "=", 2; "$($parts[0])=***HIDDEN***" } else { $_ } } }
Write-Host "`n>> Docker files:" -ForegroundColor Green
Get-ChildItem -Path "." -Filter "docker*" -Recurse -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.FullName) ===" -ForegroundColor Magenta; Get-Content $_.FullName }
Write-Host "`n>> Archivos de configuración raíz:" -ForegroundColor Green
Get-ChildItem -Path "." -Depth 0 -File | Where-Object { $_.Name -match "\.(json|yaml|yml|toml|config)$|^\..*rc$" } | ForEach-Object { Write-Host "`n=== $($_.Name) ===" -ForegroundColor Magenta; Get-Content $_.FullName }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "AUDITORÍA COMPLETADA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copia todo el output y pégalo en Claude" -ForegroundColor White

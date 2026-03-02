# quick smoke test for import preview
# Usage: powershell -File test-import-preview.ps1 [-FilePath <path>]

param(
    [string]$FilePath = "C:\Users\vecch\OneDrive\Escritorio\datos_miembros_sharkfit_optimizado.xlsx",
    [string]$AuthUrl = 'http://localhost:4001/api/auth/login',
    [string]$PreviewUrl = 'http://localhost:3005/api/import/preview',
    [string]$Identifier = 'stafftest',
    [string]$Password = 'Matiasmartinez13'
)

Write-Host "Authenticating against $AuthUrl..."
$creds = @{ identifier = $Identifier; password = $Password }
try {
    $response = Invoke-RestMethod -Uri $AuthUrl -Method Post -ContentType 'application/json' -Body (ConvertTo-Json $creds) -ErrorAction Stop
    $token = $response?.token
    if (-not $token) {
        Write-Error "Login succeeded but no token returned. Response body: $($response | ConvertTo-Json -Depth 4)"
        exit 1
    }
    Write-Host "Obtained token."
} catch {
    $err = $_.Exception
    if ($err.Response) {
        $status = $err.Response.StatusCode.Value__
        $body = $err.Response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Error "Login failed with status $status"
        Write-Error "Body: $($body | ConvertTo-Json -Depth 8)"
    } else {
        Write-Error "Login request failed: $err"
    }
    exit 1
}

if (-not (Test-Path $FilePath)) {
    Write-Warning "File not found at $FilePath"
}

Write-Host "Sending preview request to $PreviewUrl..."
try {
    $previewResp = Invoke-RestMethod -Uri $PreviewUrl -Method Post -Headers @{ Authorization = "Bearer $token" } -Form @{ file = Get-Item $FilePath; entity = 'clientes' } -ErrorAction Stop
    Write-Host "Status: 200"
    $previewResp | ConvertTo-Json -Depth 8 | Write-Host
} catch {
    $err = $_.Exception
    if ($err.Response) {
        $status = $err.Response.StatusCode.Value__
        $body = $err.Response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        Write-Host "Status: $status"
        Write-Host "Body:"; $body | ConvertTo-Json -Depth 8 | Write-Host
    } else {
        Write-Error "Request failed: $err"
    }
}

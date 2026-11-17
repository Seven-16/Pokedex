param([switch]$Development)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonExe = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Primero ejecuta .\setup.ps1 para instalar las dependencias.' }
if ($Development) {
    Write-Host 'API: http://127.0.0.1:8000/docs'
    Write-Host 'En otra terminal: cd CapaPresentacion\frontend; npm run dev'
    & $pythonExe -m uvicorn CapaPresentacion.api.main:app --reload --host 127.0.0.1 --port 8000
} else {
    if (-not (Test-Path -LiteralPath 'CapaPresentacion\frontend\dist\index.html')) { throw 'Falta compilar React. Ejecuta .\setup.ps1.' }
    Write-Host 'Pokedex: http://127.0.0.1:8000 | API: http://127.0.0.1:8000/docs'
    & $pythonExe -m uvicorn CapaPresentacion.api.main:app --host 127.0.0.1 --port 8000
}

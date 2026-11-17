$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    $localPython = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314\python.exe'
    if (Test-Path -LiteralPath $localPython) { & $localPython -m venv .venv }
    else { py -3 -m venv .venv }
    if ($LASTEXITCODE -ne 0) { throw 'Instala Python 3.11 o superior y vuelve a ejecutar este script.' }
}
& '.\.venv\Scripts\python.exe' -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de Python.' }
Push-Location 'CapaPresentacion\frontend'
try {
    if (Test-Path package-lock.json) { npm.cmd ci } else { npm.cmd install }
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de React.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el frontend.' }
} finally { Pop-Location }
Write-Host 'Listo. Ejecuta .\start.ps1 para abrir la Pokedex.'

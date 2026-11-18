param(
    [string]$PythonExecutable,
    [string]$NodeDirectory
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if ($NodeDirectory) {
    $NodeDirectory = (Resolve-Path -LiteralPath $NodeDirectory).Path
    if (-not (Test-Path -LiteralPath (Join-Path $NodeDirectory 'npm.cmd'))) {
        throw 'NodeDirectory debe contener node.exe y npm.cmd.'
    }
    $env:PATH = "$NodeDirectory;$env:PATH"
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'No se encontro npm. Instala Node.js o indica -NodeDirectory con la carpeta que contiene node.exe y npm.cmd.'
}
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    $localPython = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314\python.exe'
    if ($PythonExecutable) { & $PythonExecutable -m venv .venv }
    elseif (Get-Command python.exe -ErrorAction SilentlyContinue) { python.exe -m venv .venv }
    elseif (Test-Path -LiteralPath $localPython) { & $localPython -m venv .venv }
    elseif (Get-Command py -ErrorAction SilentlyContinue) { py -3 -m venv .venv }
    else { throw 'Instala Python 3.11 o superior o indica -PythonExecutable con la ruta a python.exe.' }
    if ($LASTEXITCODE -ne 0) { throw 'Instala Python 3.11 o superior y vuelve a ejecutar este script.' }
}
& '.\.venv\Scripts\python.exe' -m pip install -r requirements-lock.txt
if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de Python.' }
Push-Location 'CapaPresentacion\frontend'
try {
    if (Test-Path package-lock.json) { npm.cmd ci } else { npm.cmd install }
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron instalar las dependencias de React.' }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el frontend.' }
} finally { Pop-Location }
Write-Host 'Listo. Ejecuta .\start.ps1 para abrir la Pokedex.'

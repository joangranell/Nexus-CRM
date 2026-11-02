# ========================================================
# Nexus CRM - Script de Inicio en Windows (PowerShell)
# ========================================================
# Uso recomendado en PowerShell:
# powershell -ExecutionPolicy Bypass -File .\start_windows.ps1

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     INICIANDO NEXUS CRM - ENTORNO WINDOWS (FASE 1)       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Comprobación de requisitos del sistema
Write-Host "`n[1/5] Verificando requisitos del sistema (Python y Node.js)..." -ForegroundColor Yellow
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "ERROR: Python no está instalado o no está en el PATH del sistema." -ForegroundColor Red
    exit 1
}
Write-Host "Python detectado: $(python --version)" -ForegroundColor Green

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "ERROR: Node.js no está instalado o no está en el PATH del sistema." -ForegroundColor Red
    exit 1
}
Write-Host "Node.js detectado: $(node --version)" -ForegroundColor Green

# 2. Configurar entorno virtual de Python (.venv)
Write-Host "`n[2/5] Verificando entorno virtual de Python (.venv)..." -ForegroundColor Yellow
if (-not (Test-Path ".venv")) {
    Write-Host "Creando nuevo entorno virtual .venv..." -ForegroundColor Gray
    python -m venv .venv
}

$venvPython = ".\.venv\Scripts\python.exe"
$venvPip = ".\.venv\Scripts\pip.exe"

Write-Host "Instalando/actualizando dependencias de backend..." -ForegroundColor Gray
& $venvPip install -q -r backend\requirements.txt

# 3. Base de Datos y Poblado Semilla (Seed)
Write-Host "`n[3/5] Comprobando base de datos y ejecutando Seed..." -ForegroundColor Yellow
& $venvPython backend\seed.py

# 4. Dependencias de Frontend
Write-Host "`n[4/5] Verificando dependencias de frontend React/Vite..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Instalando paquetes de node_modules en frontend..." -ForegroundColor Gray
    cmd.exe /c "cd frontend && npm install"
}

# 5. Lanzar servidores Backend y Frontend
Write-Host "`n[5/5] Levantando servidores..." -ForegroundColor Yellow
Write-Host "-> Backend FastAPI en:  http://127.0.0.1:8000 (Swagger docs en /docs)" -ForegroundColor Green
Write-Host "-> Frontend React en:   http://localhost:5173" -ForegroundColor Green
Write-Host "`nCredenciales de prueba:" -ForegroundColor Cyan
Write-Host "   Admin:     admin@nexuscrm.com    / admin123" -ForegroundColor White
Write-Host "   Comercial: carlos@nexuscrm.com   / comercial123" -ForegroundColor White
Write-Host "   Comercial: laura@nexuscrm.com    / comercial123" -ForegroundColor White
Write-Host "`nPresiona Ctrl+C en cualquier ventana para detener." -ForegroundColor Gray

# Iniciar Backend en segundo plano
Start-Process -FilePath $venvPython -ArgumentList "-m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload" -WindowStyle Normal

# Iniciar Frontend en la ventana actual
cmd.exe /c "cd frontend && npm run dev"

<#
.SYNOPSIS
  Khoi dong moi truong phat trien (dev) cho Multi-User System tren Windows/PowerShell.

.DESCRIPTION
  Chuan bi file .env cho backend (neu chua co), cai dependency, kiem tra Postgres
  co the ket noi duoc khong, chay migration + seed, roi khoi dong NestJS backend
  o che do watch. Frontend (Next.js) chua duoc khoi tao trong repo nen script
  chi chay backend; se bo sung khi frontend/ ton tai.

.PARAMETER SkipInstall
  Bo qua buoc "npm install" (dung khi dependency da cai va khong doi).

.PARAMETER SkipMigrate
  Bo qua buoc chay Prisma migrate + seed (dung khi DB da o dung trang thai).

.EXAMPLE
  ./scripts/run-dev.ps1

.EXAMPLE
  ./scripts/run-dev.ps1 -SkipInstall -SkipMigrate
#>

[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot 'backend'

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Test-DatabaseReachable {
  param([string]$DatabaseUrl)

  if ($DatabaseUrl -notmatch '@([^:/]+):(\d+)/') {
    Write-Warn "Khong doc duoc host/port tu DATABASE_URL, bo qua kiem tra ket noi."
    return $true
  }

  $dbHost = $Matches[1]
  $dbPort = [int]$Matches[2]

  $result = Test-NetConnection -ComputerName $dbHost -Port $dbPort -WarningAction SilentlyContinue
  return $result.TcpTestSucceeded
}

Write-Step "Kiem tra backend/.env"
$envPath = Join-Path $BackendDir '.env'
$envExamplePath = Join-Path $BackendDir '.env.example'

if (-not (Test-Path $envPath)) {
  Copy-Item -Path $envExamplePath -Destination $envPath
  Write-Warn "Da tao backend/.env tu .env.example. Hay mo file nay va cap nhat gia tri thuc te (DATABASE_URL, CSRF_SECRET, SMTP_*) truoc khi dung cho production."
} else {
  Write-Host "backend/.env da ton tai, giu nguyen."
}

if (-not $SkipInstall) {
  Write-Step "Cai dependency (npm install, root workspaces)"
  Push-Location $RepoRoot
  try {
    npm install
  } finally {
    Pop-Location
  }
} else {
  Write-Host "Bo qua npm install (-SkipInstall)."
}

Write-Step "Kiem tra ket noi PostgreSQL"
$envContent = Get-Content $envPath -Raw
$databaseUrl = ($envContent -split "`n" | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
$databaseUrl = $databaseUrl.Trim()

if (Test-DatabaseReachable -DatabaseUrl $databaseUrl) {
  Write-Host "Ket noi duoc PostgreSQL."
} else {
  Write-Warn "Khong ket noi duoc PostgreSQL theo DATABASE_URL trong backend/.env."
  Write-Warn "Hay khoi dong PostgreSQL (service local hoac container) roi chay lai script nay, hoac cap nhat DATABASE_URL cho dung."
  if (-not $SkipMigrate) {
    Write-Warn "Buoc migrate/seed phia duoi se that bai neu DB van chua san sang."
  }
}

if (-not $SkipMigrate) {
  Write-Step "Chay Prisma migrate deploy + seed du lieu goc (role USER/ADMIN)"
  Push-Location $BackendDir
  try {
    npm run db:migrate
    npm run db:seed
  } finally {
    Pop-Location
  }
} else {
  Write-Host "Bo qua migrate/seed (-SkipMigrate)."
}

Write-Step "Khoi dong backend (NestJS, watch mode, http://localhost:3001)"
Push-Location $BackendDir
try {
  npm run start:dev
} finally {
  Pop-Location
}

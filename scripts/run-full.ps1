<#
.SYNOPSIS
  Khoi dong toan bo he thong (backend + frontend) cho Multi-User System,
  san sang truy cap tu cac PC khac trong mang LAN.

.DESCRIPTION
  Chuan bi file .env cho backend va frontend (neu chua co), cai dependency,
  kiem tra Postgres, chay migration + seed, mo firewall rule cho cong
  3000/3001 (can xac nhan UAC), roi khoi dong backend (NestJS) va frontend
  (Next.js) o 2 cua so PowerShell rieng, ca hai deu bind 0.0.0.0 nen may
  khac cung mang truy cap duoc qua IP LAN cua may nay.

.PARAMETER SkipInstall
  Bo qua buoc "npm install".

.PARAMETER SkipMigrate
  Bo qua buoc chay Prisma migrate + seed.

.PARAMETER SkipFirewall
  Bo qua buoc tao firewall rule (dung khi da tao tu truoc).

.EXAMPLE
  ./scripts/run-full.ps1

.EXAMPLE
  ./scripts/run-full.ps1 -SkipInstall -SkipMigrate -SkipFirewall
#>

[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipMigrate,
  [switch]$SkipFirewall
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $RepoRoot 'backend'
$FrontendDir = Join-Path $RepoRoot 'frontend'

$FrontendFirewallRuleName = 'Multi-User System - Frontend (3000)'
$BackendFirewallRuleName = 'Multi-User System - Backend (3001)'

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

function Get-LanIPv4Address {
  $candidate = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.InterfaceAlias -notmatch 'VMware|VirtualBox|Hyper-V|Loopback|vEthernet'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress
  return $candidate
}

Write-Step "Kiem tra backend/.env"
$backendEnvPath = Join-Path $BackendDir '.env'
$backendEnvExamplePath = Join-Path $BackendDir '.env.example'

if (-not (Test-Path $backendEnvPath)) {
  Copy-Item -Path $backendEnvExamplePath -Destination $backendEnvPath
  Write-Warn "Da tao backend/.env tu .env.example. Hay mo file nay va cap nhat DATABASE_URL, CSRF_SECRET, CORS_ORIGIN, APP_BASE_URL (dung IP LAN, khong de localhost) truoc khi dung thuc te."
} else {
  Write-Host "backend/.env da ton tai, giu nguyen."
}

Write-Step "Kiem tra frontend/.env"
$frontendEnvPath = Join-Path $FrontendDir '.env'
$frontendEnvExamplePath = Join-Path $FrontendDir '.env.example'

if (-not (Test-Path $frontendEnvPath)) {
  Copy-Item -Path $frontendEnvExamplePath -Destination $frontendEnvPath
  Write-Warn "Da tao frontend/.env tu .env.example. Hay mo file nay va sua NEXT_PUBLIC_API_BASE_URL thanh http://<IP-LAN-cua-may-nay>:3001/api/v1 truoc khi dung tu may khac."
} else {
  Write-Host "frontend/.env da ton tai, giu nguyen."
}

$lanIp = Get-LanIPv4Address
if ($lanIp) {
  Write-Host "IP LAN phat hien duoc cua may nay: $lanIp"

  $backendEnvContent = Get-Content $backendEnvPath -Raw
  $frontendEnvContent = Get-Content $frontendEnvPath -Raw

  if ($backendEnvContent -notmatch [regex]::Escape($lanIp)) {
    Write-Warn "backend/.env (CORS_ORIGIN/APP_BASE_URL) khong chua IP '$lanIp'. Neu IP LAN vua doi, hay cap nhat lai 2 gia tri nay cho dung, neu khong may khac se khong dang nhap duoc (CORS/redirect sai)."
  }
  if ($frontendEnvContent -notmatch [regex]::Escape($lanIp)) {
    Write-Warn "frontend/.env (NEXT_PUBLIC_API_BASE_URL) khong chua IP '$lanIp'. Neu IP LAN vua doi, hay cap nhat lai gia tri nay, neu khong frontend se goi API sai dia chi."
  }
} else {
  Write-Warn "Khong tu dong phat hien duoc IP LAN. Kiem tra thu cong bang 'ipconfig' va dam bao backend/.env + frontend/.env dang dung dung IP do."
}

if (-not $SkipInstall) {
  Write-Step "Cai dependency (npm install, root workspaces: backend + frontend)"
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
$backendEnvContent = Get-Content $backendEnvPath -Raw
$databaseUrl = ($backendEnvContent -split "`n" | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', ''
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

$frontendRuleExists = [bool](Get-NetFirewallRule -DisplayName $FrontendFirewallRuleName -ErrorAction SilentlyContinue)
$backendRuleExists = [bool](Get-NetFirewallRule -DisplayName $BackendFirewallRuleName -ErrorAction SilentlyContinue)

if (-not $SkipFirewall -and (-not $frontendRuleExists -or -not $backendRuleExists)) {
  Write-Step "Tao firewall rule cho cong 3000 (frontend) + 3001 (backend) - can quyen Administrator"
  Write-Warn "Mot cua so UAC se hien ra de xin quyen Administrator, hay bam Yes."

  $fwScript = @"
if (-not (Get-NetFirewallRule -DisplayName '$FrontendFirewallRuleName' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName '$FrontendFirewallRuleName' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any | Out-Null
}
if (-not (Get-NetFirewallRule -DisplayName '$BackendFirewallRuleName' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName '$BackendFirewallRuleName' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Any | Out-Null
}
"@
  $encodedFwScript = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($fwScript))

  try {
    Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList @('-NoProfile', '-EncodedCommand', $encodedFwScript)
  } catch {
    Write-Warn "Khong tao duoc firewall rule tu dong (co the UAC bi huy). Hay tu mo PowerShell Administrator va chay thu cong 2 lenh New-NetFirewallRule."
  }

  $frontendRuleExists = [bool](Get-NetFirewallRule -DisplayName $FrontendFirewallRuleName -ErrorAction SilentlyContinue)
  $backendRuleExists = [bool](Get-NetFirewallRule -DisplayName $BackendFirewallRuleName -ErrorAction SilentlyContinue)
  if ($frontendRuleExists -and $backendRuleExists) {
    Write-Host "Da tao xong firewall rule cho cong 3000 va 3001."
  } else {
    Write-Warn "Van thieu firewall rule. May khac trong LAN se khong ket noi duoc toi khi rule duoc tao."
  }
} else {
  Write-Host "Firewall rule cho 3000/3001 da ton tai hoac bi bo qua (-SkipFirewall)."
}

Write-Step "Khoi dong backend (NestJS, watch mode, cua so moi)"
Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$BackendDir'; Write-Host 'Backend: http://localhost:3001 (va http://${lanIp}:3001 tu LAN)' -ForegroundColor Green; npm run start:dev"
) | Out-Null

Write-Step "Khoi dong frontend (Next.js, watch mode, cua so moi)"
Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location '$FrontendDir'; Write-Host 'Frontend: http://localhost:3000 (va http://${lanIp}:3000 tu LAN)' -ForegroundColor Green; npm run dev"
) | Out-Null

Write-Step "Hoan tat"
Write-Host "Backend va frontend dang khoi dong trong 2 cua so PowerShell rieng (xem log o do)."
if ($lanIp) {
  Write-Host ""
  Write-Host "Tu may nay:        http://localhost:3000" -ForegroundColor Green
  Write-Host "Tu may khac (LAN): http://${lanIp}:3000" -ForegroundColor Green
}
Write-Host ""
Write-Host "Moi nguoi dung tu dang ky tai khoan rieng qua man hinh /register bang email cua ho."
Write-Host "De co ADMIN dau tien, xem huong dan 'bootstrap ADMIN' trong README.md."

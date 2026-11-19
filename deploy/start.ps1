# 开机任务 SHUEHO-Zhiborl-Production 调用：恢复 Windows → WSL 的端口转发并启动容器。
$ErrorActionPreference = "Stop"
$deadline = (Get-Date).AddMinutes(5)
$wslIp = $null
$ready = $false

do {
    $addresses = & wsl.exe -d SHUEHO-PROD -- hostname -I 2>$null
    if ($LASTEXITCODE -eq 0 -and $addresses) {
        $wslIp = (($addresses -join " ").Trim() -split "\s+")[0]
        & wsl.exe -d SHUEHO-PROD -u root -- docker info *> $null
        $ready = $LASTEXITCODE -eq 0
    }
    if (-not $ready) { Start-Sleep -Seconds 5 }
} while (-not $ready -and (Get-Date) -lt $deadline)

if (-not $ready) { throw "SHUEHO-PROD Docker did not become ready within 5 minutes." }

& netsh.exe interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8850 | Out-Null
& netsh.exe interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8850 connectaddress=$wslIp connectport=8850
if ($LASTEXITCODE -ne 0) { throw "Failed to configure portproxy for 8850." }

& wsl.exe -d SHUEHO-PROD -u root -- bash -lc "cd /mnt/d/shueho/zhiborl && docker compose -f compose.yml up -d --no-build --pull never --wait --wait-timeout 180"
if ($LASTEXITCODE -ne 0) { throw "Failed to start shueho-zhiborl." }

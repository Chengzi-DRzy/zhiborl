# 首次部署执行一次：登记开机任务与防火墙规则（来源范围与本机其他系统一致），并收紧 .env 权限。
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType S4U -RunLevel Highest
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -File D:\shueho\zhiborl\start.ps1'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
Register-ScheduledTask -TaskName 'SHUEHO-Zhiborl-Production' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

$rule = 'SHUEHO Zhiborl HTTP'
$reference = Get-NetFirewallRule -DisplayName 'SHUEHO IT Requests HTTP' -ErrorAction SilentlyContinue
$remote = if ($reference) { ($reference | Get-NetFirewallAddressFilter).RemoteAddress } else { @('LocalSubnet', '192.168.3.0/24') }
if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $rule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8850 -RemoteAddress $remote -Profile Any | Out-Null
}

$envFile = 'D:\shueho\zhiborl\.env'
if (Test-Path $envFile) { & icacls.exe $envFile /inheritance:r /grant:r "*$($identity.User.Value):(F)" '*S-1-5-18:(F)' '*S-1-5-32-544:(F)' | Out-Null }

Start-ScheduledTask -TaskName 'SHUEHO-Zhiborl-Production'
"task: " + (Get-ScheduledTask -TaskName 'SHUEHO-Zhiborl-Production').State
"firewall remote: " + ((Get-NetFirewallRule -DisplayName $rule | Get-NetFirewallAddressFilter).RemoteAddress -join ',')

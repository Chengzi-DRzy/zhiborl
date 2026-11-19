# 首次执行一次：每 5 分钟检查 GitHub 是否有新提交并自动上线（脚本见 D:\shueho\zhiborl\auto-deploy.sh）。
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType S4U -RunLevel Highest
$action = New-ScheduledTaskAction -Execute 'wsl.exe' -Argument '-d SHUEHO-PROD -u root -- bash /mnt/d/shueho/zhiborl/auto-deploy.sh'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName 'SHUEHO-Zhiborl-AutoDeploy' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
"task: " + (Get-ScheduledTask -TaskName 'SHUEHO-Zhiborl-AutoDeploy').State

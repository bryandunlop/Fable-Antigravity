
# clean_dashboard.ps1

$path = "c:\Users\bryan\Documents\AviationManagementSystem\src\components\SafetyManagerDashboard.tsx"
Write-Host "Cleaning $path..."

$lines = Get-Content $path
$newLines = @()
$inRemote = $false

foreach ($line in $lines) {
    if ($line.Trim() -eq '<<<<<<< HEAD') { continue }
    if ($line.Trim() -eq '=======') { $inRemote = $true; continue }
    if ($line.Trim() -like '>>>>>>> *') { $inRemote = $false; continue }
    
    if (-not $inRemote) {
        $newLines += $line
    }
}

$newLines | Set-Content $path -Encoding UTF8
Write-Host "Done."

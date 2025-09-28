# TalentTrack - Network Launch Helper
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TalentTrack - Network Launch Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get IP address
Write-Host "Getting your IP address..." -ForegroundColor Yellow
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or $_.IPAddress -like "172.*"} | Select-Object -First 1).IPAddress

if ($ip) {
    Write-Host "Your IP address is: $ip" -ForegroundColor Green
} else {
    Write-Host "Could not detect IP address automatically" -ForegroundColor Red
    Write-Host "Please run: ipconfig | findstr IPv4" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Launch Instructions:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Backend Server (Terminal 1):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   python main.py" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Frontend Server (Terminal 2):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access URLs:" -ForegroundColor White
Write-Host "   Your computer: http://localhost:3000" -ForegroundColor Green
if ($ip) {
    Write-Host "   Other devices: http://$ip:3000" -ForegroundColor Green
}
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Press any key to continue..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Read-Host

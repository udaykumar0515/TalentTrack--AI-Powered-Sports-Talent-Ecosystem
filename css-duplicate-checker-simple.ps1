# CSS Duplicate Checker - Simple PowerShell Version
param(
    [string]$CssFile = "frontend/src/styles/globals.css"
)

Write-Host "Starting CSS Duplicate Analysis..." -ForegroundColor Green

# Check if CSS file exists
if (-not (Test-Path $CssFile)) {
    Write-Host "CSS file not found: $CssFile" -ForegroundColor Red
    exit 1
}

# Read CSS file
$cssContent = Get-Content $CssFile -Raw
$lines = $cssContent -split "`n"

Write-Host "Successfully read CSS file: $CssFile" -ForegroundColor Green
Write-Host "File size: $([math]::Round($cssContent.Length / 1KB, 2)) KB" -ForegroundColor Cyan

# Find all CSS selectors
$selectors = @{}
$currentSelector = ""
$inRule = $false
$braceCount = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i].Trim()
    
    # Skip comments and empty lines
    if ($line.StartsWith("/*") -or $line.StartsWith("*") -or $line -eq "") {
        continue
    }

    # Check for selector
    if ($line.Contains("{") -and $braceCount -eq 0) {
        $selector = $line.Split("{")[0].Trim()
        if ($selectors.ContainsKey($selector)) {
            $selectors[$selector]++
        } else {
            $selectors[$selector] = 1
        }
        $braceCount = 1
    }
    # Count braces
    elseif ($braceCount -gt 0) {
        $openBraces = ($line.ToCharArray() | Where-Object { $_ -eq "{" }).Count
        $closeBraces = ($line.ToCharArray() | Where-Object { $_ -eq "}" }).Count
        $braceCount += $openBraces - $closeBraces
    }
}

# Find duplicates
$duplicates = $selectors.GetEnumerator() | Where-Object { $_.Value -gt 1 } | Sort-Object Value -Descending

Write-Host ""
Write-Host "CSS DUPLICATE ANALYSIS REPORT" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

if ($duplicates.Count -gt 0) {
    Write-Host ""
    Write-Host "DUPLICATE SELECTORS FOUND:" -ForegroundColor Red
    Write-Host "-" * 30 -ForegroundColor Gray
    
    foreach ($dup in $duplicates) {
        Write-Host ""
        Write-Host "Selector: $($dup.Key)" -ForegroundColor Yellow
        Write-Host "Found $($dup.Value) times" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "SUMMARY:" -ForegroundColor Cyan
    Write-Host "Total duplicate selectors: $($duplicates.Count)" -ForegroundColor White
    Write-Host "Total duplicate instances: $(($duplicates | Measure-Object Value -Sum).Sum)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "No duplicate selectors found!" -ForegroundColor Green
    Write-Host "Your CSS file is clean!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Analysis complete!" -ForegroundColor Green

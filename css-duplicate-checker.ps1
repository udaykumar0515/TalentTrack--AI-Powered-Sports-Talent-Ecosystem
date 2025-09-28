# CSS Duplicate Checker - PowerShell Version
# Automatically detects duplicate CSS rules and selectors

param(
    [string]$CssFile = "frontend/src/styles/globals.css",
    [string]$OutputFile = "css-duplicates-report.json"
)

Write-Host "🚀 Starting CSS Duplicate Analysis..." -ForegroundColor Green
Write-Host ""

# Check if CSS file exists
if (-not (Test-Path $CssFile)) {
    Write-Host "❌ CSS file not found: $CssFile" -ForegroundColor Red
    Write-Host "Usage: .\css-duplicate-checker.ps1 -CssFile [path-to-css-file]" -ForegroundColor Yellow
    exit 1
}

# Read CSS file
try {
    $cssContent = Get-Content $CssFile -Raw
    $fileSize = [math]::Round($cssContent.Length / 1KB, 2)
    Write-Host "✅ Successfully read CSS file: $CssFile" -ForegroundColor Green
    Write-Host "📊 File size: $fileSize KB" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error reading CSS file: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Parse CSS and find duplicates
$lines = $cssContent -split "`n"
$rules = @()
$currentRule = $null
$braceCount = 0
$ruleStartLine = 0

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i].Trim()
    
    # Skip comments and empty lines
    if ($line.StartsWith("/*") -or $line.StartsWith("*") -or $line -eq "") {
        continue
    }

    # Check for selector (contains { but not inside a rule)
    if ($line.Contains("{") -and $braceCount -eq 0) {
        if ($currentRule) {
            $rules += $currentRule
        }
        
        $selector = $line.Split("{")[0].Trim()
        $currentRule = @{
            Selector = $selector
            Properties = @()
            StartLine = $i + 1
            EndLine = $i + 1
            FullText = $line
        }
        $braceCount = 1
        $ruleStartLine = $i + 1
    }
    # Inside a rule
    elseif ($currentRule -and $braceCount -gt 0) {
        $currentRule.FullText += "`n" + $line
        $currentRule.EndLine = $i + 1

        # Count braces
        $openBraces = ($line.ToCharArray() | Where-Object { $_ -eq "{" }).Count
        $closeBraces = ($line.ToCharArray() | Where-Object { $_ -eq "}" }).Count
        $braceCount += $openBraces - $closeBraces

        # Rule ends
        if ($braceCount -eq 0) {
            $rules += $currentRule
            $currentRule = $null
        }
        # Property inside rule
        elseif ($line.Contains(":") -and -not $line.Contains("{") -and -not $line.Contains("}")) {
            $parts = $line.Split(":", 2)
            $property = $parts[0].Trim()
            $value = $parts[1].Trim().Replace(";", "")
            $currentRule.Properties += @{
                Property = $property
                Value = $value
                Line = $i + 1
            }
        }
    }
}

# Add last rule if exists
if ($currentRule) {
    $rules += $currentRule
}

Write-Host "📋 Parsed $($rules.Count) CSS rules" -ForegroundColor Cyan

# Find duplicate selectors
$selectorMap = @{}
$duplicateSelectors = @{}

foreach ($rule in $rules) {
    $selector = $rule.Selector
    if ($selectorMap.ContainsKey($selector)) {
        $selectorMap[$selector] += $rule
    } else {
        $selectorMap[$selector] = @($rule)
    }
}

# Filter only duplicates
foreach ($kvp in $selectorMap.GetEnumerator()) {
    if ($kvp.Value.Count -gt 1) {
        $duplicateSelectors[$kvp.Key] = $kvp.Value
    }
}

# Find similar rules (same selector with different properties)
$similarRules = @{}
foreach ($kvp in $selectorMap.GetEnumerator()) {
    if ($kvp.Value.Count -gt 1) {
        $similarRules[$kvp.Key] = $kvp.Value
    }
}

# Find duplicate property combinations
$propertyMap = @{}
$duplicateProperties = @{}

foreach ($rule in $rules) {
    if ($rule.Properties.Count -eq 0) { continue }
    
    # Create a signature of all properties
    $signature = ($rule.Properties | ForEach-Object { "$($_.Property):$($_.Value)" } | Sort-Object) -join "|"
    
    if ($propertyMap.ContainsKey($signature)) {
        $propertyMap[$signature] += $rule
    } else {
        $propertyMap[$signature] = @($rule)
    }
}

# Filter only duplicates
foreach ($kvp in $propertyMap.GetEnumerator()) {
    if ($kvp.Value.Count -gt 1) {
        $duplicateProperties[$kvp.Key] = $kvp.Value
    }
}

# Generate report
Write-Host ""
Write-Host "🔍 CSS DUPLICATE ANALYSIS REPORT" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

# Duplicate Selectors Report
if ($duplicateSelectors.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ DUPLICATE SELECTORS ($($duplicateSelectors.Count) found):" -ForegroundColor Red
    Write-Host "-" * 30 -ForegroundColor Gray
    
    foreach ($kvp in $duplicateSelectors.GetEnumerator()) {
        Write-Host ""
        Write-Host "📌 Selector: $($kvp.Key)" -ForegroundColor Yellow
        Write-Host "   Found $($kvp.Value.Count) identical rules:" -ForegroundColor White
        for ($i = 0; $i -lt $kvp.Value.Count; $i++) {
            Write-Host "   $($i + 1). Lines $($kvp.Value[$i].StartLine)-$($kvp.Value[$i].EndLine)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host ""
    Write-Host "✅ No duplicate selectors found!" -ForegroundColor Green
}

# Similar Rules Report
if ($similarRules.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  SIMILAR RULES ($($similarRules.Count) found):" -ForegroundColor Yellow
    Write-Host "-" * 30 -ForegroundColor Gray
    
    foreach ($kvp in $similarRules.GetEnumerator()) {
        Write-Host ""
        Write-Host "📌 Selector: $($kvp.Key)" -ForegroundColor Yellow
        Write-Host "   Found $($kvp.Value.Count) different rule definitions:" -ForegroundColor White
        for ($i = 0; $i -lt $kvp.Value.Count; $i++) {
            Write-Host "   $($i + 1). Lines $($kvp.Value[$i].StartLine)-$($kvp.Value[$i].EndLine)" -ForegroundColor Gray
            Write-Host "      Properties: $($kvp.Value[$i].Properties.Count)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host ""
    Write-Host "✅ No similar rules found!" -ForegroundColor Green
}

# Duplicate Properties Report
if ($duplicateProperties.Count -gt 0) {
    Write-Host ""
    Write-Host "🔄 DUPLICATE PROPERTY COMBINATIONS ($($duplicateProperties.Count) found):" -ForegroundColor Yellow
    Write-Host "-" * 30 -ForegroundColor Gray
    
    foreach ($kvp in $duplicateProperties.GetEnumerator()) {
        $signature = if ($kvp.Key.Length -gt 100) { $kvp.Key.Substring(0, 100) + "..." } else { $kvp.Key }
        Write-Host ""
        Write-Host "📌 Properties: $signature" -ForegroundColor Yellow
        Write-Host "   Found in $($kvp.Value.Count) different selectors:" -ForegroundColor White
        for ($i = 0; $i -lt $kvp.Value.Count; $i++) {
            Write-Host "   $($i + 1). $($kvp.Value[$i].Selector) (Lines $($kvp.Value[$i].StartLine)-$($kvp.Value[$i].EndLine))" -ForegroundColor Gray
        }
    }
} else {
    Write-Host ""
    Write-Host "✅ No duplicate property combinations found!" -ForegroundColor Green
}

# Summary
$totalDuplicates = $duplicateSelectors.Count + $similarRules.Count + $duplicateProperties.Count

Write-Host ""
Write-Host "📊 SUMMARY:" -ForegroundColor Cyan
Write-Host "-" * 30 -ForegroundColor Gray
Write-Host "Total duplicate issues found: $totalDuplicates" -ForegroundColor White
Write-Host "Duplicate selectors: $($duplicateSelectors.Count)" -ForegroundColor White
Write-Host "Similar rules: $($similarRules.Count)" -ForegroundColor White
Write-Host "Duplicate properties: $($duplicateProperties.Count)" -ForegroundColor White

if ($totalDuplicates -eq 0) {
    Write-Host ""
    Write-Host "🎉 Congratulations! Your CSS file is clean of duplicates!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "💡 Consider consolidating these duplicates to improve maintainability." -ForegroundColor Yellow
}

# Export results to JSON
$results = @{
    timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    file = $CssFile
    summary = @{
        totalDuplicates = $totalDuplicates
        duplicateSelectors = $duplicateSelectors.Count
        similarRules = $similarRules.Count
        duplicateProperties = $duplicateProperties.Count
    }
    duplicates = @{
        selectors = @()
        rules = @()
        properties = @()
    }
}

# Convert to JSON format
foreach ($kvp in $duplicateSelectors.GetEnumerator()) {
    $results.duplicates.selectors += @{
        selector = $kvp.Key
        count = $kvp.Value.Count
        locations = $kvp.Value | ForEach-Object { @{ startLine = $_.StartLine; endLine = $_.EndLine } }
    }
}

foreach ($kvp in $similarRules.GetEnumerator()) {
    $results.duplicates.rules += @{
        selector = $kvp.Key
        count = $kvp.Value.Count
        locations = $kvp.Value | ForEach-Object { @{ startLine = $_.StartLine; endLine = $_.EndLine; propertyCount = $_.Properties.Count } }
    }
}

foreach ($kvp in $duplicateProperties.GetEnumerator()) {
    $results.duplicates.properties += @{
        signature = if ($kvp.Key.Length -gt 200) { $kvp.Key.Substring(0, 200) } else { $kvp.Key }
        count = $kvp.Value.Count
        selectors = $kvp.Value | ForEach-Object { @{ selector = $_.Selector; startLine = $_.StartLine; endLine = $_.EndLine } }
    }
}

try {
    $results | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8
    Write-Host ""
    Write-Host "📄 Results exported to: $OutputFile" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Error exporting results: $($_.Exception.Message)" -ForegroundColor Red
}

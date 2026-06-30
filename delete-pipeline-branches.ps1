# Delete all generated pipeline branches matching pattern: pipeline/YYYYMMDD-HHMMSS-<uuid>

$branches = @(git branch -l 'pipeline/*' | Where-Object { $_ -match 'pipeline/\d{8}-\d{6}-[0-9a-f]{8}' })

if ($branches.Count -eq 0) {
    Write-Host "No pipeline branches found to delete."
    exit 0
}

Write-Host "Found $($branches.Count) branch(es) to delete:"
$branches | ForEach-Object { Write-Host "  $($_.Trim())" }
Write-Host ""

$confirm = Read-Host "Delete these branches? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled."
    exit 0
}

foreach ($branch in $branches) {
    $branchName = $branch.Trim()
    git branch -D $branchName
    Write-Host "Deleted: $branchName"
}

Write-Host "Done."

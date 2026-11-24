param(
  [string]$Tag = "v0.1.21",
  [string]$Repository = "HF08/finlens-releases"
)

$ErrorActionPreference = "Stop"

function Get-GitHubToken {
  $credentialText = @("protocol=https", "host=github.com", "", "") -join [Environment]::NewLine
  $credentialText = $credentialText | git credential fill
  foreach ($line in ($credentialText -split "\r?\n")) {
    $index = $line.IndexOf("=")
    if ($index -gt 0 -and $line.Substring(0, $index) -eq "password") {
      return $line.Substring($index + 1)
    }
  }
  throw "GitHub credentials are unavailable"
}

$token = Get-GitHubToken
$headers = @{
  Authorization = "Bearer $token"
  Accept = "application/vnd.github+json"
  "User-Agent" = "FinLens-Release-Script"
}
$repositoryInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository" -Headers $headers -TimeoutSec 30

try {
  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/tags/$Tag" -Headers $headers -TimeoutSec 30
} catch {
  $version = $Tag.TrimStart("v")
  $body = @{
    tag_name = $Tag
    name = "FinLens $Tag"
    body = "Windows x64 unsigned test build. Auto-update uses GitHub Releases. User data under APPDATA remains preserved."
    draft = $false
    prerelease = $false
  } | ConvertTo-Json -Depth 4
  $release = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$Repository/releases" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 30
}

$uploadBase = $release.upload_url -replace '\{.*$', ''
if (-not $uploadBase) {
  throw "Release upload_url is empty"
}

$version = $Tag.TrimStart("v")
$installer = "release\FinLens-$version-x64-Setup.exe"
$assets = @(
  $installer,
  "$installer.blockmap",
  "release\latest.yml",
  "$installer.sha256"
)

$existingAssets = @(Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases/$($release.id)/assets" -Headers $headers -TimeoutSec 30)
foreach ($file in $assets) {
  $fullPath = (Resolve-Path -LiteralPath $file).Path
  $name = [IO.Path]::GetFileName($fullPath)
  $existing = $null
  foreach ($asset in $existingAssets) {
    if ($asset.name -eq $name) {
      $existing = $asset
      break
    }
  }
  if ($existing) {
    Write-Output "SKIP existing asset: $name ($($existing.size) bytes)"
    continue
  }
  $encodedName = [uri]::EscapeDataString($name)
  $uploadUri = "${uploadBase}?name=$encodedName"
  $uploaded = Invoke-RestMethod -Method Post -Uri $uploadUri -Headers $headers -ContentType "application/octet-stream" -InFile $fullPath -TimeoutSec 900
  Write-Output "UPLOADED $($uploaded.name) $($uploaded.size) bytes"
}

Write-Output "RELEASE_URL $($release.html_url)"
Write-Output "REPOSITORY_PRIVATE $($repositoryInfo.private)"

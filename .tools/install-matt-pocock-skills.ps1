<#
.SYNOPSIS
  Install Matt Pocock's promoted skills into this project's .agents/skills.

.DESCRIPTION
  The official installer (npx skills add mattpocock/skills) cannot run in this
  environment: it shells out to git, which the file sandbox blocks. This script
  does the equivalent install from an already-downloaded copy of the repo.

  The skill list is read from .claude-plugin/plugin.json, which is the
  authoritative "promoted set" (engineering + productivity). The non-promoted
  buckets (misc, in-progress, deprecated) are intentionally skipped.

  DSH discovers skills one level below a skills root (.agents/skills/<name>/SKILL.md),
  so skills are installed flat, not in their engineering/ and productivity/ buckets.

.PARAMETER Source
  Root of an extracted mattpocock/skills checkout (contains .claude-plugin/).

.PARAMETER Destination
  Skills root to install into. Defaults to <repo>/.agents/skills.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$Destination
)

$ErrorActionPreference = 'Stop'

$Source = (Resolve-Path $Source).Path
$manifestPath = Join-Path $Source '.claude-plugin/plugin.json'
if (-not (Test-Path $manifestPath)) { throw "no plugin manifest at $manifestPath" }

if (-not $Destination) {
  $repoRoot = Split-Path -Parent $PSScriptRoot
  $Destination = Join-Path $repoRoot '.agents/skills'
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $Destination | Out-Null

$installed = @()
foreach ($entry in $manifest.skills) {
  # manifest entries look like "./skills/engineering/tdd"
  $relative = $entry -replace '^\./', ''
  $sourceDir = Join-Path $Source $relative
  if (-not (Test-Path $sourceDir)) { throw "manifest lists a missing skill: $entry" }

  $skillName = Split-Path -Leaf $relative
  $targetDir = Join-Path $Destination $skillName

  if (-not (Test-Path (Join-Path $sourceDir 'SKILL.md'))) {
    throw "skill $skillName has no SKILL.md"
  }

  if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
  Copy-Item -Recurse -Force $sourceDir $targetDir

  $bucket = (Split-Path -Parent $relative) -replace '^skills/', ''
  $files = (Get-ChildItem -Recurse -File $targetDir).Count
  $installed += [pscustomobject]@{ Skill = $skillName; Bucket = $bucket; Files = $files }
}

# Provenance, so the install can be audited or re-synced later.
$provenance = [ordered]@{
  source       = 'https://github.com/mattpocock/skills'
  version      = $manifest.version
  license      = 'MIT'
  installedAt  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  installMethod = 'manual copy (npx skills add cannot clone in the DSH sandbox)'
  skillCount   = $installed.Count
}
$provenance | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $Destination 'INSTALL-SOURCE.json')

$installed | Sort-Object Bucket, Skill | Format-Table -AutoSize
"installed $($installed.Count) skills into $Destination"

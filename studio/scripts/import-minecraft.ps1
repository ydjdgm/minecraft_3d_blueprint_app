param([string]$Javap = 'C:/Program Files/Java/jdk-21.0.11/bin/javap.exe')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
node scripts/fetch-minecraft.mjs
if ($LASTEXITCODE -ne 0) { throw 'Download failed' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$mcDestination = [IO.Path]::GetFullPath('outputs/minecraft-26.2/extracted')
$mcWorkspace = (Get-Location).Path
if (-not $mcDestination.StartsWith($mcWorkspace + [IO.Path]::DirectorySeparatorChar)) { throw 'Outside workspace' }
$mcArchive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path outputs/minecraft-26.2/client.jar))
try {
 foreach ($mcEntry in $mcArchive.Entries) {
  if ($mcEntry.FullName -match '^(data/minecraft/(recipe|tags/item)/.*\.json|assets/minecraft/lang/en_us.json)$') {
   $mcTarget = [IO.Path]::GetFullPath([IO.Path]::Combine($mcDestination, $mcEntry.FullName))
   if (-not $mcTarget.StartsWith($mcDestination + [IO.Path]::DirectorySeparatorChar)) { throw 'Invalid archive entry' }
   [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($mcTarget)) | Out-Null
   [IO.Compression.ZipFileExtensions]::ExtractToFile($mcEntry, $mcTarget, $true)
  }
 }
} finally { $mcArchive.Dispose() }
$mcBytecode = & $Javap -classpath outputs/minecraft-26.2/client.jar -c -p net.minecraft.world.item.Items
if ($LASTEXITCODE -ne 0) { throw 'Official item registration extraction failed' }
[IO.File]::WriteAllLines([IO.Path]::GetFullPath('outputs/minecraft-26.2/items-bytecode.txt'), $mcBytecode, [Text.UTF8Encoding]::new($false))
node scripts/generate-minecraft.mjs
if ($LASTEXITCODE -ne 0) { throw 'Catalog generation failed' }

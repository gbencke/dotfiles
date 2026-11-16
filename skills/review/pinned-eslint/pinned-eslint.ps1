$ErrorActionPreference = 'Stop'

function Write-Failure {
    param([string]$Message, [int]$Code)
    [Console]::Error.WriteLine("error: $Message")
    exit $Code
}

function Assert-Command {
    param([string]$Name, [string]$InstallHint)
    if ($null -eq (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Failure $InstallHint 69
    }
}

function Get-PackageDirectories {
    param([string]$NodeModules)
    $packages = @()
    foreach ($entry in Get-ChildItem -LiteralPath $NodeModules -Directory -Force) {
        if ($entry.Name.StartsWith('@')) {
            foreach ($scoped in Get-ChildItem -LiteralPath $entry.FullName -Directory -Force) {
                $packages += [PSCustomObject]@{
                    Name = "$($entry.Name)/$($scoped.Name)"
                    Path = $scoped.FullName
                }
            }
        } elseif ($entry.Name -ne '.bin') {
            $packages += [PSCustomObject]@{
                Name = $entry.Name
                Path = $entry.FullName
            }
        }
    }
    return $packages
}

function Test-FormatterArgument {
    param([string[]]$Arguments)
    foreach ($argument in $Arguments) {
        if ($argument -eq '--format' -or $argument -eq '-f' -or
            $argument.StartsWith('--format=') -or $argument.StartsWith('-f=')) {
            return $true
        }
    }
    return $false
}

$arguments = @($args)
if ($arguments.Count -lt 1) {
    [Console]::Error.WriteLine('usage: pinned-eslint.ps1 <repo> [eslint-version] [--config <file>] [--report <file>] [--print-store] [-- eslint-args...]')
    exit 64
}

$index = 0
$repo = [IO.Path]::GetFullPath([string]$arguments[$index])
$index += 1
$version = '9.24.0'
if ($index -lt $arguments.Count -and
    -not ([string]$arguments[$index]).StartsWith('--')) {
    $version = [string]$arguments[$index]
    $index += 1
}

$config = ''
$report = ''
$customConfig = $false
$printStore = $false
while ($index -lt $arguments.Count) {
    $argument = [string]$arguments[$index]
    if ($argument -eq '--config') {
        if ($index + 1 -ge $arguments.Count) {
            Write-Failure '--config requires a file' 64
        }
        $config = [IO.Path]::GetFullPath([string]$arguments[$index + 1])
        $customConfig = $true
        $index += 2
        continue
    }
    if ($argument -eq '--report') {
        if ($index + 1 -ge $arguments.Count) {
            Write-Failure '--report requires a file' 64
        }
        $report = [IO.Path]::GetFullPath([string]$arguments[$index + 1])
        $index += 2
        continue
    }
    if ($argument -eq '--print-store') {
        $printStore = $true
        $index += 1
        continue
    }
    if ($argument -eq '--') {
        $index += 1
    }
    break
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $customConfig) {
    $config = Join-Path $scriptDirectory 'eslint.config.ts'
    $major = 0
    if (-not [int]::TryParse($version.Split('.')[0], [ref]$major) -or $major -lt 9) {
        Write-Failure 'the bundled flat config requires ESLint 9; omit the version to use 9.24.0' 64
    }
}
if (-not (Test-Path -LiteralPath $repo -PathType Container)) {
    Write-Failure "repository is not a directory: $repo" 66
}
if (-not (Test-Path -LiteralPath $config -PathType Leaf)) {
    Write-Failure "ESLint config not found: $config" 66
}

if ($printStore) {
    Assert-Command 'npm' 'install npm'
    Assert-Command 'node' 'install Node.js'
} else {
    Assert-Command 'docker' 'install Docker Desktop with Linux containers'
}

$plugins = @(
    '@eslint/js@9.24.0',
    'eslint-formatter-unix@9.0.1',
    'typescript@5.8.3',
    'typescript-eslint@8.29.0',
    'jiti@2.4.2',
    'eslint-plugin-promise@7.2.1',
    'eslint-plugin-react@7.37.2',
    'eslint-plugin-react-hooks@5.1.0',
    'eslint-plugin-jsx-a11y@6.10.2',
    'eslint-plugin-functional@9.0.1',
    'eslint-plugin-unicorn@57.0.0',
    'eslint-plugin-sonarjs@3.0.2',
    'eslint-plugin-import-x@4.16.1',
    'eslint-import-resolver-typescript@3.10.1'
)
if (-not [string]::IsNullOrWhiteSpace($env:PINNED_ESLINT_PLUGINS)) {
    $plugins = [regex]::Split($env:PINNED_ESLINT_PLUGINS.Trim(), '\s+')
}

$fingerprintInput = "$version $($plugins -join "`n")`n"
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
    $inputBytes = [Text.Encoding]::UTF8.GetBytes($fingerprintInput)
    $hashBytes = $sha256.ComputeHash($inputBytes)
    $fingerprint = [BitConverter]::ToString($hashBytes).Replace('-', '').ToLowerInvariant()
} finally {
    $sha256.Dispose()
}
$cacheHome = $env:XDG_CACHE_HOME
if ([string]::IsNullOrWhiteSpace($cacheHome)) {
    $cacheHome = Join-Path $HOME '.cache'
}
$store = Join-Path (Join-Path $cacheHome 'pinned-eslint') $fingerprint

if ($printStore) {
    if (-not (Test-Path -LiteralPath (Join-Path $store '.complete') -PathType Leaf)) {
        [Console]::Error.WriteLine(">> installing eslint@$version $($plugins -join ' ')")
        if (Test-Path -LiteralPath $store) {
            Remove-Item -LiteralPath $store -Recurse -Force
        }
        New-Item -ItemType Directory -Path $store -Force | Out-Null
        & npm install --prefix $store --no-save --no-audit --no-fund --loglevel=error "eslint@$version" @plugins
        if ($LASTEXITCODE -ne 0) {
            exit $LASTEXITCODE
        }
        New-Item -ItemType File -Path (Join-Path $store '.complete') -Force | Out-Null
    }
    [Console]::Out.WriteLine($store)
    exit 0
}

$nodeImage = 'node:22.14.0-bookworm-slim'
$ErrorActionPreference = 'Continue'
$dockerOs = (& docker info --format '{{.OSType}}' 2>$null | Out-String).Trim()
$dockerInfoExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($dockerInfoExitCode -ne 0) {
    Write-Failure 'start Docker Desktop with Linux containers' 69
}
if ($dockerOs -ne 'linux') {
    Write-Failure 'switch Docker Desktop to Linux containers' 69
}
$ErrorActionPreference = 'Continue'
& docker image inspect $nodeImage *> $null
$imageInspectExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
if ($imageInspectExitCode -ne 0) {
    & docker pull $nodeImage
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

$architecture = $env:PROCESSOR_ARCHITECTURE.ToLowerInvariant()
$store = "$store-linux-$architecture"
if (-not (Test-Path -LiteralPath (Join-Path $store '.complete') -PathType Leaf)) {
    [Console]::Error.WriteLine(">> installing Linux eslint@$version $($plugins -join ' ')")
    if (Test-Path -LiteralPath $store) {
        Remove-Item -LiteralPath $store -Recurse -Force
    }
    New-Item -ItemType Directory -Path $store -Force | Out-Null
    $installArguments = @(
        'run', '--rm', '--network', 'bridge', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--tmpfs', '/tmp:rw,nosuid,nodev',
        '-e', 'npm_config_cache=/tmp/npm-cache',
        '-v', "${store}:/setup", $nodeImage,
        'npm', 'install', '--prefix', '/setup', '--no-save', '--no-audit',
        '--no-fund', '--loglevel=error', "eslint@$version"
    ) + $plugins
    $ErrorActionPreference = 'Continue'
    & docker @installArguments
    $installExitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($installExitCode -ne 0) {
        exit $installExitCode
    }
    New-Item -ItemType File -Path (Join-Path $store '.complete') -Force | Out-Null
}

New-Item -ItemType Directory -Path (Join-Path $store 'config') -Force | Out-Null
$configName = Split-Path -Leaf $config
$configDestination = Join-Path (Join-Path $store 'config') $configName
New-Item -ItemType File -Path $configDestination -Force | Out-Null
$configTarget = "/pinned/config/$configName"
$configArguments = @('--config', $configTarget)
$major = 0
if ([int]::TryParse($version.Split('.')[0], [ref]$major) -and
    $major -lt 9 -and $env:ESLINT_USE_FLAT_CONFIG -ne 'true') {
    $configArguments += @('--no-eslintrc', '--resolve-plugins-relative-to', '/pinned')
}

$dockerArguments = @(
    'run', '--rm', '--init', '--network', 'none', '--read-only',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--pids-limit', '512', '--tmpfs', '/tmp:rw,nosuid,nodev',
    '-v', "${repo}:/repo", '--workdir', '/repo',
    '-v', "${store}:/pinned:ro",
    '-v', "${config}:$configTarget`:ro"
)

$createdDirectories = @()
$repoNodeModules = Join-Path $repo 'node_modules'
if (Test-Path -LiteralPath $repoNodeModules -PathType Container) {
    $packages = Get-PackageDirectories (Join-Path $store 'node_modules')
    foreach ($package in $packages) {
        $relativePackage = $package.Name.Replace('/', [string][IO.Path]::DirectorySeparatorChar)
        $mountPoint = Join-Path $repoNodeModules $relativePackage
        if (-not (Test-Path -LiteralPath $mountPoint -PathType Container)) {
            $parent = Split-Path -Parent $mountPoint
            $parentWasMissing = -not (Test-Path -LiteralPath $parent -PathType Container)
            New-Item -ItemType Directory -Path $mountPoint -Force | Out-Null
            $createdDirectories += $mountPoint
            if ($parentWasMissing) {
                $createdDirectories += $parent
            }
        }
        $dockerArguments += @('-v', "$($package.Path):/repo/node_modules/$($package.Name):ro")
    }
} else {
    [Console]::Error.WriteLine(">> warning: $repo has no node_modules; skipping package shadow mounts")
}

$eslintArguments = @()
if ($index -lt $arguments.Count) {
    $eslintArguments = @($arguments[$index..($arguments.Count - 1)])
}
if ($eslintArguments.Count -eq 0) {
    if ($customConfig) {
        $eslintArguments = @('--ext', '.ts', '.')
    } else {
        $eslintArguments = @('.')
    }
}
if (-not $customConfig -and -not (Test-FormatterArgument $eslintArguments)) {
    $eslintArguments = @('--format', '/pinned/node_modules/eslint-formatter-unix/index.js') + $eslintArguments
}

$dockerArguments += $nodeImage
$dockerArguments += @('node', '/pinned/node_modules/eslint/bin/eslint.js')
$dockerArguments += $configArguments
$dockerArguments += $eslintArguments

$lintExitCode = 1
$reportWriter = $null
$ErrorActionPreference = 'Continue'
try {
    if (-not [string]::IsNullOrWhiteSpace($report)) {
        $reportDirectory = Split-Path -Parent $report
        New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
        $encoding = [Text.UTF8Encoding]::new($false)
        $reportWriter = [IO.StreamWriter]::new($report, $false, $encoding)
        & docker @dockerArguments 2>&1 | ForEach-Object {
            $line = $_.ToString()
            [Console]::Out.WriteLine($line)
            $reportWriter.WriteLine($line)
        }
    } else {
        & docker @dockerArguments 2>&1
    }
    $lintExitCode = $LASTEXITCODE
} finally {
    if ($null -ne $reportWriter) {
        $reportWriter.Dispose()
    }
    $ErrorActionPreference = 'Stop'
    foreach ($directory in $createdDirectories) {
        Remove-Item -LiteralPath $directory -ErrorAction SilentlyContinue
    }
}
exit $lintExitCode

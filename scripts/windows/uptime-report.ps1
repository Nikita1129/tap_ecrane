# Taproom TV - cat a stat pornit mini PC-ul, reconstruit din jurnalul Windows (System).
# Merge si pentru zilele DINAINTE ca playerul sa trimita raportul.
#
# Rulare (PowerShell):
#   powershell -ExecutionPolicy Bypass -File uptime-report.ps1 -Days 30
#
# Masoara cat a fost PORNIT CALCULATORUL, nu cat a rulat Chrome si nu daca
# televizoarele erau aprinse. Opririle bruste (curent, crash) nu lasa ora exacta:
# folosim ultimul eveniment scris in jurnal inainte de oprire (aproximativ).
param([int]$Days = 30)

$since = (Get-Date).Date.AddDays(-$Days + 1)
$oldest = (Get-WinEvent -LogName System -MaxEvents 1 -Oldest -ErrorAction SilentlyContinue).TimeCreated
$ev = Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = $since } -ErrorAction SilentlyContinue |
  Sort-Object TimeCreated

if (-not $ev) { Write-Host "Nu am gasit evenimente in jurnalul System dupa $since."; return }
if ($oldest -and $oldest -gt $since) {
  Write-Host ("Atentie: jurnalul Windows incepe abia la {0:dd.MM.yyyy HH:mm}; zilele de dinainte lipsesc." -f $oldest) -ForegroundColor Yellow
}

$sessions = New-Object System.Collections.Generic.List[object]
$open = $null; $lastSeen = $null; $seenAny = $false

foreach ($e in $ev) {
  $p = $e.ProviderName; $id = $e.Id; $t = $e.TimeCreated
  $isStart = ($id -eq 6005 -and $p -eq 'EventLog') -or ($id -eq 1 -and $p -eq 'Microsoft-Windows-Power-Troubleshooter')
  $isStop = ($id -eq 6006 -and $p -eq 'EventLog') -or ($id -eq 42 -and $p -eq 'Microsoft-Windows-Kernel-Power')

  if ($isStart) {
    # Pornire peste o sesiune neinchisa = oprire bruta. Sfarsitul: ultimul semn de viata.
    if ($open) { $sessions.Add([pscustomobject]@{ Start = $open; End = $lastSeen; Mod = 'oprire bruta' }) }
    $open = $t; $seenAny = $true
  }
  elseif ($isStop) {
    if ($open) { $sessions.Add([pscustomobject]@{ Start = $open; End = $t; Mod = 'normal' }); $open = $null }
    elseif (-not $seenAny) { $sessions.Add([pscustomobject]@{ Start = $since; End = $t; Mod = 'normal' }) } # era deja pornit
    $seenAny = $true
  }
  $lastSeen = $t
}
if ($open) { $sessions.Add([pscustomobject]@{ Start = $open; End = (Get-Date); Mod = 'inca pornit' }) }
elseif (-not $seenAny) { $sessions.Add([pscustomobject]@{ Start = $since; End = (Get-Date); Mod = 'inca pornit' }) }

# Imparte sesiunile pe zile calendaristice.
$perDay = @{}; $crashes = @{}
foreach ($s in $sessions) {
  if ($s.Mod -eq 'oprire bruta') { $crashes[$s.End.ToString('yyyy-MM-dd')] += 1 }
  $a = $s.Start
  while ($a -lt $s.End) {
    $dayEnd = $a.Date.AddDays(1)
    $b = if ($s.End -lt $dayEnd) { $s.End } else { $dayEnd }
    $perDay[$a.ToString('yyyy-MM-dd')] += ($b - $a).TotalMinutes
    $a = $b
  }
}

function Fmt([double]$min) { '{0}h {1:00}m' -f [math]::Floor($min / 60), [math]::Round($min % 60) }

$rows = for ($d = $since; $d -le (Get-Date).Date; $d = $d.AddDays(1)) {
  $k = $d.ToString('yyyy-MM-dd'); $m = [double]$perDay[$k]
  [pscustomobject]@{
    Data          = $d.ToString('ddd dd.MM')
    Pornit        = Fmt $m
    Minute        = [math]::Round($m)
    OpririBrute   = [int]$crashes[$k]
  }
}

Write-Host "`nTaproom TV - mini PC pornit, pe zile" -ForegroundColor Cyan
$rows | Format-Table -AutoSize
$total = ($rows | Measure-Object Minute -Sum).Sum
Write-Host ("Total: {0}  |  medie: {1}/zi" -f (Fmt $total), (Fmt ($total / [math]::Max(1, $rows.Count))))

Write-Host "`nSesiuni (pornire -> oprire)" -ForegroundColor Cyan
$sessions | ForEach-Object {
  '{0:dd.MM HH:mm}  ->  {1:dd.MM HH:mm}   {2,-8}  {3}' -f $_.Start, $_.End, (Fmt ($_.End - $_.Start).TotalMinutes), $_.Mod
}

$out = Join-Path ([Environment]::GetFolderPath('Desktop')) ('taproom-pc-uptime-{0:yyyyMMdd}.csv' -f (Get-Date))
$rows | Export-Csv -Path $out -NoTypeInformation -Encoding UTF8
Write-Host "`nSalvat si ca CSV: $out" -ForegroundColor Green

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

# 1. Physical Adapter (Radio)
$adapter = Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -like 'USB\*' -or $_.InstanceId -like 'PCI\*' } | Select-Object -First 1
$adapterInfo = [PSCustomObject]@{
    name = if ($adapter) { $adapter.FriendlyName } else { "Bluetooth Adaptörü" }
    status = if ($adapter) { $adapter.Status } else { "Unknown" }
    enabled = [bool]($adapter -and $adapter.Status -eq 'OK')
}

# 2. WinRT Setup for Connection Checking
Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
$asTaskGeneric = $null
try {
    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }[0]
    [Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
    [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime] | Out-Null
} catch {}

Function CheckConnected($macHex, $isBle) {
    if (-not $asTaskGeneric -or -not $macHex -or $macHex.Length -ne 12) { return $false }
    try {
        $macUlong = [Convert]::ToUInt64($macHex, 16)
        if ($isBle) {
            $task = [Windows.Devices.Bluetooth.BluetoothLEDevice]::FromBluetoothAddressAsync($macUlong)
            $asTask = $asTaskGeneric.MakeGenericMethod([Windows.Devices.Bluetooth.BluetoothLEDevice])
        } else {
            $task = [Windows.Devices.Bluetooth.BluetoothDevice]::FromBluetoothAddressAsync($macUlong)
            $asTask = $asTaskGeneric.MakeGenericMethod([Windows.Devices.Bluetooth.BluetoothDevice])
        }
        $netTask = $asTask.Invoke($null, @($task))
        if ($netTask.Wait(1200)) {
            $dev = $netTask.Result
            if ($dev -and $dev.ConnectionStatus.ToString() -eq 'Connected') {
                return $true
            }
        }
    } catch {}
    return $false
}

# 3. Only query REAL paired devices (DEV_* instance IDs)
$rawDevs = Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -like 'BTHENUM\DEV_*' -or $_.InstanceId -like 'BTHLE\DEV_*' }
$devices = @()

foreach ($dev in $rawDevs) {
    $inst = $dev.InstanceId
    $isBle = ($inst -like 'BTHLE\*')
    
    # Extract MAC
    $macHex = ""
    if ($inst -match 'DEV_([0-9A-Fa-f]{12})') {
        $macHex = $matches[1].ToUpper()
    }

    $connected = CheckConnected $macHex $isBle

    # Properties
    $props = Get-PnpDeviceProperty -InstanceId $inst -ErrorAction SilentlyContinue
    $catRaw = ($props | Where-Object { $_.KeyName -eq 'DEVPKEY_DeviceContainer_Category' }).Data
    $catStr = if ($catRaw) { [string]$catRaw } else { "" }
    $battery = ($props | Where-Object { $_.KeyName -eq '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2' }).Data

    # Format MAC (e.g. 40:DE:17:2C:99:DC)
    $formattedMac = $macHex
    if ($macHex.Length -eq 12) {
        $parts = for ($i = 0; $i -lt 12; $i += 2) { $macHex.Substring($i, 2) }
        $formattedMac = $parts -join ':'
    }

    # Derive human-friendly type & icon
    $type = "Bluetooth Aygıtı"
    $icon = "bluetooth"
    $cLower = $catStr.ToLower()
    $nameLower = $dev.FriendlyName.ToLower()

    if ($nameLower -like "*sw29*" -or $nameLower -like "*watch*" -or $nameLower -like "*saat*" -or $nameLower -like "*band*" -or $cLower -like "*watch*") {
        $type = "Akıllı Saat / Giyilebilir"
        $icon = "watch"
    } elseif ($cLower -like "*mouse*" -or $nameLower -like "*mouse*" -or $nameLower -like "*fare*" -or $nameLower -like "*fb35c*") {
        $type = "Kablosuz Fare"
        $icon = "mouse"
    } elseif ($cLower -like "*headphone*" -or $cLower -like "*headset*" -or $cLower -like "*audio*" -or $nameLower -like "*buds*" -or $nameLower -like "*kulaklık*" -or $nameLower -like "*airpods*") {
        $type = "Kulaklık / Ses Cihazı"
        $icon = "headphones"
    } elseif ($cLower -like "*keyboard*" -or $nameLower -like "*klavye*") {
        $type = "Kablosuz Klavye"
        $icon = "keyboard"
    } elseif ($cLower -like "*phone*" -or $nameLower -like "*telefon*") {
        $type = "Akıllı Telefon"
        $icon = "smartphone"
    }

    $devices += [PSCustomObject]@{
        name = $dev.FriendlyName
        id = $inst
        deviceId = $inst
        mac = $formattedMac
        connected = $connected
        paired = $true
        category = $catStr
        type = $type
        icon = $icon
        battery = if ($battery) { [int]$battery } else { $null }
        isBle = $isBle
    }
}

$output = [PSCustomObject]@{
    adapter = $adapterInfo
    devices = $devices
}

$output | ConvertTo-Json -Depth 4 -Compress

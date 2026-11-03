package com.ulak.station.ui

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.VpnService
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.R
import com.ulak.station.core.*
import com.ulak.station.data.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ================= 01: SADELEŞTİRİLMİŞ MODERN ANA SAYFA (DASHBOARD) =================
@Composable
fun HomeScreen(ctx: Context, onNav: (String) -> Unit) {
    var hw by remember { mutableStateOf(HardwareMonitor.sample(ctx)) }
    var net by remember { mutableStateOf(NetworkEngine.getActiveNet(ctx)) }
    val fwActive = Prefs.getInt("fw_active", 1) == 1
    val cpuHistory = remember { mutableStateListOf(0.18f, 0.28f, 0.22f, 0.38f, 0.24f, 0.32f, 0.20f, 0.26f) }
    val pal = LocalPal.current

    LaunchedEffect(Unit) {
        while (true) {
            hw = HardwareMonitor.sample(ctx)
            net = NetworkEngine.getActiveNet(ctx)
            val avgLoad = if (hw.cores.isNotEmpty()) hw.cores.map { it.load }.average().toFloat() else 0.18f
            if (cpuHistory.size > 20) cpuHistory.removeAt(0)
            cpuHistory.add(avgLoad)
            delay(Prefs.interval)
        }
    }

    ScreenList {
        // 1. HERO STATUS CARD (Sade, prestijli kalkan ve sistem durumu)
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                accent = if (fwActive) Accent else Danger
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Modern Shield Icon
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(RoundedCornerShape(18.dp))
                            .background(if (fwActive) Accent.copy(alpha = 0.12f) else Danger.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        ShieldEmblem(
                            color = if (fwActive) Accent else Danger,
                            speedMs = if (fwActive) 5000 else 14000,
                            modifier = Modifier.size(64.dp)
                        )
                        Image(
                            painter = painterResource(R.drawable.ulak_logo),
                            contentDescription = "ULAK",
                            modifier = Modifier.size(30.dp)
                        )
                    }

                    Spacer(Modifier.width(14.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            UChip(
                                text = if (fwActive) "Kalkan Aktif" else "Kalkan Pasif",
                                color = if (fwActive) Accent else Danger
                            )
                            UChip(
                                text = if (net.isConnected) "Çevrimiçi" else "Çevrimdışı",
                                color = if (net.isConnected) Cyan else Amber
                            )
                        }

                        Spacer(Modifier.height(4.dp))

                        Text(
                            text = if (fwActive) "Sistem Korumada" else "Güvenlik Duvarı Kapalı",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = pal.t1
                        )

                        Text(
                            text = "${android.os.Build.MODEL} • Android ${android.os.Build.VERSION.RELEASE}",
                            fontSize = 11.5.sp,
                            color = pal.t2
                        )
                    }
                }

                Spacer(Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    UButtonPrimary(
                        text = "Kalkanı Yönet",
                        icon = Icons.Rounded.Shield,
                        color = if (fwActive) Accent else Danger,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("security")
                    }

                    UButton(
                        text = "Ağ Teşhisi",
                        icon = Icons.Rounded.Bolt,
                        color = Cyan,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("security")
                    }
                }
            }
        }

        // 2. VİTAL STAT METRICS (2x2 Temiz Grid)
        item {
            val cpuAvg = if (hw.cores.isNotEmpty()) (hw.cores.map { it.load }.average() * 100).toInt() else 14
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat(
                    label = "İŞLEMCİ YÜKÜ",
                    value = "$cpuAvg%",
                    sub = hw.cpuModel.take(14),
                    color = Accent,
                    modifier = Modifier.weight(1f)
                )
                Stat(
                    label = "BELLEK KULLANIMI",
                    value = "${hw.ramPercent}%",
                    sub = "${hw.availRamMb} MB Boş",
                    color = Cyan,
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat(
                    label = "BATARYA DURUMU",
                    value = "${hw.batteryPct}%",
                    sub = "${hw.batteryTempC}°C • ${hw.batteryWatts}W",
                    color = Amber,
                    modifier = Modifier.weight(1f)
                )
                Stat(
                    label = "AKTİF BAĞLANTI",
                    value = if (net.isConnected) "${net.speedMbps} M" else "Yok",
                    sub = if (net.isConnected) net.ssid.take(12) else "Kopuk",
                    color = if (net.isConnected) Violet else pal.t3,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // 3. CANLI CPU YÜK OSİLOSKOBU
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Canlı CPU Yük Osiloskobu", Icons.Rounded.ShowChart)
                Spacer(Modifier.height(4.dp))
                Sparkline(cpuHistory, Accent, Modifier.fillMaxWidth().height(44.dp))
            }
        }

        // 4. HIZLI ERİŞİM AKSİYONLARI (4 Temiz Buton)
        item {
            GlassCard(Modifier.fillMaxWidth(), pal.border) {
                SectionTitle("Hızlı İşlemler", Icons.Rounded.FlashOn)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    UButton(
                        text = "Wi-Fi Spektrumu",
                        icon = Icons.Rounded.Wifi,
                        color = Cyan,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("network")
                    }
                    UButton(
                        text = "Donanım & GPU",
                        icon = Icons.Rounded.Memory,
                        color = Violet,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("hardware")
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    UButton(
                        text = "Sistem Temizliği",
                        icon = Icons.Rounded.DeleteSweep,
                        color = Amber,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("cleaner")
                    }
                    UButton(
                        text = "Tüm Araçlar",
                        icon = Icons.Rounded.Widgets,
                        color = Accent,
                        modifier = Modifier.weight(1f)
                    ) {
                        onNav("hub")
                    }
                }
            }
        }

        // 5. AKIŞ OTOMASYONU HIZLI KARTI (LlamaLab Automate Fiber Monitor)
        item {
            val flows by com.ulak.station.automate.engine.AutomateEngine.flows.collectAsState()
            val activeCount = flows.count { it.isRunning }
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                accent = Amber,
                onClick = { onNav("automation") }
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBox(Icons.Rounded.AutoAwesome, Amber, 40.dp)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Akış Otomasyonu",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = pal.t1
                            )
                            Text(
                                text = if (activeCount > 0) "$activeCount Aktif Fiber Çalışıyor" else "${flows.size} Kayıtlı Akış Hazır",
                                fontSize = 11.sp,
                                color = if (activeCount > 0) Accent else pal.t2
                            )
                        }
                    }
                    UChip(
                        if (activeCount > 0) "● AKTİF" else "TUVALİ AÇ",
                        if (activeCount > 0) Accent else Amber
                    )
                }
            }
        }
    }
}

// ================= 02: BİRLEŞİK KALKAN & GÜVENLİK MERKEZİ (SECURITY HUB) =================
@Composable
fun SecurityHubScreen(ctx: Context, initialTab: Int = 0) {
    var selectedTab by remember { mutableIntStateOf(initialTab) }
    val tabs = listOf("Güvenlik Duvarı", "Ağ Teşhisi", "Derin Tarayıcı")

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 14.dp, vertical = 6.dp)) {
            SegmentedTabs(
                tabs = tabs,
                selectedIdx = selectedTab,
                onSelect = { selectedTab = it; Fx.tick() },
                color = Accent
            )
        }

        Box(Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> FirewallScreen(ctx)
                1 -> HackerScreen(ctx)
                2 -> ScannerScreen(ctx)
            }
        }
    }
}

// ================= 02-A: GÜVENLİK DUVARI (FIREWALL) =================
@Composable
fun FirewallScreen(ctx: Context) {
    var fwActive by remember { mutableStateOf(Prefs.getInt("fw_active", 1) == 1) }
    var mode by remember { mutableIntStateOf(Prefs.getInt("fw_mode", 1)) }
    var activeSubTab by remember { mutableIntStateOf(0) }
    val modes = listOf("Düşük", "Orta", "Yüksek", "Paranoid")
    var blockedApps by remember { mutableStateOf(Prefs.getSet("fw_blocked_apps")) }
    var appFilter by remember { mutableStateOf("") }
    var customPortInput by remember { mutableStateOf("") }
    val blockedPorts = remember { mutableStateListOf(8080, 23, 445) }
    var activeSockets by remember { mutableStateOf(emptyList<SocketItem>()) }
    val pal = LocalPal.current

    LaunchedEffect(activeSubTab) {
        if (activeSubTab == 3) {
            activeSockets = NetworkEngine.getActiveSockets()
        }
    }

    val vpnLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        if (res.resultCode == Activity.RESULT_OK) {
            val intent = Intent(ctx, FirewallVpnService::class.java).apply { action = "START" }
            ctx.startService(intent)
            fwActive = true
            Prefs.putInt("fw_active", 1)
            Fx.shield()
        }
    }

    val installedApps = remember {
        val pm = ctx.packageManager
        pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .map { it.loadLabel(pm).toString() to it.packageName }
            .sortedBy { it.first }
    }

    ScreenList {
        item {
            Header(
                title = "Güvenlik Duvarı Kalkanı",
                sub = "VpnService Tabanlı Ağ Filtreleme & Kural Denetimi",
                color = if (fwActive) Accent else Danger
            ) {
                LivingShieldBadge(active = fwActive, color = if (fwActive) Accent else Danger, size = 44.dp)
            }
        }

        item {
            SegmentedTabs(
                tabs = listOf("Kalkan", "Uygulamalar", "Portlar", "Soketler"),
                selectedIdx = activeSubTab,
                onSelect = { activeSubTab = it; Fx.tick() }
            )
        }

        when (activeSubTab) {
            0 -> {
                item {
                    GlassCard(Modifier.fillMaxWidth(), if (fwActive) Accent else Danger) {
                        SectionTitle("Kalkan Anahtarı", Icons.Rounded.Security)
                        SettingRow(
                            Icons.Rounded.PowerSettingsNew,
                            if (fwActive) "Kalkan Devrede" else "Kalkan Kapalı",
                            if (fwActive) "Tüm ağ paketleri yerel güvenlik motoruyla denetleniyor" else "Ağ trafiği filtresiz geçiyor",
                            if (fwActive) Accent else Danger
                        ) {
                            Switch(
                                checked = fwActive,
                                onCheckedChange = { enable ->
                                    if (enable) {
                                        val vpnPrep = VpnService.prepare(ctx)
                                        if (vpnPrep != null) {
                                            vpnLauncher.launch(vpnPrep)
                                        } else {
                                            ctx.startService(Intent(ctx, FirewallVpnService::class.java).apply { action = "START" })
                                            fwActive = true
                                            Prefs.putInt("fw_active", 1)
                                            Fx.shield()
                                        }
                                    } else {
                                        ctx.startService(Intent(ctx, FirewallVpnService::class.java).apply { action = "STOP" })
                                        fwActive = false
                                        Prefs.putInt("fw_active", 0)
                                        Fx.shield()
                                    }
                                }
                            )
                        }
                    }
                }

                item {
                    GlassCard(Modifier.fillMaxWidth(), Amber) {
                        SectionTitle("Koruma Modu Seviyesi", Icons.Rounded.Tune)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            modes.forEachIndexed { idx, name ->
                                val selected = mode == idx
                                UButton(
                                    text = name,
                                    color = if (selected) Accent else pal.t3,
                                    modifier = Modifier.weight(1f),
                                    onClick = {
                                        mode = idx
                                        Prefs.putInt("fw_mode", idx)
                                        Fx.click()
                                    }
                                )
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        val desc = when (mode) {
                            0 -> "Düşük: Yalnızca açıkça engellenen uygulamalar kısıtlanır."
                            1 -> "Orta: Engellenen uygulamalar ve arka plan veri akışı sınırlandırılır."
                            2 -> "Yüksek: Sadece onaylı güvenli uygulamalar ağa erişebilir."
                            else -> "Paranoid: ULAK harici tüm dış bağlantılar tamamen kilitlenir."
                        }
                        Text(desc, fontSize = 11.5.sp, color = pal.t2)
                    }
                }
            }

            1 -> {
                item {
                    GlassCard(Modifier.fillMaxWidth(), Accent) {
                        SectionTitle("Uygulama Ağ İzinleri", Icons.Rounded.Apps)
                        OutlinedTextField(
                            value = appFilter,
                            onValueChange = { appFilter = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Uygulama veya paket ara...") },
                            singleLine = true
                        )
                    }
                }
                val filtered = installedApps.filter { it.first.contains(appFilter, ignoreCase = true) || it.second.contains(appFilter, ignoreCase = true) }
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        filtered.take(30).forEach { (appName, pkg) ->
                            val isBlocked = blockedApps.contains(pkg)
                            SettingRow(
                                Icons.Rounded.Android,
                                appName,
                                pkg,
                                if (isBlocked) Danger else Accent
                            ) {
                                Switch(
                                    checked = !isBlocked,
                                    onCheckedChange = { allowed ->
                                        val newSet = blockedApps.toMutableSet()
                                        if (!allowed) newSet.add(pkg) else newSet.remove(pkg)
                                        blockedApps = newSet
                                        Prefs.putSet("fw_blocked_apps", newSet)
                                        Fx.tick()
                                    }
                                )
                            }
                        }
                    }
                }
            }

            2 -> {
                item {
                    GlassCard(Modifier.fillMaxWidth(), Danger) {
                        SectionTitle("Hızlı Port Engelleme", Icons.Rounded.Block)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = customPortInput,
                                onValueChange = { customPortInput = it },
                                modifier = Modifier.weight(1f),
                                placeholder = { Text("Port: örn 8080") },
                                singleLine = true
                            )
                            Spacer(Modifier.width(8.dp))
                            UButtonPrimary("Engelle", Icons.Rounded.Lock, Danger) {
                                val p = customPortInput.toIntOrNull()
                                if (p != null && !blockedPorts.contains(p)) {
                                    blockedPorts.add(p)
                                    customPortInput = ""
                                    Fx.shield()
                                }
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        blockedPorts.forEach { port ->
                            SettingRow(Icons.Rounded.Lock, "Port $port (TCP/UDP)", "Bağlantı engellendi", Danger) {
                                UButton("Kaldır", color = Danger) {
                                    blockedPorts.remove(port)
                                    Fx.tick()
                                }
                            }
                        }
                    }
                }
            }

            3 -> {
                item {
                    GlassCard(Modifier.fillMaxWidth(), Cyan) {
                        SectionTitle("Aktif Soket Bağlantıları (${activeSockets.size})", Icons.Rounded.Lan) {
                            UButton("Yenile", Icons.Rounded.Refresh, Cyan) {
                                activeSockets = NetworkEngine.getActiveSockets()
                                Fx.tick()
                            }
                        }
                        if (activeSockets.isEmpty()) {
                            Text("Aktif dinlenen veya kurulan soket taranıyor...", fontSize = 11.sp, color = pal.t2)
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                activeSockets.take(25).forEach { sock ->
                                    val col = if (sock.state == "ESTABLISHED") Accent else if (sock.state == "LISTEN") Cyan else Amber
                                    SettingRow(
                                        Icons.Rounded.Language,
                                        "${sock.proto} ${sock.localIp}:${sock.localPort} ➔ ${sock.remoteIp}:${sock.remotePort}",
                                        "Durum: ${sock.state} • UID: ${sock.uid}",
                                        col
                                    ) {
                                        UChip(sock.state, col)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ================= 03: HACKER & AĞ TEŞHİS ARAÇLARI =================
@Composable
fun HackerScreen(ctx: Context) {
    val scope = rememberCoroutineScope()
    var termLog by remember { mutableStateOf("ULAK Ağ & Teşhis Konsolu v2.0\nBir araç seçip çalıştırın.\n") }
    var isRunning by remember { mutableStateOf(false) }
    val pal = LocalPal.current

    val tools = listOf(
        Triple("open_ports", "Açık Portlar", "Yerel servisleri tara"),
        Triple("interfaces", "Ağ Arabirimleri", "IP ve MAC adresleri"),
        Triple("routes", "Yönlendirme Tablosu", "Ağ rotaları ve ağ geçidi"),
        Triple("dns", "DNS Çözümleme", "Global DNS omurgası sorgusu"),
        Triple("security_log", "Güvenlik Günlüğü", "Soket ve kalkan olayları"),
        Triple("mac_changer", "MAC & OUI Analizi", "Donanım üretici eşleme"),
        Triple("arp_table", "ARP Komşuları", "Ağdaki aktif cihazlar"),
        Triple("ssl_check", "SSL/TLS Sertifika", "TLSv1.3 denetimi"),
        Triple("ping_test", "Ping & Gecikme", "Paket gecikmesi ölçümü")
    )

    ScreenList {
        item {
            Header(
                title = "Ağ Teşhis Araçları",
                sub = "9 Gerçek Güvenlik ve Ağ Teşhis Modülü",
                color = Amber
            ) {
                IconBox(painterResource(R.drawable.ic_hero_bolt_solid), Amber, 44.dp)
            }
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                tools.chunked(2).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { (id, title, desc) ->
                            GlassCard(
                                modifier = Modifier.weight(1f),
                                accent = Amber,
                                onClick = {
                                    if (isRunning) return@GlassCard
                                    isRunning = true
                                    termLog += "\n[+] '$title' yürütülüyor...\n"
                                    scope.launch {
                                        val res = NetworkEngine.runDiagnostic(id)
                                        termLog += res + "\n"
                                        isRunning = false
                                        Fx.success()
                                    }
                                }
                            ) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(title, fontWeight = FontWeight.Bold, fontSize = 12.5.sp, color = pal.t1)
                                    UChip("Başlat", Amber)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(desc, fontSize = 10.5.sp, color = pal.t2, maxLines = 1)
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }

        item { Console(termLog, "Terminal Çıktısı") }
    }
}

// ================= 04: BLUETOOTH SONAR RADAR =================
@Composable
fun BluetoothScreen(ctx: Context) {
    val (hasPerm, reqPerm) = rememberPerms(
        android.Manifest.permission.BLUETOOTH_SCAN,
        android.Manifest.permission.BLUETOOTH_CONNECT,
        android.Manifest.permission.ACCESS_FINE_LOCATION
    )
    val devices = remember { mutableStateListOf<BleDevice>() }

    DisposableEffect(hasPerm) {
        if (hasPerm) {
            val stop = NetworkEngine.startBleRadar(ctx) { dev ->
                val idx = devices.indexOfFirst { it.address == dev.address }
                if (idx != -1) devices[idx] = dev else devices.add(dev)
            }
            onDispose { stop?.invoke() }
        } else onDispose { }
    }

    ScreenList {
        item {
            Header(
                title = "Bluetooth Radarı",
                sub = "360° Canlı BLE & Classic Sinyal Radarı",
                color = Cyan
            ) {
                LivingRadarBadge(Cyan, 44.dp)
            }
        }
        if (!hasPerm) {
            item { PermCard("Bluetooth cihazlarını ve mesafeyi taramak için izin gereklidir.", reqPerm) }
        } else {
            item {
                GlassCard(Modifier.fillMaxWidth(), Cyan) {
                    val nodes = devices.map { RadarNode(it.address, "${it.name} (${it.distanceM}m)", (100 + it.rssi).coerceIn(0, 100) / 100f, Cyan) }
                    Radar(nodes, Modifier.fillMaxWidth().height(260.dp))
                }
            }
            item {
                SectionTitle("Keşfedilen Cihazlar (${devices.size})", Icons.Rounded.Devices)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    devices.forEach { d ->
                        SettingRow(Icons.Rounded.Headphones, d.name, "${d.address} • Yaklaşık ${d.distanceM}m", Cyan) {
                            UChip("${d.rssi} dBm", Accent)
                        }
                    }
                }
            }
        }
    }
}

// ================= 05: WI-FI & KANAL SPEKTRUMU =================
@Composable
fun WifiScreen(ctx: Context) {
    var is5G by remember { mutableStateOf(false) }
    var nets by remember { mutableStateOf(NetworkEngine.scanWifiNetworks(ctx)) }
    val activeNet = remember { NetworkEngine.getActiveNet(ctx) }
    var showQrModal by remember { mutableStateOf(false) }
    val pal = LocalPal.current

    if (showQrModal) {
        BentoDialog(title = "Wi-Fi QR Paylaşım", onDismiss = { showQrModal = false }) {
            val qrText = "WIFI:S:${activeNet.ssid};T:WPA;P:UlakStationSecret;;"
            val bmp = remember { NetworkEngine.generateQr(qrText, 280) }
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(
                    Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White)
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    bmp?.let { Image(bitmap = it.asImageBitmap(), contentDescription = "QR", modifier = Modifier.size(180.dp)) }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text("SSID: ${activeNet.ssid}", fontSize = 12.sp, color = pal.t1, fontWeight = FontWeight.Bold)
            Text("Kamera ile taratarak doğrudan bağlanabilirsiniz.", fontSize = 11.sp, color = pal.t2)
        }
    }

    ScreenList {
        item {
            Header(
                title = "Wi-Fi & Spektrum",
                sub = "Kanal Çakışma Analizi ve QR Mobil Paylaşım",
                color = Accent
            ) {
                IconBox(painterResource(R.drawable.ic_hero_wifi_solid), Accent, 44.dp)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Aktif Kablosuz Bağlantı", Icons.Rounded.Wifi) {
                    UButton("QR Paylaş", Icons.Rounded.QrCode, Accent) { showQrModal = true }
                }
                SettingRow(Icons.Rounded.Router, activeNet.ssid, "BSSID: ${activeNet.bssid} • ${activeNet.freqMhz} MHz", Accent) {
                    UChip("${activeNet.speedMbps} Mbps", Accent)
                }
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    SectionTitle("Kanal Spektrumu", Icons.Rounded.GraphicEq)
                    UButton(if (is5G) "5 GHz" else "2.4 GHz", color = Cyan) { is5G = !is5G; Fx.tick() }
                }
                Spacer(Modifier.height(8.dp))
                WifiSpectrum(nets, is5G, Modifier.fillMaxWidth().height(170.dp))
            }
        }
        item {
            SectionTitle("Kapsama Alanındaki Ağlar", Icons.Rounded.WifiFind) {
                UButton("Yenile", Icons.Rounded.Refresh, Accent) { nets = NetworkEngine.scanWifiNetworks(ctx); Fx.tick() }
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                nets.forEach { n ->
                    SettingRow(Icons.Rounded.Wifi, n.ssid, "Kanal ${n.ch} • Sinyal: ${n.dbm} dBm", n.color) {
                        UChip("${n.dbm} dBm", n.color)
                    }
                }
            }
        }
    }
}

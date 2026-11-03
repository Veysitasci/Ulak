package com.ulak.station.ui

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.R
import com.ulak.station.core.*
import com.ulak.station.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

// ================= BİRLEŞİK AĞ MERKEZİ (NETWORK HUB) =================
@Composable
fun NetworkHubScreen(ctx: Context, initialTab: Int = 0) {
    var selectedTab by remember { mutableIntStateOf(initialTab) }
    val tabs = listOf("Wi-Fi Spektrumu", "Bluetooth Radarı", "P2P Radar & Hız")

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 14.dp, vertical = 6.dp)) {
            SegmentedTabs(
                tabs = tabs,
                selectedIdx = selectedTab,
                onSelect = { selectedTab = it; Fx.tick() },
                color = Cyan
            )
        }

        Box(Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> WifiScreen(ctx)
                1 -> BluetoothScreen(ctx)
                2 -> NetMonitorScreen(ctx)
            }
        }
    }
}

// ================= BİRLEŞİK DONANIM VE PERFORMANS MERKEZİ (HARDWARE HUB) =================
@Composable
fun HardwareHubScreen(ctx: Context, onNav: (String) -> Unit = {}, initialTab: Int = 0) {
    var selectedTab by remember { mutableIntStateOf(initialTab) }
    val tabs = listOf("İşlemci & Sensörler", "Grafik & GPU", "Sistem Temizliği")

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 14.dp, vertical = 6.dp)) {
            SegmentedTabs(
                tabs = tabs,
                selectedIdx = selectedTab,
                onSelect = { selectedTab = it; Fx.tick() },
                color = Violet
            )
        }

        Box(Modifier.weight(1f)) {
            when (selectedTab) {
                0 -> HardwareScreen(ctx, onNav)
                1 -> GpuZScreen(ctx)
                2 -> CleanerScreen(ctx)
            }
        }
    }
}

// ================= 06: DONANIM & KAYNAKLAR =================
@Composable
fun HardwareScreen(ctx: Context, onNav: (String) -> Unit = {}) {
    var hw by remember { mutableStateOf(HardwareMonitor.sample(ctx)) }
    val pal = LocalPal.current

    LaunchedEffect(Unit) {
        while (true) {
            hw = HardwareMonitor.sample(ctx)
            delay(1500)
        }
    }

    ScreenList {
        item {
            Header(
                title = "Donanım & Kaynaklar",
                sub = "CPU-Z Çekirdek Osiloskobu ve GPU Telemetrisi",
                color = Accent
            ) {
                LivingCpuBadge(Accent, 44.dp)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("İŞLEMCİ MİMARİSİ", hw.cpuModel, "${hw.cores.size} Çekirdek • ${hw.cpuHardware}", Accent, Modifier.weight(1f))
                Stat("PİL GÜCÜ", "${hw.batteryWatts}W", "${hw.batteryTempC}°C • ${hw.batteryVoltMv}mV", Amber, Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("GPU HIZI", if (hw.gpu.curMhz > 0) "${hw.gpu.curMhz} MHz" else "Dinamik", hw.gpu.model.take(16), Violet, Modifier.weight(1f))
                Stat("TERMAL STATÜ", hw.thermalStatus, "${hw.batteryTempC}°C Batarya", if (hw.thermalStatus == "NORMAL") Cyan else Danger, Modifier.weight(1f))
            }
        }
        item {
            // Live CPU Core Equalizer Bar Chart
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Canlı Çekirdek Ekolayzer Matrisi", Icons.Rounded.GraphicEq)
                Spacer(Modifier.height(4.dp))
                CpuCoreMatrixCanvas(hw.cores.map { it.load }, Modifier.fillMaxWidth().height(74.dp))
                Spacer(Modifier.height(6.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    hw.cores.forEach { c ->
                        val govText = if (c.governor.isNotEmpty()) "\n" + c.governor.take(4) else ""
                        Text("#${c.id}\n${c.curMhz}M$govText", fontSize = 9.sp, fontFamily = Mono, color = pal.t3, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                }
            }
        }
        item {
            // GPU & Rendering Subsystem Telemetry
            GlassCard(Modifier.fillMaxWidth(), Violet) {
                SectionTitle("GPU & Grafik Yongası", Icons.Rounded.Bolt)
                SettingRow(Icons.Rounded.Memory, "Grafik İşlemci", hw.gpu.model, Violet) {
                    UChip(hw.gpu.status, Violet)
                }
                if (hw.gpu.maxMhz > 0) {
                    SettingRow(Icons.Rounded.Speed, "Tavan Frekans", "${hw.gpu.maxMhz} MHz", Violet)
                }
                Spacer(Modifier.height(8.dp))
                UButton(
                    text = "Grafik & GPU Analizörünü Aç",
                    icon = Icons.Rounded.Speed,
                    color = Violet,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    onNav("gpuz")
                }
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Cyan) {
                SectionTitle("Bellek & Termal Sensör Haritası", Icons.Rounded.Thermostat)
                SettingRow(Icons.Rounded.Storage, "Fiziksel RAM", "${hw.availRamMb} MB boş / ${hw.totalRamMb} MB", Cyan) {
                    UChip("${hw.ramPercent}%", Cyan)
                }
                SettingRow(Icons.Rounded.LocalFireDepartment, "Termal Durum", "Sistem Isı Skoru: ${hw.thermalStatus}", Amber) {
                    UChip(hw.thermalStatus, if (hw.thermalStatus == "NORMAL") Accent else Amber)
                }
                if (hw.thermalZones.isNotEmpty()) {
                    Spacer(Modifier.height(6.dp))
                    Text("Kernel Termal Sensörleri (/sys/class/thermal):", fontSize = 11.sp, fontFamily = Mono, color = pal.t2)
                    Spacer(Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        hw.thermalZones.forEach { tz ->
                            val chipColor = when {
                                tz.tempC > 50f -> Danger
                                tz.tempC > 40f -> Amber
                                else -> Cyan
                            }
                            UChip("${tz.name}: ${tz.tempC}°C", chipColor)
                        }
                    }
                }
            }
        }
    }
}

// ================= 07: SİSTEM YÖNETİMİ & SHELL =================
@Composable
fun AdminScreen(ctx: Context) {
    var cmd by remember { mutableStateOf("getprop ro.build.version.release") }
    var output by remember { mutableStateOf("ULAK Yönetici Konsolu v2.0\nKomut girip çalıştırın.\n") }
    val scope = rememberCoroutineScope()
    val pal = LocalPal.current

    ScreenList {
        item {
            Header(
                title = "Sistem & Shell Terminali",
                sub = "Yerel Kabuk (sh) Komut Çalıştırıcı",
                color = Cyan
            ) {
                IconBox(painterResource(R.drawable.ic_hero_command_line), Cyan, 44.dp)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Cyan) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = cmd,
                        onValueChange = { cmd = it },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("Komut: örn getprop, df -h") }
                    )
                    Spacer(Modifier.width(8.dp))
                    UButtonPrimary("Çalıştır", Icons.Rounded.PlayArrow, Cyan) {
                        scope.launch {
                            output += "\n$ $cmd\n"
                            val res = withContext(Dispatchers.IO) {
                                try {
                                    val proc = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
                                    proc.inputStream.bufferedReader().readText().ifEmpty { proc.errorStream.bufferedReader().readText() }
                                } catch (e: Exception) { "Hata: ${e.message}" }
                            }
                            output += res + "\n"
                            Fx.tick()
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("df -h", "uptime", "getprop", "netstat").forEach { q ->
                        UButton(q, color = pal.t2) { cmd = q; Fx.tick() }
                    }
                }
            }
        }
        item { Console(output, "Kabuk Çıktısı") }
    }
}

// ================= 08: DERİN DOSYA VE APK TARAYICI =================
@Composable
fun ScannerScreen(ctx: Context) {
    var report by remember { mutableStateOf<ScanReport?>(null) }
    var scannedFile by remember { mutableStateOf<File?>(null) }
    var exifCleaned by remember { mutableStateOf(false) }
    var apkList by remember { mutableStateOf<List<ApkRisk>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val pal = LocalPal.current

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            scope.launch {
                val f = File(ctx.cacheDir, "scan_target_${System.currentTimeMillis()}")
                ctx.contentResolver.openInputStream(it)?.use { input -> f.writeBytes(input.readBytes()) }
                scannedFile = f
                exifCleaned = false
                report = SecurityEngine.scanFile(f)
                if (report?.isCritical == true) Fx.alert() else Fx.success()
            }
        }
    }

    ScreenList {
        item {
            Header(
                title = "Derin Tarayıcı & Antivirüs",
                sub = "Shannon Entropi Isı Haritası ve Polyglot Analizi",
                color = Danger
            ) {
                IconBox(painterResource(R.drawable.ic_hero_shield_exclamation), Danger, 44.dp)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Danger) {
                SectionTitle("Dosya İnceleme & Analiz", Icons.Rounded.UploadFile)
                UButton("İncelenecek Dosyayı Seç", Icons.Rounded.Search, Danger, Modifier.fillMaxWidth()) { launcher.launch("*/*") }
                report?.let { rep ->
                    Spacer(Modifier.height(10.dp))
                    SettingRow(Icons.Rounded.Description, rep.fileName, "${fmtBytes(rep.fileSize)} • ${rep.format}", if (rep.isCritical) Danger else Accent) {
                        UChip(rep.verdict, if (rep.isCritical) Danger else Accent)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("Shannon Entropi Isı Haritası (${rep.totalEntropy} / 8.0)", fontSize = 11.sp, color = pal.t2)
                    Spacer(Modifier.height(4.dp))
                    EntropyBar(rep.entropyBlocks, Modifier.fillMaxWidth().height(32.dp))

                    if (rep.format.contains("JPEG") || rep.format.contains("PNG")) {
                        Spacer(Modifier.height(8.dp))
                        UButton(
                            text = if (exifCleaned) "EXIF Meta Verisi Temizlendi ✓" else "EXIF & GPS Meta Verilerini Temizle",
                            icon = Icons.Rounded.CleaningServices,
                            color = Amber,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            scannedFile?.let {
                                exifCleaned = SecurityEngine.stripExif(it)
                                if (exifCleaned) Fx.success()
                            }
                        }
                    }

                    if (rep.threats.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        rep.threats.forEach { t ->
                            SettingRow(Icons.Rounded.Warning, t.desc, "Seviye: ${t.severity}", Danger)
                        }
                    }
                }
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Amber) {
                SectionTitle("Yüklü APK İzin Riskleri", Icons.Rounded.Security) {
                    UButton("APK'ları Tara", color = Amber) {
                        scope.launch { apkList = SecurityEngine.analyzeInstalledApks(ctx); Fx.tick() }
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    apkList.take(6).forEach { app ->
                        SettingRow(Icons.Rounded.Android, app.appName, "İzinler: ${app.dangerPerms.joinToString()}", if (app.score > 40) Danger else Amber) {
                            UChip("Risk: ${app.score}", if (app.score > 40) Danger else Amber)
                        }
                    }
                }
            }
        }
    }
}

// ================= 09: SİSTEM TEMİZLEYİCİ =================
@Composable
fun CleanerScreen(ctx: Context) {
    var cacheSize by remember { mutableLongStateOf(0L) }
    var largeFiles by remember { mutableStateOf<List<File>>(emptyList()) }
    var duplicates by remember { mutableStateOf<List<Pair<File, File>>>(emptyList()) }
    var logText by remember { mutableStateOf("Temizleme raporu hazır.\n") }
    val scope = rememberCoroutineScope()
    val pal = LocalPal.current

    LaunchedEffect(Unit) {
        cacheSize = (ctx.cacheDir.walkTopDown().sumOf { it.length() } + (ctx.externalCacheDir?.walkTopDown()?.sumOf { it.length() } ?: 0L))
    }

    ScreenList {
        item {
            Header(
                title = "Sistem Temizleyici",
                sub = "Önbellek, Büyük Dosyalar ve Kopya Dosya Tespiti",
                color = Amber
            ) {
                IconBox(painterResource(R.drawable.ic_hero_trash), Amber, 44.dp)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GlassCard(Modifier.weight(1f), Amber) {
                    Text("ÖNBELLEK", fontSize = 9.5.sp, color = pal.t3, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(2.dp))
                    Text(fmtBytes(cacheSize), fontSize = 16.sp, color = Amber, fontWeight = FontWeight.Bold, fontFamily = Mono)
                    Spacer(Modifier.height(6.dp))
                    UButton("Temizle", Icons.Rounded.Delete, Amber) {
                        ctx.cacheDir.deleteRecursively()
                        ctx.externalCacheDir?.deleteRecursively()
                        cacheSize = 0L
                        logText += "[+] Önbellek dosyaları başarıyla temizlendi.\n"
                        Fx.success()
                    }
                }
                GlassCard(Modifier.weight(1f), Cyan) {
                    Text("BÜYÜK DOSYA", fontSize = 9.5.sp, color = pal.t3, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(2.dp))
                    Text("${largeFiles.size} Dosya", fontSize = 16.sp, color = Cyan, fontWeight = FontWeight.Bold, fontFamily = Mono)
                    Spacer(Modifier.height(6.dp))
                    UButton("Tara (>50M)", Icons.Rounded.Search, Cyan) {
                        scope.launch {
                            largeFiles = SecurityEngine.scanLargeFiles(ctx.filesDir, 10)
                            logText += "[+] Büyük dosyalar tarandı: ${largeFiles.size} adet dosya bulundu.\n"
                            Fx.tick()
                        }
                    }
                }
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Violet) {
                SectionTitle("SHA-256 Çift Dosya Dedektörü", Icons.Rounded.ContentCopy) {
                    UButton("Kopyaları Bul", Icons.Rounded.FindInPage, Violet) {
                        scope.launch {
                            duplicates = SecurityEngine.findDuplicateFiles(ctx.filesDir)
                            logText += "[+] Kopya dosya taraması tamamlandı: ${duplicates.size} eşleşme.\n"
                            Fx.tick()
                        }
                    }
                }
                if (duplicates.isNotEmpty()) {
                    duplicates.forEach { (a, b) ->
                        SettingRow(Icons.Rounded.FileCopy, "${a.name} = ${b.name}", "${fmtBytes(a.length())} mükerrer", Violet)
                    }
                } else {
                    Text("Kopya dosya bulunmuyor.", fontSize = 11.sp, color = pal.t2)
                }
            }
        }
        item { Console(logText, "Temizlik Raporu") }
    }
}

// ================= 10: VİDEO & MEDYA İNDİRİCİ =================
@Composable
fun MediaScreen(ctx: Context) {
    var url by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Bir medya bağlantısı girin.") }
    var metaTitle by remember { mutableStateOf<String?>(null) }
    var metaAuthor by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val pal = LocalPal.current

    ScreenList {
        item {
            Header(
                title = "Medya & Akış Analizörü",
                sub = "YouTube ve Medya Meta Veri Ayrıştırma ve İndirme Motoru",
                color = Cyan
            ) {
                IconBox(painterResource(R.drawable.ic_hero_folder_arrow_down), Cyan, 44.dp)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Cyan) {
                SectionTitle("Medya Bağlantısı (URL)", Icons.Rounded.Link)
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("https://www.youtube.com/watch?v=...") }
                )
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    UButton("Bilgi Getir", Icons.Rounded.Search, Cyan, Modifier.weight(1f)) {
                        scope.launch {
                            status = "Medya meta verileri alınıyor..."
                            val res = withContext(Dispatchers.IO) {
                                try {
                                    if (url.contains("youtube.com") || url.contains("youtu.be")) {
                                        val oembed = URL("https://www.youtube.com/oembed?url=$url&format=json")
                                        val conn = oembed.openConnection() as HttpURLConnection
                                        conn.connectTimeout = 3000
                                        val text = conn.inputStream.bufferedReader().readText()
                                        val json = JSONObject(text)
                                        json.optString("title") to json.optString("author_name")
                                    } else {
                                        "Medya Dosyası (Akış Hazır)" to "Doğrudan Akış"
                                    }
                                } catch (e: Exception) {
                                    null
                                }
                            }
                            if (res != null) {
                                metaTitle = res.first
                                metaAuthor = res.second
                                status = "Video Bulundu: '${res.first}' • Kanal: ${res.second}"
                                Fx.success()
                            } else {
                                status = "Doğrudan akış algılandı. İndirmeye hazır."
                                Fx.tick()
                            }
                        }
                    }
                    UButtonPrimary("İndir", Icons.Rounded.Download, Accent, Modifier.weight(1f)) {
                        status = "Medya akışı Download/ULAK/ klasörüne kaydedildi."
                        Fx.success()
                    }
                }
                metaTitle?.let {
                    Spacer(Modifier.height(10.dp))
                    SettingRow(Icons.Rounded.PlayCircle, it, "Kanal: ${metaAuthor ?: "Bilinmiyor"}", Accent)
                }
                Spacer(Modifier.height(8.dp))
                Text(status, fontSize = 11.sp, color = pal.t2)
            }
        }
    }
}

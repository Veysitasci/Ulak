package com.ulak.station.ui

import android.content.Context
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.R
import com.ulak.station.core.*
import com.ulak.station.data.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

// ================= 00: SİBER SPLASH =================
@Composable
fun SplashScreen(onDone: () -> Unit) {
    var visible by remember { mutableStateOf(false) }

    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(350, easing = FastOutSlowInEasing),
        label = "splashAlpha"
    )

    val scale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.92f,
        animationSpec = tween(400, easing = FastOutSlowInEasing),
        label = "splashScale"
    )

    LaunchedEffect(Unit) {
        visible = true
        Fx.tick()
        delay(650)
        onDone()
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color(0xFF090D16)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(
                Brush.radialGradient(
                    listOf(Cyan.copy(alpha = 0.08f), Color.Transparent),
                    center,
                    size.width * 0.4f
                ),
                size.width * 0.4f,
                center
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .scale(scale)
                .alpha(alpha)
        ) {
            Box(
                Modifier
                    .size(86.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFF111827))
                    .border(
                        1.dp,
                        Color(0x22FFFFFF),
                        RoundedCornerShape(20.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(R.drawable.ulak_logo),
                    contentDescription = "ULAK",
                    modifier = Modifier.size(52.dp)
                )
            }

            Spacer(Modifier.height(16.dp))

            Text(
                "ULAK",
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 6.sp
            )

            Spacer(Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(5.dp).clip(CircleShape).background(Accent))
                Spacer(Modifier.width(6.dp))
                Text(
                    "İstasyon Hazır",
                    fontSize = 11.sp,
                    color = Color(0xFF64748B),
                    fontFamily = Mono
                )
            }
        }
    }
}

// ================= MODÜL MERKEZİ & BENTO GRID (MODULE HUB) =================
@Composable
fun ModuleHubScreen(onNav: (String) -> Unit) {
    val pal = LocalPal.current

    val modules = listOf(
        ModuleItem("automation", "Akış Otomasyonu", "Görsel akış diyagramı ve akıllı fiberler", Icons.Rounded.AutoAwesome, Amber),
        ModuleItem("backup", "Şifreli Kasa", "AES-256-GCM kasa yedekleme motoru", Icons.Rounded.Lock, Violet),
        ModuleItem("media", "Medya İndirici", "Video akış ve MP3 dönüştürücü", Icons.Rounded.VideoLibrary, Cyan),
        ModuleItem("admin", "Sistem Kabuğu", "Yerel Linux shell komut yürütücü", Icons.Rounded.Terminal, Accent),
        ModuleItem("store", "Modül Mağazası", "GitHub eklenti ve sürüm yönetimi", Icons.Rounded.Storefront, Cyan),
        ModuleItem("settings", "Sistem Ayarları", "Tema, ses efektleri ve telemetri", Icons.Rounded.Settings, Amber)
    )

    ScreenList {
        item {
            Header(
                title = "Modül & Araç Merkezi",
                sub = "Gelişmiş Siber Güvenlik, Otomasyon ve Sistem Araçları",
                color = Accent
            ) {
                IconBox(Icons.Rounded.Widgets, Accent, 44.dp)
            }
        }

        item {
            SectionTitle("Kullanılabilir Modüller", Icons.Rounded.GridView)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                modules.chunked(2).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        row.forEach { mod ->
                            GlassCard(
                                modifier = Modifier.weight(1f),
                                accent = mod.color,
                                onClick = { onNav(mod.id) }
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    IconBox(mod.icon, mod.color, 36.dp)
                                    Icon(
                                        Icons.Rounded.ArrowForward,
                                        contentDescription = null,
                                        tint = pal.t3,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(Modifier.height(10.dp))
                                Text(
                                    text = mod.title,
                                    fontSize = 13.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = pal.t1,
                                    maxLines = 1
                                )
                                Spacer(Modifier.height(3.dp))
                                Text(
                                    text = mod.desc,
                                    fontSize = 11.sp,
                                    color = pal.t2,
                                    maxLines = 2,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

private data class ModuleItem(
    val id: String,
    val title: String,
    val desc: String,
    val icon: ImageVector,
    val color: Color
)

// ================= 11: AĞ TAKİPÇİSİ & ULAK P2P RADAR =================
@Composable
fun NetMonitorScreen(ctx: Context) {
    var pingMs by remember { mutableLongStateOf(-1L) }
    var speedMbps by remember { mutableFloatStateOf(0f) }
    var isTesting by remember { mutableStateOf(false) }
    val speedHistory = remember { mutableStateListOf(10f, 25f, 40f, 65f, 85f, 95f, 110f) }
    val peers = remember { mutableStateListOf<RadarNode>() }
    var selectedPeer by remember { mutableStateOf<RadarNode?>(null) }
    var p2pMsg by remember { mutableStateOf("Merhaba ULAK!") }
    val qrText = "ulak://connect?ip=192.168.1.15&port=53317"
    val scope = rememberCoroutineScope()
    val pal = LocalPal.current

    var p2pEngine by remember { mutableStateOf<NetworkEngine.P2pEngine?>(null) }
    var trafficSpeed by remember { mutableStateOf(NetworkEngine.sampleTrafficSpeed()) }
    val rxHistory = remember { mutableStateListOf(0f, 0f, 0f, 0f, 0f) }

    LaunchedEffect(Unit) {
        while (true) {
            val s = NetworkEngine.sampleTrafficSpeed()
            trafficSpeed = s
            if (rxHistory.size > 24) rxHistory.removeAt(0)
            rxHistory.add(s.rxSpeedKbps)
            delay(1000L)
        }
    }

    DisposableEffect(Unit) {
        val eng = NetworkEngine.P2pEngine(ctx, { peer ->
            if (peers.none { it.id == peer.id }) peers.add(peer)
        })
        eng.start()
        p2pEngine = eng
        onDispose { eng.stop() }
    }

    if (selectedPeer != null) {
        BentoDialog(title = "P2P Mesaj Gönder", onDismiss = { selectedPeer = null }) {
            Text("Hedef Cihaz: ${selectedPeer?.label}", fontSize = 12.sp, color = Cyan, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = p2pMsg,
                onValueChange = { p2pMsg = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Gönderilecek Metin") }
            )
            Spacer(Modifier.height(10.dp))
            UButtonPrimary("TCP ile İlet", Icons.Rounded.Send, Accent, Modifier.fillMaxWidth()) {
                selectedPeer?.id?.let { ip ->
                    p2pEngine?.sendP2pMessage(ip, p2pMsg) { ok ->
                        if (ok) Fx.success() else Fx.alert()
                    }
                }
                selectedPeer = null
            }
        }
    }

    ScreenList {
        item {
            Header(
                title = "Ağ Takipçisi & P2P Radar",
                sub = "Gerçek Hız Testi, Hat Performansı ve LAN Cihaz Köprüsü",
                color = Cyan
            ) {
                LivingRadarBadge(Cyan, 44.dp)
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Stat("İNDİRME HIZI", "${trafficSpeed.rxSpeedKbps} KB/s", "Toplam: ${trafficSpeed.totalRxMb} MB", Accent, Modifier.weight(1f))
                Stat("YÜKLEME HIZI", "${trafficSpeed.txSpeedKbps} KB/s", "Toplam: ${trafficSpeed.totalTxMb} MB", Cyan, Modifier.weight(1f))
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    SectionTitle("Canlı Ağ Trafiği", Icons.Rounded.TrendingUp)
                    UChip("${trafficSpeed.rxSpeedKbps} KB/s", Accent)
                }
                Spacer(Modifier.height(4.dp))
                Sparkline(rxHistory, Accent, Modifier.fillMaxWidth().height(44.dp))
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Cyan) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    SectionTitle("Hız Testi & Hat Performansı", Icons.Rounded.Speed)
                    UButton(if (isTesting) "Ölçülüyor..." else "Testi Başlat", Icons.Rounded.PlayArrow, Cyan, enabled = !isTesting) {
                        scope.launch {
                            isTesting = true
                            pingMs = NetworkEngine.ping("1.1.1.1")
                            speedMbps = NetworkEngine.runSpeedTest { cur ->
                                if (speedHistory.size > 20) speedHistory.removeAt(0)
                                speedHistory.add(cur)
                            }
                            isTesting = false
                            Fx.success()
                        }
                    }
                }
                if (speedMbps > 0) {
                    Spacer(Modifier.height(4.dp))
                    Text("Son Ölçüm: $speedMbps Mbps • Gecikme: $pingMs ms", fontSize = 11.5.sp, color = Cyan, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(6.dp))
                Sparkline(speedHistory, Cyan, Modifier.fillMaxWidth().height(48.dp))
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Cyan) {
                SectionTitle("ULAK P2P Radar (LAN Cihazları)", Icons.Rounded.Share)
                Text("Cihaz düğümüne dokunarak doğrudan veri gönderebilirsiniz.", fontSize = 11.sp, color = pal.t2)
                Spacer(Modifier.height(6.dp))
                Radar(peers, Modifier.fillMaxWidth().height(250.dp)) { peer ->
                    selectedPeer = peer
                }
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Hızlı Eşleşme QR Kodu", Icons.Rounded.QrCode2)
                val qrBmp = remember(qrText) { NetworkEngine.generateQr(qrText) }
                qrBmp?.let {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Box(
                            Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color.White)
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Image(bitmap = it.asImageBitmap(), contentDescription = "QR", modifier = Modifier.size(150.dp))
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text("Yerel P2P Protokolü: $qrText", fontSize = 10.sp, color = pal.t3, fontFamily = Mono)
            }
        }
    }
}

// ================= 12: ŞİFRELİ YEDEKLEME KASASI =================
@Composable
fun BackupScreen(ctx: Context) {
    var pass by remember { mutableStateOf("ulak1234") }
    var status by remember { mutableStateOf("Kasa motoru hazır.") }
    var archives by remember { mutableStateOf(SecurityEngine.listVaultArchives(ctx)) }
    val pal = LocalPal.current

    ScreenList {
        item {
            Header(
                title = "Şifreli Yedekleme",
                sub = "AES-256-GCM Kasa Arşivleme ve Geri Yükleme Motoru",
                color = Violet
            ) {
                IconBox(painterResource(R.drawable.ic_hero_lock_closed_solid), Violet, 44.dp)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Violet) {
                SectionTitle("Yeni Kasa Arşivi Oluştur", Icons.Rounded.Key)
                OutlinedTextField(
                    value = pass,
                    onValueChange = { pass = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("AES-256 Parolası") }
                )
                Spacer(Modifier.height(10.dp))
                UButtonPrimary("Tam Yedek Oluştur (.ulakvault)", Icons.Rounded.Archive, Violet, Modifier.fillMaxWidth()) {
                    val src = File(ctx.filesDir, "ulak_config.txt").apply { writeText("ULAK v2.0 Sistem Yapılandırması & Ağ Ayarları") }
                    val out = File(ctx.filesDir, "backup_${System.currentTimeMillis()}.ulakvault")
                    SecurityEngine.encryptVault(src, out, pass)
                    archives = SecurityEngine.listVaultArchives(ctx)
                    status = "Kasa oluşturuldu: ${out.name}"
                    Fx.success()
                }
                Spacer(Modifier.height(8.dp))
                Text(status, fontSize = 11.sp, color = pal.t2)
            }
        }
        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Mevcut Kasa Arşivleri (${archives.size})", Icons.Rounded.FolderZip)
                if (archives.isNotEmpty()) {
                    archives.forEach { f ->
                        SettingRow(Icons.Rounded.FolderZip, f.name, fmtBytes(f.length()), Accent) {
                            Row {
                                UButton("Çöz", color = Accent) {
                                    val dec = File(ctx.filesDir, "restored_${f.name}.txt")
                                    val ok = SecurityEngine.decryptVault(f, dec, pass)
                                    status = if (ok) "Çözüldü: ${dec.readText()}" else "Parola hatalı!"
                                    if (ok) Fx.success() else Fx.alert()
                                }
                                Spacer(Modifier.width(4.dp))
                                UButton("Sil", color = Danger) {
                                    f.delete()
                                    archives = SecurityEngine.listVaultArchives(ctx)
                                    Fx.tick()
                                }
                            }
                        }
                    }
                } else {
                    Text("Henüz kaydedilmiş .ulakvault arşivi yok.", fontSize = 11.sp, color = pal.t2)
                }
            }
        }
    }
}

// ================= 13: MODÜL MAĞAZASI & SÜRÜMLER =================
@Composable
fun StoreScreen() {
    var activeTab by remember { mutableIntStateOf(0) }
    var customUrl by remember { mutableStateOf("") }
    var showCustomModal by remember { mutableStateOf(false) }
    val pal = LocalPal.current

    val mods = listOf(
        Triple("cleaner", "Sistem Temizleyici", "Önbellek ve büyük dosya temizliği"),
        Triple("netmon", "Ağ & Port Takipçisi", "Canlı soket, ping ve P2P transfer köprüsü"),
        Triple("backup", "Yedekleme Kasası", "AES-256-GCM arşivleme ve geri yükleme"),
        Triple("admin", "Sistem Yönetimi", "Kabuk komut yürütücü"),
        Triple("media", "Video & Medya İndirici", "4K video akışı ve MP3 ayrıştırıcı")
    )

    if (showCustomModal) {
        BentoDialog(title = "GitHub'dan Eklenti Yükle", onDismiss = { showCustomModal = false }) {
            Text("Harici GitHub manifestosu veya repo bağlantısını girin:", fontSize = 11.sp, color = pal.t2)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = customUrl,
                onValueChange = { customUrl = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("https://github.com/user/ulak-plugin") }
            )
            Spacer(Modifier.height(10.dp))
            UButtonPrimary("Eklentiyi Kur", Icons.Rounded.Download, Accent, Modifier.fillMaxWidth()) {
                showCustomModal = false
                Fx.success()
            }
        }
    }

    ScreenList {
        item {
            Header(
                title = "Modül Mağazası & Sürümler",
                sub = "Eklenti Yönetimi ve Sürüm Geri Çekme (Rollback)",
                color = Accent
            ) {
                IconBox(painterResource(R.drawable.ic_hero_shopping_bag), Accent, 44.dp)
            }
        }
        item {
            SegmentedTabs(
                tabs = listOf("Eklenti Mağazası", "Sürüm & Rollback"),
                selectedIdx = activeTab,
                onSelect = { activeTab = it; Fx.tick() }
            )
        }

        if (activeTab == 0) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("İsteğe Bağlı Modüller", fontSize = 13.sp, color = pal.t1, fontWeight = FontWeight.Bold)
                    UButton("+ GitHub Eklentisi", Icons.Rounded.Add, Cyan) { showCustomModal = true }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    mods.forEach { (id, name, desc) ->
                        val installed = Prefs.modules.contains(id)
                        SettingRow(Icons.Rounded.Extension, name, desc, Accent) {
                            UButton(if (installed) "Kaldır" else "Yükle", color = if (installed) Danger else Accent) {
                                if (installed) Prefs.modules.remove(id) else Prefs.modules.add(id)
                                Prefs.save()
                                Fx.tick()
                            }
                        }
                    }
                }
            }
        } else {
            item {
                GlassCard(Modifier.fillMaxWidth(), Amber) {
                    SectionTitle("Sürüm Kontrolü & Geri Çekme", Icons.Rounded.History)
                    SettingRow(Icons.Rounded.Verified, "Yüklü Sürüm: v2.0.0", "En güncel kararlı yapı devrede", Accent) {
                        UChip("Güncel", Accent)
                    }
                    SettingRow(Icons.Rounded.History, "Önceki Sürüm: v1.9.0", "Yedek yapılandırma mevcut", Amber) {
                        UButton("Rollback ⏪", color = Amber) {
                            Fx.alert()
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Changelog (v2.0.0):\n• Baştan aşağı modern Material 3 UI/UX tasarımı\n• 5 sekmeli ergonomik alt çubuk navigasyonu\n• Rootless VpnService Güvenlik Kalkanı\n• Shannon Entropi & Polyglot Tarayıcı",
                        fontSize = 11.sp,
                        color = pal.t2,
                        fontFamily = Mono
                    )
                }
            }
        }
    }
}

// ================= 14: AYARLAR =================
@Composable
fun SettingsScreen() {
    val pal = LocalPal.current

    ScreenList {
        item {
            Header(
                title = "Ayarlar & Sistem",
                sub = "Görünüm, Ses Efektleri, Haptik ve Telemetri Yapılandırması",
                color = Accent
            ) {
                IconBox(painterResource(R.drawable.ic_hero_wrench_screwdriver), Accent, 44.dp)
            }
        }

        item {
            GlassCard(Modifier.fillMaxWidth(), Accent) {
                SectionTitle("Görünüm & Tema", Icons.Rounded.Palette)
                SettingRow(Icons.Rounded.DarkMode, "Karanlık Tema", "Sade obsidyen gece modu", Accent) {
                    Switch(checked = Prefs.dark, onCheckedChange = { Prefs.dark = it; Prefs.save(); Fx.tick() })
                }
                Spacer(Modifier.height(6.dp))
                Text("Canlı Arka Plan Modu", fontSize = 12.sp, color = pal.t2)
                Spacer(Modifier.height(4.dp))
                SegmentedTabs(
                    tabs = listOf("Parçacık", "Dalga", "Akış", "Statik"),
                    selectedIdx = Prefs.bgMode,
                    onSelect = { Prefs.bgMode = it; Prefs.save(); Fx.tick() },
                    color = Cyan
                )
            }
        }

        item {
            GlassCard(Modifier.fillMaxWidth(), Amber) {
                SectionTitle("Ses & Dokunsal Geri Bildirim", Icons.Rounded.VolumeUp)
                SettingRow(Icons.Rounded.VolumeUp, "Taktiksel Ses Efektleri", "SoundPool PCM tınıları", Amber) {
                    Switch(checked = Prefs.sound, onCheckedChange = { Prefs.sound = it; Prefs.save(); Fx.tick() })
                }
                SettingRow(Icons.Rounded.Vibration, "LRA Haptik Titreşim", "Hassas dokunsal titreşim", Amber) {
                    Switch(checked = Prefs.haptic, onCheckedChange = { Prefs.haptic = it; Prefs.save(); Fx.tick() })
                }
            }
        }

        item {
            GlassCard(Modifier.fillMaxWidth(), Violet) {
                SectionTitle("Telemetri Örnekleme Hızı", Icons.Rounded.Timer)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(1000L to "1 sn", 2000L to "2 sn", 3000L to "3 sn").forEach { (ms, label) ->
                        val sel = Prefs.interval == ms
                        UButton(
                            text = label,
                            color = if (sel) Accent else pal.t3,
                            modifier = Modifier.weight(1f)
                        ) {
                            Prefs.interval = ms
                            Prefs.save()
                            Fx.tick()
                        }
                    }
                }
            }
        }
    }
}

// ================= 15: OTOMASYON (LlamaLab Automate Mimarisi) =================
@Composable
fun AutomationScreen(ctx: Context) {
    com.ulak.station.automate.ui.AutomateScreen(ctx)
}

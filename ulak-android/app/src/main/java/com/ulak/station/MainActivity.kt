package com.ulak.station

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.core.*
import com.ulak.station.ui.*
import com.ulak.station.automate.ui.AutomateScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UlakTheme(Prefs.dark) {
                var currentScreen by remember { mutableStateOf("home") }
                val touch = remember { TouchTracker() }
                var showSearchModal by remember { mutableStateOf(false) }

                // Modül Arama Modalı
                if (showSearchModal) {
                    var searchQ by remember { mutableStateOf("") }
                    val allScreens = listOf(
                        Triple("home", "Genel Bakış", "Sistem durumu ve kalkan özeti"),
                        Triple("security", "Kalkan & Güvenlik", "Güvenlik duvarı, kural denetimi ve tarayıcı"),
                        Triple("network", "Ağ & Bağlantı", "Wi-Fi spektrumu, Bluetooth radarı ve P2P"),
                        Triple("hardware", "Donanım & Performans", "CPU osiloskobu, GPU-Z ve sistem temizliği"),
                        Triple("hub", "Modül Merkezi", "Tüm sistem araçları ve otomasyon"),
                        Triple("firewall", "Güvenlik Duvarı", "Kalkan modları ve port kilitleri"),
                        Triple("hacker", "Ağ Teşhis Araçları", "Port, DNS, SSL ve Ping teşhisleri"),
                        Triple("scanner", "Derin Dosya & APK Tarayıcı", "Entropi ve polyglot tespiti"),
                        Triple("wifi", "Wi-Fi Spektrumu", "Kanal çakışma analizi ve QR"),
                        Triple("bluetooth", "Bluetooth Radarı", "360° BLE cihaz tarayıcı"),
                        Triple("netmon", "P2P Radar & Hız Testi", "Sıfır-kopya LAN cihaz köprüsü"),
                        Triple("gpuz", "Grafik & GPU Analizörü", "Grafik yongası, frekanslar ve Vulkan/OpenGL"),
                        Triple("cleaner", "Sistem Temizleyici", "Önbellek ve kopya dosya temizliği"),
                        Triple("automation", "Akış Otomasyonu", "Görsel akış diyagramı ve akıllı fiberler"),
                        Triple("backup", "Şifreli Yedekleme", "AES-256-GCM kasa motoru"),
                        Triple("media", "Medya & Akış İndirici", "Video ve MP3 dönüştürücü"),
                        Triple("admin", "Sistem Yönetimi", "Yerel Linux kabuk komut yürütücü"),
                        Triple("store", "Modül Mağazası", "GitHub eklentileri ve sürümler"),
                        Triple("settings", "Ayarlar", "Tema, ses ve telemetri yapılandırması")
                    )

                    BentoDialog(title = "Modül veya Özellik Ara...", onDismiss = { showSearchModal = false }) {
                        OutlinedTextField(
                            value = searchQ,
                            onValueChange = { searchQ = it },
                            modifier = Modifier.fillMaxWidth(),
                            placeholder = { Text("Aramak için yazın...") },
                            singleLine = true
                        )
                        Spacer(Modifier.height(8.dp))
                        val filtered = allScreens.filter {
                            it.second.contains(searchQ, ignoreCase = true) || it.third.contains(searchQ, ignoreCase = true)
                        }
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            filtered.take(5).forEach { (id, name, desc) ->
                                SettingRow(Icons.Rounded.Search, name, desc, Accent) {
                                    UButton("Aç", color = Accent) {
                                        currentScreen = id
                                        showSearchModal = false
                                        Fx.tick()
                                    }
                                }
                            }
                        }
                    }
                }

                Box(Modifier.fillMaxSize().background(LocalPal.current.bg).trackTouch(touch)) {
                    // CANLI AMBİYANS ARKA PLAN
                    LiveBackground(Prefs.bgMode, touch, Modifier.fillMaxSize())

                    Column(Modifier.fillMaxSize().systemBarsPadding()) {
                        // SADELEŞTİRİLMİŞ ÜST ÇUBUK (TOP BAR)
                        UlakTopBar(
                            currentScreen = currentScreen,
                            onBack = {
                                currentScreen = if (isSubScreen(currentScreen)) "hub" else "home"
                                Fx.tick()
                            },
                            onHome = { currentScreen = "home"; Fx.tick() },
                            onSearch = { showSearchModal = true; Fx.tick() }
                        )

                        // EKRAN İÇERİĞİ
                        Box(Modifier.weight(1f)) {
                            when (currentScreen) {
                                // 5 Ana Hub Ekranı
                                "home" -> HomeScreen(this@MainActivity) { currentScreen = it }
                                "security" -> SecurityHubScreen(this@MainActivity)
                                "network" -> NetworkHubScreen(this@MainActivity)
                                "hardware" -> HardwareHubScreen(this@MainActivity, onNav = { currentScreen = it })
                                "hub" -> ModuleHubScreen { currentScreen = it }

                                // Alt Modül Ekranları (Doğrudan veya Merkezden Açılanlar)
                                "firewall" -> SecurityHubScreen(this@MainActivity, initialTab = 0)
                                "hacker" -> SecurityHubScreen(this@MainActivity, initialTab = 1)
                                "scanner" -> SecurityHubScreen(this@MainActivity, initialTab = 2)
                                "wifi" -> NetworkHubScreen(this@MainActivity, initialTab = 0)
                                "bluetooth" -> NetworkHubScreen(this@MainActivity, initialTab = 1)
                                "netmon" -> NetworkHubScreen(this@MainActivity, initialTab = 2)
                                "gpuz" -> GpuZScreen(this@MainActivity)
                                "cleaner" -> CleanerScreen(this@MainActivity)
                                "automation" -> AutomateScreen(this@MainActivity)
                                "backup" -> BackupScreen(this@MainActivity)
                                "media" -> MediaScreen(this@MainActivity)
                                "admin" -> AdminScreen(this@MainActivity)
                                "store" -> StoreScreen()
                                "settings" -> SettingsScreen()
                            }
                        }

                        // ERGONOMİK 5 SEKMEDEN OLUŞAN SABİT ALT BAR
                        UlakBottomBar(currentScreen) { currentScreen = it; Fx.tick() }
                    }

                    // ANDROID DONANIM GERİ TUŞU YÖNETİMİ
                    BackHandler(enabled = currentScreen != "home") {
                        currentScreen = if (isSubScreen(currentScreen)) "hub" else "home"
                        Fx.tick()
                    }
                }
            }
        }
    }

    private fun isSubScreen(screen: String): Boolean {
        return screen in setOf("automation", "backup", "media", "admin", "store", "settings", "gpuz", "cleaner", "scanner", "firewall", "hacker", "wifi", "bluetooth", "netmon")
    }
}

// ================= MODERN TOP BAR =================
@Composable
fun UlakTopBar(
    currentScreen: String,
    onBack: () -> Unit,
    onHome: () -> Unit,
    onSearch: () -> Unit
) {
    val p = LocalPal.current
    val fwActive = Prefs.getInt("fw_active", 1) == 1

    val screenTitles = mapOf(
        "home" to "Genel Bakış",
        "security" to "Kalkan & Güvenlik",
        "network" to "Ağ & Bağlantı",
        "hardware" to "Donanım & Performans",
        "hub" to "Modül Merkezi",
        "automation" to "Akış Otomasyonu",
        "backup" to "Şifreli Kasa",
        "media" to "Medya İndirici",
        "admin" to "Sistem Shell",
        "store" to "Modül Mağazası",
        "settings" to "Ayarlar",
        "gpuz" to "Grafik & GPU Analizi",
        "cleaner" to "Sistem Temizliği"
    )

    val isSub = currentScreen !in setOf("home", "security", "network", "hardware", "hub")

    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isSub) {
            // Alt sayfada geri tuşu ve başlık
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onBack() }
                    .padding(4.dp)
            ) {
                Icon(
                    Icons.Rounded.ArrowBack,
                    contentDescription = "Geri",
                    tint = p.t1,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = screenTitles[currentScreen] ?: "ULAK",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = p.t1
                )
            }
        } else {
            // Ana sekmelerde logo, başlık ve durum rozeti
            Row(
                Modifier
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onHome() }
                    .padding(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ulak_logo),
                    contentDescription = "ULAK Logo",
                    modifier = Modifier.size(26.dp)
                )
                Spacer(Modifier.width(9.dp))
                Text(
                    "ULAK",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    color = p.t1,
                    letterSpacing = 2.5.sp
                )
                Spacer(Modifier.width(8.dp))
                // Canlı koruma mikro statü pilli
                Row(
                    Modifier
                        .clip(CircleShape)
                        .background(if (fwActive) Accent.copy(alpha = 0.14f) else Danger.copy(alpha = 0.14f))
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.size(5.dp).clip(CircleShape).background(if (fwActive) Accent else Danger))
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = if (fwActive) "Korumada" else "Pasif",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (fwActive) Accent else Danger
                    )
                }
            }
        }

        // Sağ Taraf Aksiyonları (Arama ve Tema)
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onSearch, Modifier.size(36.dp)) {
                Icon(
                    Icons.Rounded.Search,
                    contentDescription = "Ara",
                    tint = p.t1,
                    modifier = Modifier.size(20.dp)
                )
            }
            IconButton(
                onClick = {
                    Prefs.dark = !Prefs.dark
                    Prefs.save()
                    Fx.tick()
                },
                Modifier.size(36.dp)
            ) {
                Icon(
                    if (Prefs.dark) Icons.Rounded.DarkMode else Icons.Rounded.LightMode,
                    contentDescription = "Tema",
                    tint = Amber,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

// ================= ERGONOMİK 5 SEKMEDEN OLUŞAN SABİT ALT BAR =================
@Composable
fun UlakBottomBar(current: String, onNav: (String) -> Unit) {
    val p = LocalPal.current

    val destinations = listOf(
        NavigationDestination("home", "Özet", Icons.Rounded.Dashboard),
        NavigationDestination("security", "Kalkan", Icons.Rounded.Shield),
        NavigationDestination("network", "Ağ", Icons.Rounded.Wifi),
        NavigationDestination("hardware", "Donanım", Icons.Rounded.Memory),
        NavigationDestination("hub", "Modüller", Icons.Rounded.Widgets)
    )

    // Alt ekranlar için aktif sekmeyi haritalama
    val activeNavId = when (current) {
        "home" -> "home"
        "security", "firewall", "hacker", "scanner" -> "security"
        "network", "wifi", "bluetooth", "netmon" -> "network"
        "hardware", "gpuz", "cleaner" -> "hardware"
        else -> "hub"
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 6.dp),
        shape = RoundedCornerShape(20.dp),
        color = p.surface,
        border = BorderStroke(1.dp, p.border.copy(alpha = 0.5f)),
        tonalElevation = 3.dp,
        shadowElevation = 6.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically
        ) {
            destinations.forEach { dest ->
                val active = activeNavId == dest.id
                val contentCol = if (active) Accent else p.t3
                val bgCol = if (active) Accent.copy(alpha = 0.14f) else Color.Transparent

                Column(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(bgCol)
                        .clickable { onNav(dest.id) }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = dest.icon,
                        contentDescription = dest.label,
                        tint = contentCol,
                        modifier = Modifier.size(21.dp)
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = dest.label,
                        fontSize = 10.5.sp,
                        fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                        color = contentCol
                    )
                }
            }
        }
    }
}

private data class NavigationDestination(
    val id: String,
    val label: String,
    val icon: ImageVector
)

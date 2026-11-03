package com.ulak.station.automate.ui

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.automate.engine.AutomateEngine
import com.ulak.station.automate.model.*
import com.ulak.station.core.*

/**
 * 1. YENİ AKIŞ OLUŞTURMA & ŞABLON DİYALOĞU (LlamaLab Automate Flow Creation)
 */
@Composable
fun NewFlowDialog(
    onDismiss: () -> Unit,
    onCreated: () -> Unit
) {
    val templates = remember { AutomateEngine.getTemplates() }
    var selectedTemplateIndex by remember { mutableIntStateOf(0) }
    var title by remember { mutableStateOf(templates[0].title) }
    var desc by remember { mutableStateOf(templates[0].description) }

    BentoDialog(title = "Yeni Akış Oluştur (Şablonlar)", onDismiss = onDismiss) {
        Text("Hazır Otomasyon Şablonu Seçin:", fontSize = 12.sp, color = LocalPal.current.t2)
        Spacer(Modifier.height(8.dp))

        // Şablon Seçici Yatay Liste
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            templates.forEachIndexed { idx, t ->
                val isSel = idx == selectedTemplateIndex
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isSel) Amber.copy(alpha = 0.18f) else LocalPal.current.surfaceSub.copy(alpha = 0.5f))
                        .border(1.dp, if (isSel) Amber else LocalPal.current.border.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .clickable {
                            selectedTemplateIndex = idx
                            title = t.title
                            desc = t.description
                            Fx.tick()
                        }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = t.title,
                        fontSize = 11.5.sp,
                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSel) Amber else LocalPal.current.t2
                    )
                }
            }
        }

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Akış Başlığı") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = desc,
            onValueChange = { desc = it },
            label = { Text("Açıklama") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            UButton("İptal", color = LocalPal.current.t3) { onDismiss() }
            Spacer(Modifier.width(8.dp))
            UButtonPrimary("Akışı Oluştur", Icons.Rounded.Check, Amber) {
                if (title.isNotEmpty()) {
                    AutomateEngine.createFromTemplate(
                        template = templates[selectedTemplateIndex],
                        customTitle = title,
                        customDesc = desc
                    )
                    onCreated()
                }
            }
        }
    }
}

/**
 * 2. KATEGORİZE VE ARAMALI BLOK EKLEME KATALOĞU (Automate Statement Picker)
 */
@Composable
fun AddBlockDialog(
    onDismiss: () -> Unit,
    onSelectTemplate: (category: BlockCategory, title: String, detail: String, type: String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategoryFilter by remember { mutableStateOf<BlockCategory?>(null) }

    val allStatements = remember {
        listOf(
            // Ağ & Bağlantı
            Triple(BlockCategory.CONNECTIVITY, "Wi-Fi Bağlı mı?", "WIFI_CHECK" to "Ağ Bağlantı Durumu Denetimi"),
            Triple(BlockCategory.CONNECTIVITY, "Açık / Güvensiz Wi-Fi mı?", "WIFI_OPEN_CHECK" to "Şifresiz Açık Ağ Algılama"),
            Triple(BlockCategory.CONNECTIVITY, "Ağ Ping Testi (8.8.8.8)", "PING" to "ICMP / TCP Yankı Denetimi"),
            Triple(BlockCategory.CONNECTIVITY, "Bluetooth Cihazı Bağlı mı?", "BLUETOOTH_CHECK" to "Aktif BLE / BT Aygıtı"),

            // Donanım & Güç
            Triple(BlockCategory.HARDWARE, "Sıcaklık > 45°C mi?", "TEMP_CHECK" to "SoC Termal Isı Eşik Denetimi"),
            Triple(BlockCategory.HARDWARE, "Pil Seviyesi <%20 mi?", "BATTERY_CHECK" to "Kritik Şarj Eşiği"),
            Triple(BlockCategory.HARDWARE, "Cihaz Şarjda mı?", "BATTERY_CHARGING" to "Hızlı / Normal Şarj Tespiti"),
            Triple(BlockCategory.HARDWARE, "Fener / Flaşı Çaktır", "FLASHLIGHT_TOGGLE" to "LED Donanım Tetikleyici"),

            // Güvenlik & Kalkan
            Triple(BlockCategory.SECURITY, "Güvenlik Duvarı: PARANOID", "FIREWALL_PARANOID" to "Tüm Bilinmeyen Portları Kilitle"),
            Triple(BlockCategory.SECURITY, "Güvenlik Duvarı: STRICT", "FIREWALL_STRICT" to "Sıkı Güvenlik Modu"),
            Triple(BlockCategory.SECURITY, "Güvenlik Duvarı: NORMAL", "FIREWALL_NORMAL" to "Standart Koruma Seviyesi"),
            Triple(BlockCategory.SECURITY, "Acil Durum Kill-Switch", "KILL_SWITCH" to "Ağ Bağlantısını Anında Kes"),

            // Eylem & Alarm
            Triple(BlockCategory.ACTION, "Taktiksel Alarm Çal", "ALERT" to "Siren Ses & Titreşim İkazı"),
            Triple(BlockCategory.ACTION, "Haptik Titreşim Ver", "VIBRATE" to "LRA Titreşim Motoru"),
            Triple(BlockCategory.ACTION, "Toast Bildirimi Göster", "TOAST_SHOW" to "Ekranda Kısa Mesaj Göster"),

            // Sistem & Bellek
            Triple(BlockCategory.SYSTEM, "RAM Belleğini Temizle", "CLEAN_RAM" to "Önbellek & Çöp Bellek Temizliği"),

            // Akış Kontrolü
            Triple(BlockCategory.FLOW_CONTROL, "Gecikme (Bekle)", "DELAY" to "3 Saniye Bekleme"),
            Triple(BlockCategory.FLOW_CONTROL, "Fiberi Sonlandır", "FIBER_STOP" to "Akış Çalışmasını Bitir")
        )
    }

    val filteredStatements = allStatements.filter { (cat, title, meta) ->
        val (type, desc) = meta
        val matchesCategory = (selectedCategoryFilter == null || cat == selectedCategoryFilter)
        val matchesQuery = searchQuery.isEmpty() ||
                title.contains(searchQuery, ignoreCase = true) ||
                desc.contains(searchQuery, ignoreCase = true) ||
                type.contains(searchQuery, ignoreCase = true) ||
                cat.label.contains(searchQuery, ignoreCase = true)
        matchesCategory && matchesQuery
    }

    BentoDialog(title = "Akışa Yeni Blok Ekle", onDismiss = onDismiss) {
        // Arama Çubuğu
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Blok ara (Örn: wifi, ping, alarm, ram, pil)...", fontSize = 12.sp) },
            leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = LocalPal.current.t2) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        Spacer(Modifier.height(8.dp))

        // Kategori Filtre Çipleri
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            val allCats = listOf<BlockCategory?>(null) + BlockCategory.values().filter { it != BlockCategory.BEGINNING }
            allCats.forEach { cat ->
                val isSel = selectedCategoryFilter == cat
                val label = cat?.label ?: "Tümü"
                val chipColor = if (cat != null) Color(cat.colorHex) else Accent
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (isSel) chipColor.copy(alpha = 0.2f) else LocalPal.current.surfaceSub.copy(alpha = 0.5f))
                        .border(1.dp, if (isSel) chipColor else LocalPal.current.border.copy(alpha = 0.35f), RoundedCornerShape(8.dp))
                        .clickable {
                            selectedCategoryFilter = cat
                            Fx.tick()
                        }
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = label,
                        fontSize = 10.5.sp,
                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSel) chipColor else LocalPal.current.t2
                    )
                }
            }
        }

        Spacer(Modifier.height(10.dp))

        // Blok Listesi
        Column(
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.heightIn(max = 320.dp)
        ) {
            filteredStatements.forEach { (cat, title, meta) ->
                val (type, desc) = meta
                val catColor = Color(cat.colorHex)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(LocalPal.current.surfaceSub.copy(alpha = 0.6f))
                        .clickable {
                            onSelectTemplate(cat, title, desc, type)
                            Fx.tick()
                        }
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(catColor)
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(title, fontSize = 12.5.sp, fontWeight = FontWeight.SemiBold, color = LocalPal.current.t1)
                        Text("${cat.label} • $desc", fontSize = 10.5.sp, color = LocalPal.current.t2)
                    }
                    Icon(Icons.Rounded.AddCircle, contentDescription = null, tint = catColor, modifier = Modifier.size(18.dp))
                }
            }
            if (filteredStatements.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    Text("Aramayla eşleşen blok bulunamadı.", fontSize = 12.sp, color = LocalPal.current.t3)
                }
            }
        }
    }
}

/**
 * 3. BLOK YAPILANDIRMA DİYALOĞU (Block Inspector & Wire Routing)
 */
@Composable
fun EditBlockDialog(
    block: FlowBlock,
    allBlocks: List<FlowBlock>,
    onDismiss: () -> Unit,
    onSave: (title: String, detail: String, outOkId: Int?, outNoId: Int?) -> Unit,
    onDelete: () -> Unit
) {
    var editTitle by remember { mutableStateOf(block.title) }
    var editDetail by remember { mutableStateOf(block.detail) }
    var editOkId by remember { mutableStateOf(block.outOkId?.toString() ?: "") }
    var editNoId by remember { mutableStateOf(block.outNoId?.toString() ?: "") }

    val hasDecisionBranch = block.category == BlockCategory.CONNECTIVITY ||
            block.category == BlockCategory.HARDWARE ||
            block.blockType == "DECISION"

    BentoDialog(title = "Blok #${block.id} Yapılandırması", onDismiss = onDismiss) {
        OutlinedTextField(
            value = editTitle,
            onValueChange = { editTitle = it },
            label = { Text("Blok Başlığı") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = editDetail,
            onValueChange = { editDetail = it },
            label = { Text("Parametre / Koşul Değeri") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))

        Text("Çıkış Tel Bağlantıları (Hedef Blok Numaraları):", fontSize = 11.sp, color = LocalPal.current.t2)
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = editOkId,
                onValueChange = { editOkId = it },
                label = { Text("Hedef (OK / EVET)") },
                placeholder = { Text("Blok No") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            if (hasDecisionBranch) {
                OutlinedTextField(
                    value = editNoId,
                    onValueChange = { editNoId = it },
                    label = { Text("Hedef (NO / HAYIR)") },
                    placeholder = { Text("Blok No") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
            }
        }

        Spacer(Modifier.height(14.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (block.id != 1) {
                UButton("Bloğu Sil", Icons.Rounded.Delete, Danger) {
                    onDelete()
                }
            } else {
                Spacer(Modifier.width(1.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                UButton("İptal", color = LocalPal.current.t3) { onDismiss() }
                UButtonPrimary("Kaydet", Icons.Rounded.Check, Accent) {
                    onSave(editTitle, editDetail, editOkId.toIntOrNull(), editNoId.toIntOrNull())
                }
            }
        }
    }
}

/**
 * 4. AKIŞ AYARLARI, İZİNLER VE JSON AKTARIMI DİYALOĞU (Flow Settings)
 */
@Composable
fun FlowSettingsDialog(
    flow: AutomateFlow,
    onDismiss: () -> Unit,
    onSaveSettings: (title: String, desc: String, settings: FlowSettings) -> Unit
) {
    var title by remember { mutableStateOf(flow.title) }
    var desc by remember { mutableStateOf(flow.description) }
    var bootStart by remember { mutableStateOf(flow.settings.bootStart) }
    var keepScreenOn by remember { mutableStateOf(flow.settings.keepScreenOn) }
    var detailedLogging by remember { mutableStateOf(flow.settings.detailedLogging) }
    var parallel by remember { mutableStateOf(flow.settings.parallel) }

    val ctx = LocalContext.current
    val clipboard = LocalClipboardManager.current

    BentoDialog(title = "Akış Ayarları & Yapılandırma", onDismiss = onDismiss) {
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Akış Başlığı") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = desc,
            onValueChange = { desc = it },
            label = { Text("Açıklama") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(Modifier.height(12.dp))

        SettingRow(
            icon = Icons.Rounded.PowerSettingsNew,
            title = "Açılışta Otomatik Başlat",
            sub = "Cihaz yeniden başladığında fiberi otomatik tetikle",
            color = Accent
        ) {
            Switch(checked = bootStart, onCheckedChange = { bootStart = it; Fx.tick() })
        }

        SettingRow(
            icon = Icons.Rounded.StayCurrentPortrait,
            title = "Ekranı Açık Tut",
            sub = "Fiber çalışırken ekran kararmasını önle",
            color = Amber
        ) {
            Switch(checked = keepScreenOn, onCheckedChange = { keepScreenOn = it; Fx.tick() })
        }

        SettingRow(
            icon = Icons.Rounded.CallSplit,
            title = "Paralel Fiber Yürütme",
            sub = "Aynı anda birden fazla bağımsız fiber dalı çalışsın",
            color = Violet
        ) {
            Switch(checked = parallel, onCheckedChange = { parallel = it; Fx.tick() })
        }

        SettingRow(
            icon = Icons.Rounded.Terminal,
            title = "Detaylı Günlük Kaydı",
            sub = "Her blok adımını konsola kaydet",
            color = Cyan
        ) {
            Switch(checked = detailedLogging, onCheckedChange = { detailedLogging = it; Fx.tick() })
        }

        Spacer(Modifier.height(10.dp))

        // JSON Yedekleme / Dışa Aktarma
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            UButton(
                text = "JSON Kopyala",
                icon = Icons.Rounded.ContentCopy,
                color = Cyan,
                modifier = Modifier.weight(1f)
            ) {
                val json = AutomateEngine.exportFlowToJson(flow.id)
                clipboard.setText(AnnotatedString(json))
                Toast.makeText(ctx, "Akış JSON panoya kopyalandı", Toast.LENGTH_SHORT).show()
                Fx.tick()
            }

            UButton(
                text = "Günlükleri Sil",
                icon = Icons.Rounded.ClearAll,
                color = Danger,
                modifier = Modifier.weight(1f)
            ) {
                AutomateEngine.clearLogs(flow.id)
            }
        }

        Spacer(Modifier.height(8.dp))

        // Akış Çoğaltma ve Silme
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            UButton(
                text = "Akışı Çoğalt",
                icon = Icons.Rounded.AddToPhotos,
                color = Accent,
                modifier = Modifier.weight(1f)
            ) {
                AutomateEngine.duplicateFlow(flow.id)
                onDismiss()
            }

            UButton(
                text = "Akışı Sil",
                icon = Icons.Rounded.Delete,
                color = Danger,
                modifier = Modifier.weight(1f)
            ) {
                AutomateEngine.deleteFlow(flow.id)
                onDismiss()
            }
        }

        Spacer(Modifier.height(14.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            UButton("İptal", color = LocalPal.current.t3) { onDismiss() }
            Spacer(Modifier.width(8.dp))
            UButtonPrimary("Ayarları Kaydet", Icons.Rounded.Check, Accent) {
                onSaveSettings(
                    title,
                    desc,
                    FlowSettings(bootStart, 1, keepScreenOn, detailedLogging, parallel)
                )
            }
        }
    }
}

/**
 * 5. BLOK BAĞLAM EYLEM MENÜSÜ (Long-Press Context Menu)
 */
@Composable
fun BlockContextMenuDialog(
    block: FlowBlock,
    onDismiss: () -> Unit,
    onEdit: () -> Unit,
    onDuplicate: () -> Unit,
    onDisconnect: () -> Unit,
    onDelete: () -> Unit
) {
    BentoDialog(title = "Blok #${block.id} Eylemleri", onDismiss = onDismiss) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SettingRow(Icons.Rounded.Edit, "Blok Özelliklerini Düzenle", "Başlık, parametre ve dallanma", Accent) {
                UButton("Düzenle", color = Accent) { onEdit() }
            }
            SettingRow(Icons.Rounded.ContentCopy, "Bloğu Çoğalt (Kopya)", "Aynı özelliklerle yeni blok oluştur", Cyan) {
                UButton("Çoğalt", color = Cyan) { onDuplicate() }
            }
            SettingRow(Icons.Rounded.LinkOff, "Tüm Bağlantıları Kes", "Giriş ve çıkış tellerini ayır", Amber) {
                UButton("Ayır", color = Amber) { onDisconnect() }
            }
            if (block.id != 1) {
                SettingRow(Icons.Rounded.Delete, "Bloğu Tamamen Sil", "Akış şemasından kaldır", Danger) {
                    UButton("Sil", color = Danger) { onDelete() }
                }
            }
        }
    }
}

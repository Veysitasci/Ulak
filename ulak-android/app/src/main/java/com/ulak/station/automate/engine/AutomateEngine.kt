package com.ulak.station.automate.engine

import android.content.Context
import android.content.SharedPreferences
import android.hardware.camera2.CameraManager
import android.widget.Toast
import com.ulak.station.automate.model.*
import com.ulak.station.core.Fx
import com.ulak.station.core.Prefs
import com.ulak.station.data.HardwareMonitor
import com.ulak.station.data.NetworkEngine
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetAddress
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * Automate Motoru: LlamaLab Automate mimarisine dayanan 2D koordinatlı bloklar,
 * hazır şablonlar, JSON içe/dışa aktarma, geri alma (Undo) geçmişi, akış ayarları
 * ve gerçek zamanlı fiber işletimi.
 */
object AutomateEngine {

    private const val PREFS_KEY = "ulak_automate_flows_v4"
    private var sp: SharedPreferences? = null
    private val timeFmt = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
    private val activeJobs = ConcurrentHashMap<String, Job>()
    private val engineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val _flows = MutableStateFlow<List<AutomateFlow>>(emptyList())
    val flows = _flows.asStateFlow()

    private val _selectedFlowId = MutableStateFlow("")
    val selectedFlowId = _selectedFlowId.asStateFlow()

    // Geri Alma (Undo) Yığını
    private val undoStack = mutableListOf<UndoSnapshot>()
    private val _undoAvailable = MutableStateFlow(false)
    val undoAvailable = _undoAvailable.asStateFlow()

    fun init(ctx: Context) {
        sp = ctx.getSharedPreferences("ulak_automate_prefs", Context.MODE_PRIVATE)
        loadFlows(ctx)
    }

    private fun loadFlows(ctx: Context) {
        val jsonStr = sp?.getString(PREFS_KEY, null)
        if (!jsonStr.isNullOrEmpty()) {
            try {
                val list = mutableListOf<AutomateFlow>()
                val arr = JSONArray(jsonStr)
                for (i in 0 until arr.length()) {
                    val fo = arr.getJSONObject(i)
                    val blocksList = mutableListOf<FlowBlock>()
                    val bArr = fo.getJSONArray("blocks")
                    for (j in 0 until bArr.length()) {
                        val bo = bArr.getJSONObject(j)
                        val catStr = bo.getString("category")
                        val cat = try {
                            BlockCategory.valueOf(catStr)
                        } catch (e: Exception) {
                            BlockCategory.ACTION
                        }
                        blocksList.add(
                            FlowBlock(
                                id = bo.getInt("id"),
                                category = cat,
                                title = bo.getString("title"),
                                detail = bo.getString("detail"),
                                blockType = bo.optString("blockType", "GENERIC"),
                                posX = bo.optDouble("posX", 60.0).toFloat(),
                                posY = bo.optDouble("posY", (60.0 + j * 120.0)).toFloat(),
                                inPin = bo.optBoolean("inPin", true),
                                outOkId = if (bo.has("outOkId") && !bo.isNull("outOkId")) bo.getInt("outOkId") else null,
                                outNoId = if (bo.has("outNoId") && !bo.isNull("outNoId")) bo.getInt("outNoId") else null
                            )
                        )
                    }

                    val settingsObj = fo.optJSONObject("settings")
                    val permsList = mutableListOf<String>()
                    val permsArr = settingsObj?.optJSONArray("permissions")
                    if (permsArr != null) {
                        for (p in 0 until permsArr.length()) permsList.add(permsArr.getString(p))
                    } else {
                        permsList.addAll(listOf("Ağ & Wi-Fi", "Sistem Haptiği", "Donanım İzleme"))
                    }

                    val flowSettings = FlowSettings(
                        bootStart = settingsObj?.optBoolean("bootStart", false) ?: false,
                        maxFibers = settingsObj?.optInt("maxFibers", 1) ?: 1,
                        keepScreenOn = settingsObj?.optBoolean("keepScreenOn", false) ?: false,
                        detailedLogging = settingsObj?.optBoolean("detailedLogging", true) ?: true,
                        parallel = settingsObj?.optBoolean("parallel", false) ?: false,
                        permissions = permsList
                    )

                    val now = timeFmt.format(Date())
                    list.add(
                        AutomateFlow(
                            id = fo.getString("id"),
                            title = fo.getString("title"),
                            description = fo.getString("description"),
                            isRunning = false,
                            settings = flowSettings,
                            blocks = blocksList,
                            logs = mutableListOf("$now [Sistem] Akış depodan yüklendi.")
                        )
                    )
                }
                _flows.value = list
                if (list.isNotEmpty()) _selectedFlowId.value = list[0].id
                return
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        createDefaultFlows(ctx)
    }

    private fun createDefaultFlows(ctx: Context) {
        val now = timeFmt.format(Date())
        val defaults = listOf(
            AutomateFlow(
                id = "flow_wifi_shield",
                title = "Açık Wi-Fi Güvenlik Kalkanı",
                description = "Şifresiz bir ağa bağlanıldığında güvenlik duvarını otomatik PARANOID moda geçirir ve alarm verir.",
                isRunning = false,
                settings = FlowSettings(bootStart = true, maxFibers = 1, keepScreenOn = false, detailedLogging = true),
                blocks = mutableListOf(
                    FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                    FlowBlock(2, BlockCategory.CONNECTIVITY, "Wi-Fi Bağlı mı?", "Ağ Durumu Denetimi", blockType = "WIFI_CHECK", posX = 60f, posY = 170f, inPin = true, outOkId = 3, outNoId = 6),
                    FlowBlock(3, BlockCategory.CONNECTIVITY, "Ağ Açık / Şifresiz mi?", "Koşul: Güvenlik == OPEN", blockType = "WIFI_OPEN_CHECK", posX = 60f, posY = 300f, inPin = true, outOkId = 4, outNoId = 6),
                    FlowBlock(4, BlockCategory.SECURITY, "Güvenlik Duvarı: PARANOID", "Filtre: Paranoid Mod", blockType = "FIREWALL_PARANOID", posX = 60f, posY = 430f, inPin = true, outOkId = 5),
                    FlowBlock(5, BlockCategory.ACTION, "Taktiksel Alarm Çal", "Ses & Titreşim İkazı", blockType = "ALERT", posX = 60f, posY = 560f, inPin = true, outOkId = 2),
                    FlowBlock(6, BlockCategory.FLOW_CONTROL, "10 Saniye Bekle", "Gecikme: 10sn", blockType = "DELAY", posX = 290f, posY = 300f, inPin = true, outOkId = 2)
                ),
                logs = mutableListOf("$now [Sistem] 'Açık Wi-Fi Güvenlik Kalkanı' akışı hazırlandı.")
            ),
            AutomateFlow(
                id = "flow_thermal_guard",
                title = "Termal Isı ve Bellek Koruması",
                description = "SoC işlemci sıcaklığı 45°C üzerine çıktığında arka plan RAM belleğini boşaltır ve uyarı verir.",
                isRunning = false,
                settings = FlowSettings(bootStart = false, maxFibers = 1, keepScreenOn = false, detailedLogging = true),
                blocks = mutableListOf(
                    FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                    FlowBlock(2, BlockCategory.HARDWARE, "Sıcaklık > 45°C mi?", "Sensör: Termal Bölge Denetimi", blockType = "TEMP_CHECK", posX = 60f, posY = 170f, inPin = true, outOkId = 3, outNoId = 5),
                    FlowBlock(3, BlockCategory.SYSTEM, "Sistem RAM'ini Temizle", "Önbellek & Çöp Temizliği", blockType = "CLEAN_RAM", posX = 60f, posY = 300f, inPin = true, outOkId = 4),
                    FlowBlock(4, BlockCategory.ACTION, "Haptik Titreşim Uyarısı", "LRA Titreşim Motoru", blockType = "VIBRATE", posX = 60f, posY = 430f, inPin = true, outOkId = 5),
                    FlowBlock(5, BlockCategory.FLOW_CONTROL, "5 Saniye Bekle", "Gecikme: 5sn", blockType = "DELAY", posX = 290f, posY = 240f, inPin = true, outOkId = 2)
                ),
                logs = mutableListOf("$now [Sistem] 'Termal Isı ve Bellek Koruması' akışı hazırlandı.")
            ),
            AutomateFlow(
                id = "flow_ping_watchdog",
                title = "Ağ Gecikmesi & Ping Teşhisi",
                description = "İnternet erişimini sürekli ping ile denetler, kopma durumunda bildirim verir.",
                isRunning = false,
                settings = FlowSettings(bootStart = false, maxFibers = 1, keepScreenOn = false, detailedLogging = true),
                blocks = mutableListOf(
                    FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                    FlowBlock(2, BlockCategory.CONNECTIVITY, "Ağ Ping Testi (8.8.8.8)", "ICMP / TCP Yankı Denetimi", blockType = "PING", posX = 60f, posY = 170f, inPin = true, outOkId = 4, outNoId = 3),
                    FlowBlock(3, BlockCategory.ACTION, "Bağlantı Hatası Bildir", "Toast: İnternet Yok!", blockType = "TOAST_SHOW", posX = 290f, posY = 170f, inPin = true, outOkId = 4),
                    FlowBlock(4, BlockCategory.FLOW_CONTROL, "10 Saniye Bekle", "Periyodik Döngü", blockType = "DELAY", posX = 60f, posY = 300f, inPin = true, outOkId = 2)
                ),
                logs = mutableListOf("$now [Sistem] 'Ağ Gecikmesi & Ping Teşhisi' akışı hazırlandı.")
            )
        )
        _flows.value = defaults
        if (defaults.isNotEmpty()) _selectedFlowId.value = defaults[0].id
        saveFlows()
    }

    fun saveFlows() {
        val spRef = sp ?: return
        try {
            val arr = JSONArray()
            _flows.value.forEach { f ->
                val fo = JSONObject().apply {
                    put("id", f.id)
                    put("title", f.title)
                    put("description", f.description)

                    val sObj = JSONObject().apply {
                        put("bootStart", f.settings.bootStart)
                        put("maxFibers", f.settings.maxFibers)
                        put("keepScreenOn", f.settings.keepScreenOn)
                        put("detailedLogging", f.settings.detailedLogging)
                        put("parallel", f.settings.parallel)
                        val pArr = JSONArray()
                        f.settings.permissions.forEach { pArr.put(it) }
                        put("permissions", pArr)
                    }
                    put("settings", sObj)

                    val bArr = JSONArray()
                    f.blocks.forEach { b ->
                        bArr.put(JSONObject().apply {
                            put("id", b.id)
                            put("category", b.category.name)
                            put("title", b.title)
                            put("detail", b.detail)
                            put("blockType", b.blockType)
                            put("posX", b.posX.toDouble())
                            put("posY", b.posY.toDouble())
                            put("inPin", b.inPin)
                            if (b.outOkId != null) put("outOkId", b.outOkId)
                            if (b.outNoId != null) put("outNoId", b.outNoId)
                        })
                    }
                    put("blocks", bArr)
                }
                arr.put(fo)
            }
            spRef.edit().putString(PREFS_KEY, arr.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun selectFlow(id: String) {
        _selectedFlowId.value = id
    }

    // ================= GERİ ALMA (UNDO) MOTORU =================
    private fun recordUndo(flowId: String, actionName: String) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        if (undoStack.size > 25) undoStack.removeAt(0)
        undoStack.add(UndoSnapshot(flowId, actionName, flow.deepCopyBlocks()))
        _undoAvailable.value = true
    }

    fun undo(flowId: String): Boolean {
        val lastIdx = undoStack.indexOfLast { it.flowId == flowId }
        if (lastIdx == -1) return false
        val snapshot = undoStack.removeAt(lastIdx)
        val flow = _flows.value.find { it.id == flowId } ?: return false

        flow.blocks.clear()
        flow.blocks.addAll(snapshot.blocks.map { it.deepCopy() })
        val now = timeFmt.format(Date())
        flow.logs.add("$now [Geri Alındı] ${snapshot.actionName}")
        _flows.value = _flows.value.toList()
        saveFlows()
        _undoAvailable.value = undoStack.any { it.flowId == flowId }
        Fx.tick()
        return true
    }

    fun canUndo(flowId: String): Boolean {
        return undoStack.any { it.flowId == flowId }
    }

    // ================= CRUD: FLOW YÖNETİMİ & ŞABLONLAR =================
    fun getTemplates(): List<FlowTemplate> {
        return listOf(
            FlowTemplate(
                title = "Açık Wi-Fi Güvenlik Kalkanı",
                description = "Şifresiz bir ağa bağlanıldığında güvenlik duvarını PARANOID seviyeye alır ve alarm verir.",
                category = "Güvenlik & Siber Savunma",
                blocksProvider = {
                    listOf(
                        FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                        FlowBlock(2, BlockCategory.CONNECTIVITY, "Wi-Fi Bağlı mı?", "Ağ Durumu Denetimi", blockType = "WIFI_CHECK", posX = 60f, posY = 170f, inPin = true, outOkId = 3, outNoId = 6),
                        FlowBlock(3, BlockCategory.CONNECTIVITY, "Ağ Açık / Şifresiz mi?", "Koşul: OPEN Ağ", blockType = "WIFI_OPEN_CHECK", posX = 60f, posY = 300f, inPin = true, outOkId = 4, outNoId = 6),
                        FlowBlock(4, BlockCategory.SECURITY, "Güvenlik Duvarı: PARANOID", "Filtre: Paranoid Mod", blockType = "FIREWALL_PARANOID", posX = 60f, posY = 430f, inPin = true, outOkId = 5),
                        FlowBlock(5, BlockCategory.ACTION, "Taktiksel Alarm Çal", "Ses & Titreşim İkazı", blockType = "ALERT", posX = 60f, posY = 560f, inPin = true, outOkId = 2),
                        FlowBlock(6, BlockCategory.FLOW_CONTROL, "10 Saniye Bekle", "Gecikme: 10sn", blockType = "DELAY", posX = 290f, posY = 300f, inPin = true, outOkId = 2)
                    )
                }
            ),
            FlowTemplate(
                title = "Termal Isı ve Bellek Koruması",
                description = "SoC işlemci sıcaklığı 45°C üzerine çıktığında arka plan RAM belleğini boşaltır.",
                category = "Donanım & Performans",
                blocksProvider = {
                    listOf(
                        FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                        FlowBlock(2, BlockCategory.HARDWARE, "Sıcaklık > 45°C mi?", "Sensör: Termal Denetim", blockType = "TEMP_CHECK", posX = 60f, posY = 170f, inPin = true, outOkId = 3, outNoId = 5),
                        FlowBlock(3, BlockCategory.SYSTEM, "Sistem RAM'ini Temizle", "Önbellek & Çöp Temizliği", blockType = "CLEAN_RAM", posX = 60f, posY = 300f, inPin = true, outOkId = 4),
                        FlowBlock(4, BlockCategory.ACTION, "Haptik Titreşim Uyarısı", "LRA Titreşim Motoru", blockType = "VIBRATE", posX = 60f, posY = 430f, inPin = true, outOkId = 5),
                        FlowBlock(5, BlockCategory.FLOW_CONTROL, "5 Saniye Bekle", "Gecikme: 5sn", blockType = "DELAY", posX = 290f, posY = 240f, inPin = true, outOkId = 2)
                    )
                }
            ),
            FlowTemplate(
                title = "Kritik Pil & Güç Tasarrufu",
                description = "Pil seviyesi %20 altına düştüğünde arka plan işlemlerini durdurur ve bildirim verir.",
                category = "Donanım & Güç",
                blocksProvider = {
                    listOf(
                        FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                        FlowBlock(2, BlockCategory.HARDWARE, "Pil Seviyesi <%20 mi?", "Kritik Şarj Eşiği", blockType = "BATTERY_CHECK", posX = 60f, posY = 170f, inPin = true, outOkId = 3, outNoId = 5),
                        FlowBlock(3, BlockCategory.SYSTEM, "Sistem RAM'ini Temizle", "Arka Planı Hafiflet", blockType = "CLEAN_RAM", posX = 60f, posY = 300f, inPin = true, outOkId = 4),
                        FlowBlock(4, BlockCategory.ACTION, "Toast Bildirimi Göster", "Mesaj: Pil Kritik!", blockType = "TOAST_SHOW", posX = 60f, posY = 430f, inPin = true, outOkId = 5),
                        FlowBlock(5, BlockCategory.FLOW_CONTROL, "15 Saniye Bekle", "Periyodik İzleme", blockType = "DELAY", posX = 290f, posY = 240f, inPin = true, outOkId = 2)
                    )
                }
            ),
            FlowTemplate(
                title = "Ağ Gecikmesi & Ping Teşhisi",
                description = "Google DNS (8.8.8.8) üzerine periyodik ping atarak bağlantıyı test eder.",
                category = "Ağ & Teşhis",
                blocksProvider = {
                    listOf(
                        FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = 2),
                        FlowBlock(2, BlockCategory.CONNECTIVITY, "Ağ Ping Testi", "Hedef: 8.8.8.8", blockType = "PING", posX = 60f, posY = 170f, inPin = true, outOkId = 4, outNoId = 3),
                        FlowBlock(3, BlockCategory.ACTION, "Bağlantı Hatası Bildir", "Toast: İnternet Yok!", blockType = "TOAST_SHOW", posX = 290f, posY = 170f, inPin = true, outOkId = 4),
                        FlowBlock(4, BlockCategory.FLOW_CONTROL, "10 Saniye Bekle", "Periyodik Döngü", blockType = "DELAY", posX = 60f, posY = 300f, inPin = true, outOkId = 2)
                    )
                }
            ),
            FlowTemplate(
                title = "Sıfırdan Boş Akış",
                description = "Yalnızca başlangıç bloğu barındıran temiz tuval.",
                category = "Özel Akış",
                blocksProvider = {
                    listOf(
                        FlowBlock(1, BlockCategory.BEGINNING, "Akış Başlangıcı", "Fiber Başlatıcı Noktası", blockType = "BEGINNING", posX = 60f, posY = 40f, inPin = false, outOkId = null)
                    )
                }
            )
        )
    }

    fun createFromTemplate(template: FlowTemplate, customTitle: String = "", customDesc: String = ""): String {
        val newId = "flow_" + System.currentTimeMillis()
        val now = timeFmt.format(Date())
        val blocks = template.blocksProvider().map { it.deepCopy() }.toMutableList()

        val newFlow = AutomateFlow(
            id = newId,
            title = customTitle.ifEmpty { template.title },
            description = customDesc.ifEmpty { template.description },
            isRunning = false,
            settings = FlowSettings(),
            blocks = blocks,
            logs = mutableListOf("$now [Sistem] '${template.title}' şablonundan akış oluşturuldu.")
        )

        _flows.value = _flows.value + newFlow
        _selectedFlowId.value = newId
        saveFlows()
        Fx.success()
        return newId
    }

    fun createNewFlow(title: String, description: String): String {
        return createFromTemplate(
            getTemplates().last(),
            customTitle = title,
            customDesc = description
        )
    }

    fun deleteFlow(flowId: String) {
        stopFiber(flowId)
        _flows.value = _flows.value.filter { it.id != flowId }
        undoStack.removeAll { it.flowId == flowId }
        if (_selectedFlowId.value == flowId) {
            _selectedFlowId.value = _flows.value.firstOrNull()?.id ?: ""
        }
        saveFlows()
        Fx.tick()
    }

    fun duplicateFlow(flowId: String) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        val newId = "flow_" + System.currentTimeMillis()
        val duplicated = AutomateFlow(
            id = newId,
            title = "${flow.title} (Kopya)",
            description = flow.description,
            isRunning = false,
            settings = flow.settings.copy(),
            blocks = flow.deepCopyBlocks(),
            logs = mutableListOf("${timeFmt.format(Date())} [Sistem] Akış kopyalandı.")
        )
        _flows.value = _flows.value + duplicated
        _selectedFlowId.value = newId
        saveFlows()
        Fx.success()
    }

    fun updateFlowInfo(flowId: String, newTitle: String, newDesc: String) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        recordUndo(flowId, "Akış Bilgilerini Güncelle")
        flow.title = newTitle
        flow.description = newDesc
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.tick()
    }

    fun updateFlowSettings(flowId: String, newSettings: FlowSettings) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        recordUndo(flowId, "Akış Ayarlarını Güncelle")
        flow.settings = newSettings
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.tick()
    }

    fun clearLogs(flowId: String) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        flow.logs.clear()
        flow.logs.add("${timeFmt.format(Date())} [Sistem] Günlük kayıtları temizlendi.")
        _flows.value = _flows.value.toList()
        Fx.tick()
    }

    // ================= JSON İÇE & DIŞA AKTARMA =================
    fun exportFlowToJson(flowId: String): String {
        val flow = _flows.value.find { it.id == flowId } ?: return "{}"
        val fo = JSONObject().apply {
            put("id", flow.id)
            put("title", flow.title)
            put("description", flow.description)
            val sObj = JSONObject().apply {
                put("bootStart", flow.settings.bootStart)
                put("maxFibers", flow.settings.maxFibers)
                put("keepScreenOn", flow.settings.keepScreenOn)
                put("detailedLogging", flow.settings.detailedLogging)
                put("parallel", flow.settings.parallel)
            }
            put("settings", sObj)
            val bArr = JSONArray()
            flow.blocks.forEach { b ->
                bArr.put(JSONObject().apply {
                    put("id", b.id)
                    put("category", b.category.name)
                    put("title", b.title)
                    put("detail", b.detail)
                    put("blockType", b.blockType)
                    put("posX", b.posX.toDouble())
                    put("posY", b.posY.toDouble())
                    put("inPin", b.inPin)
                    if (b.outOkId != null) put("outOkId", b.outOkId)
                    if (b.outNoId != null) put("outNoId", b.outNoId)
                })
            }
            put("blocks", bArr)
        }
        return fo.toString(2)
    }

    fun importFlowFromJson(jsonString: String): Boolean {
        return try {
            val fo = JSONObject(jsonString)
            val newId = "flow_" + System.currentTimeMillis()
            val blocksList = mutableListOf<FlowBlock>()
            val bArr = fo.getJSONArray("blocks")
            for (j in 0 until bArr.length()) {
                val bo = bArr.getJSONObject(j)
                blocksList.add(
                    FlowBlock(
                        id = bo.getInt("id"),
                        category = BlockCategory.valueOf(bo.getString("category")),
                        title = bo.getString("title"),
                        detail = bo.getString("detail"),
                        blockType = bo.optString("blockType", "GENERIC"),
                        posX = bo.optDouble("posX", 60.0).toFloat(),
                        posY = bo.optDouble("posY", (60.0 + j * 120.0)).toFloat(),
                        inPin = bo.optBoolean("inPin", true),
                        outOkId = if (bo.has("outOkId") && !bo.isNull("outOkId")) bo.getInt("outOkId") else null,
                        outNoId = if (bo.has("outNoId") && !bo.isNull("outNoId")) bo.getInt("outNoId") else null
                    )
                )
            }
            val flow = AutomateFlow(
                id = newId,
                title = fo.optString("title", "İçe Aktarılan Akış"),
                description = fo.optString("description", "JSON dosyasından içe aktarıldı"),
                isRunning = false,
                settings = FlowSettings(),
                blocks = blocksList,
                logs = mutableListOf("${timeFmt.format(Date())} [Sistem] Akış başarıyla içe aktarıldı.")
            )
            _flows.value = _flows.value + flow
            _selectedFlowId.value = newId
            saveFlows()
            Fx.success()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }

    // ================= CRUD: BLOK YÖNETİMİ =================
    fun addBlock(
        flowId: String,
        category: BlockCategory,
        title: String,
        detail: String,
        blockType: String,
        posX: Float = 60f,
        posY: Float = 200f,
        outOkId: Int? = null,
        outNoId: Int? = null
    ) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        recordUndo(flowId, "Blok Ekle: '$title'")
        val newId = (flow.blocks.maxOfOrNull { it.id } ?: 0) + 1
        val newBlock = FlowBlock(
            id = newId,
            category = category,
            title = title,
            detail = detail,
            blockType = blockType,
            posX = posX,
            posY = posY,
            inPin = (category != BlockCategory.BEGINNING),
            outOkId = outOkId,
            outNoId = outNoId
        )

        val prevBlock = flow.blocks.lastOrNull()
        if (prevBlock != null && prevBlock.outOkId == null && prevBlock.category != BlockCategory.FLOW_CONTROL) {
            prevBlock.outOkId = newId
        }

        flow.blocks.add(newBlock)
        val now = timeFmt.format(Date())
        flow.logs.add("$now [+] Blok #$newId eklendi: '$title'")
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.click()
    }

    fun updateBlockPosition(flowId: String, blockId: Int, newX: Float, newY: Float) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        val block = flow.blocks.find { it.id == blockId } ?: return
        block.posX = newX
        block.posY = newY
        _flows.value = _flows.value.toList()
        saveFlows()
    }

    fun updateBlockConfig(
        flowId: String,
        blockId: Int,
        title: String,
        detail: String,
        outOkId: Int?,
        outNoId: Int?
    ) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        recordUndo(flowId, "Blok #$blockId Düzenlendi")
        val block = flow.blocks.find { it.id == blockId } ?: return
        block.title = title
        block.detail = detail
        block.outOkId = outOkId
        block.outNoId = outNoId
        val now = timeFmt.format(Date())
        flow.logs.add("$now [✎] Blok #$blockId güncellendi.")
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.tick()
    }

    fun deleteBlock(flowId: String, blockId: Int) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        if (blockId == 1) return // Başlangıç silinemez
        recordUndo(flowId, "Blok #$blockId Silindi")
        flow.blocks.removeAll { it.id == blockId }
        flow.blocks.forEach {
            if (it.outOkId == blockId) it.outOkId = null
            if (it.outNoId == blockId) it.outNoId = null
        }
        val now = timeFmt.format(Date())
        flow.logs.add("$now [-] Blok #$blockId silindi.")
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.tick()
    }

    fun duplicateBlock(flowId: String, blockId: Int) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        val block = flow.blocks.find { it.id == blockId } ?: return
        recordUndo(flowId, "Blok #$blockId Çoğaltıldı")
        val newId = (flow.blocks.maxOfOrNull { it.id } ?: 0) + 1
        val duplicated = block.copy(
            id = newId,
            title = "${block.title} (Kopya)",
            posX = block.posX + 30f,
            posY = block.posY + 30f,
            isHighlighted = false
        )
        flow.blocks.add(duplicated)
        val now = timeFmt.format(Date())
        flow.logs.add("$now [⊕] Blok #$newId olarak çoğaltıldı.")
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.click()
    }

    fun disconnectBlock(flowId: String, blockId: Int) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        recordUndo(flowId, "Blok #$blockId Bağlantıları Kesildi")
        val block = flow.blocks.find { it.id == blockId }
        block?.outOkId = null
        block?.outNoId = null
        flow.blocks.forEach {
            if (it.outOkId == blockId) it.outOkId = null
            if (it.outNoId == blockId) it.outNoId = null
        }
        val now = timeFmt.format(Date())
        flow.logs.add("$now [⊘] Blok #$blockId bağlantıları kesildi.")
        _flows.value = _flows.value.toList()
        saveFlows()
        Fx.tick()
    }

    // ================= GERÇEK ZAMANLI FİBER ÇALIŞTIRMA =================
    fun toggleFiber(flowId: String, ctx: Context) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        if (flow.isRunning) {
            stopFiber(flowId)
        } else {
            startFiber(flowId, ctx)
        }
    }

    fun startFiber(flowId: String, ctx: Context) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        if (flow.isRunning) return

        flow.isRunning = true
        val now = timeFmt.format(Date())
        val fiberTag = "Fiber #${flow.id.takeLast(4)}"
        flow.logs.add("$now [$fiberTag] ▶ Fiber akışı başlatıldı.")
        Fx.shield()
        _flows.value = _flows.value.toList()

        val job = engineScope.launch {
            var currentBlockId: Int? = 1
            var stepCount = 0

            while (isActive && flow.isRunning && currentBlockId != null && stepCount < 400) {
                stepCount++
                val block = flow.blocks.find { it.id == currentBlockId } ?: break

                block.isHighlighted = true
                _flows.value = _flows.value.toList()

                val time = timeFmt.format(Date())
                var branchDecision = true

                when (block.blockType) {
                    "BEGINNING" -> {
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (FlowBeginning) -> Başlangıç noktası tetiklendi.")
                    }
                    "WIFI_CHECK" -> {
                        val net = NetworkEngine.getActiveNet(ctx)
                        branchDecision = net.isConnected
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Wi-Fi Bağlı mı?) -> ${if (branchDecision) "EVET (SSID: ${net.ssid})" else "HAYIR"}")
                    }
                    "WIFI_OPEN_CHECK" -> {
                        val net = NetworkEngine.getActiveNet(ctx)
                        branchDecision = net.isConnected && (net.ssid.contains("Open", ignoreCase = true) || net.ssid.contains("Free", ignoreCase = true))
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Açık Ağ mı?) -> ${if (branchDecision) "GÜVENSİZ AÇIK AĞ (ALARM)" else "GÜVENLİ AĞ"}")
                    }
                    "PING" -> {
                        var pingOk = false
                        try {
                            withTimeout(1500L) {
                                pingOk = InetAddress.getByName("8.8.8.8").isReachable(1200)
                            }
                        } catch (e: Exception) {
                            pingOk = false
                        }
                        branchDecision = pingOk
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Ping 8.8.8.8) -> ${if (pingOk) "BAŞARILI (Erişim Var)" else "ZAMAN AŞIMI (Erişim Yok)"}")
                    }
                    "TEMP_CHECK" -> {
                        val hw = HardwareMonitor.sample(ctx)
                        branchDecision = hw.batteryTempC > 45f
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Termal > 45°C mi?) -> ${hw.batteryTempC}°C (${if (branchDecision) "YÜKSEK TERMAL" else "NORMAL"})")
                    }
                    "BATTERY_CHECK" -> {
                        val hw = HardwareMonitor.sample(ctx)
                        branchDecision = hw.batteryPct <= 20
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Pil Düşük mü?) -> %${hw.batteryPct} (${if (branchDecision) "KRİTİK" else "YETERLİ"})")
                    }
                    "BATTERY_CHARGING" -> {
                        val hw = HardwareMonitor.sample(ctx)
                        branchDecision = hw.batteryWatts > 0f
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (Cihaz Şarjda mı?) -> ${if (branchDecision) "ŞARJ OLUYOR (${hw.batteryWatts}W)" else "PİLLE ÇALIŞIYOR"}")
                    }
                    "FIREWALL_PARANOID" -> {
                        Prefs.putInt("fw_mode", 3)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(ctx, "⚡ Otomasyon: Kalkan PARANOID Seviyeye Alındı", Toast.LENGTH_SHORT).show()
                        }
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Güvenlik Kalkanı PARANOID Moduna Geçirildi")
                        Fx.shield()
                    }
                    "FIREWALL_STRICT" -> {
                        Prefs.putInt("fw_mode", 2)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(ctx, "⚡ Otomasyon: Kalkan STRICT Seviyeye Alındı", Toast.LENGTH_SHORT).show()
                        }
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Güvenlik Kalkanı STRICT Moduna Geçirildi")
                        Fx.shield()
                    }
                    "FIREWALL_NORMAL" -> {
                        Prefs.putInt("fw_mode", 1)
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Güvenlik Kalkanı NORMAL Seviyeye Alındı")
                        Fx.tick()
                    }
                    "KILL_SWITCH" -> {
                        Prefs.putInt("fw_active", 0)
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Acil Durum Kill-Switch Devrede!")
                        Fx.alert()
                    }
                    "ALERT" -> {
                        Fx.alert()
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Taktiksel Alarm Ses & Titreşimi Verildi")
                    }
                    "VIBRATE" -> {
                        Fx.click()
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Haptik Titreşim İletildi")
                    }
                    "CLEAN_RAM" -> {
                        System.gc()
                        withContext(Dispatchers.Main) {
                            Toast.makeText(ctx, "🧹 Otomasyon: RAM Belleği Boşaltıldı", Toast.LENGTH_SHORT).show()
                        }
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Arka Plan Belleği Temizlendi")
                    }
                    "TOAST_SHOW" -> {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(ctx, "⚡ ${block.detail.ifEmpty { "Otomasyon Bildirimi" }}", Toast.LENGTH_SHORT).show()
                        }
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Bildirim Toast Gösterildi: '${block.detail}'")
                    }
                    "FLASHLIGHT_TOGGLE" -> {
                        try {
                            val cam = ctx.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
                            val firstId = cam?.cameraIdList?.firstOrNull()
                            if (firstId != null) {
                                cam.setTorchMode(firstId, true)
                                delay(300L)
                                cam.setTorchMode(firstId, false)
                            }
                            flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Fener / Flaş Çaktırıldı")
                        } catch (e: Exception) {
                            flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Fener tetiklendi (donanım simüle edildi)")
                        }
                    }
                    "DELAY" -> {
                        val waitSec = block.detail.filter { it.isDigit() }.toIntOrNull() ?: 2
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> $waitSec Saniye Bekleniyor...")
                        delay((waitSec * 1000L).coerceAtLeast(1000L))
                    }
                    "FIBER_STOP" -> {
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} -> Fiber Kendi İsteğiyle Sonlandırıldı.")
                        break
                    }
                    else -> {
                        flow.logs.add("$time [$fiberTag] Blok #${block.id} (${block.title}) -> İşlendi")
                    }
                }

                delay(650L)
                block.isHighlighted = false
                _flows.value = _flows.value.toList()

                currentBlockId = if (branchDecision) block.outOkId else (block.outNoId ?: block.outOkId)
                delay(350L)
            }

            flow.isRunning = false
            val endNow = timeFmt.format(Date())
            flow.logs.add("$endNow [$fiberTag] ⏹ Fiber sonlandı.")
            _flows.value = _flows.value.toList()
        }

        activeJobs[flowId] = job
    }

    fun stopFiber(flowId: String) {
        val flow = _flows.value.find { it.id == flowId } ?: return
        activeJobs[flowId]?.cancel()
        activeJobs.remove(flowId)
        flow.isRunning = false
        flow.blocks.forEach { it.isHighlighted = false }
        val now = timeFmt.format(Date())
        flow.logs.add("$now [Fiber #${flow.id.takeLast(4)}] ⏹ Durduruldu.")
        _flows.value = _flows.value.toList()
        Fx.click()
    }
}

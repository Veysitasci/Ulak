package com.ulak.station.automate.model

/**
 * Automate Blok Kategorileri (LlamaLab Automate Tersine Mühendislik Renk ve Sınıfları)
 */
enum class BlockCategory(val label: String, val colorHex: Long) {
    BEGINNING("Başlangıç", 0xFF0284C7),         // Sky Blue (LlamaLab style)
    CONNECTIVITY("Ağ & Bağlantı", 0xFF2563EB),   // Indigo Blue
    HARDWARE("Donanım & Güç", 0xFFF59E0B),      // Amber
    SECURITY("Güvenlik & Kalkan", 0xFF8B5CF6),   // Violet
    ACTION("İşlem & Eylem", 0xFF10B981),        // Emerald Green
    SYSTEM("Sistem & Bellek", 0xFFEC4899),      // Pink / Rose
    FLOW_CONTROL("Akış Kontrolü", 0xFF64748B)   // Slate Gray
}

/**
 * Akış Şeması Bloğu (2D Koordinatlı, Pin Giriş/Çıkışlı)
 */
data class FlowBlock(
    val id: Int,
    val category: BlockCategory,
    var title: String,
    var detail: String,
    val blockType: String = "GENERIC",
    var posX: Float = 60f,
    var posY: Float = 60f,
    val inPin: Boolean = true,
    var outOkId: Int? = null,
    var outNoId: Int? = null,
    var isHighlighted: Boolean = false
) {
    fun deepCopy(): FlowBlock {
        return copy()
    }
}

/**
 * Akış Yapılandırma ve İzin Ayarları (Automate Flow Settings)
 */
data class FlowSettings(
    var bootStart: Boolean = false,
    var maxFibers: Int = 1,
    var keepScreenOn: Boolean = false,
    var detailedLogging: Boolean = true,
    var parallel: Boolean = false,
    var permissions: List<String> = listOf("Ağ & Wi-Fi", "Sistem Haptiği", "Donanım İzleme")
)

/**
 * Otomasyon Akış Modeli
 */
data class AutomateFlow(
    val id: String,
    var title: String,
    var description: String,
    var isRunning: Boolean = false,
    var settings: FlowSettings = FlowSettings(),
    val blocks: MutableList<FlowBlock> = mutableListOf(),
    val logs: MutableList<String> = mutableListOf()
) {
    fun deepCopyBlocks(): MutableList<FlowBlock> {
        return blocks.map { it.deepCopy() }.toMutableList()
    }
}

/**
 * Geri Alma Geçmişi (Undo Snapshot)
 */
data class UndoSnapshot(
    val flowId: String,
    val actionName: String,
    val blocks: List<FlowBlock>
)

/**
 * Hazır Akış Şablonları (Templates)
 */
data class FlowTemplate(
    val title: String,
    val description: String,
    val category: String,
    val blocksProvider: () -> List<FlowBlock>
)

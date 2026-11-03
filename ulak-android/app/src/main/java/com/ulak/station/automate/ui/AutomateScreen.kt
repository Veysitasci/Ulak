package com.ulak.station.automate.ui

import android.content.Context
import androidx.compose.animation.core.*
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.automate.engine.AutomateEngine
import com.ulak.station.automate.model.BlockCategory
import com.ulak.station.automate.model.FlowBlock
import com.ulak.station.core.*

/**
 * Akış Otomasyonu: LlamaLab Automate arayüz stilinde 2D Serbest Tuval,
 * Blok Sürükleme, Basılı Tutma Menüleri, Geri Alma (Undo) ve Akış Ayarları.
 */
@Composable
fun AutomateScreen(ctx: Context) {
    val flows by AutomateEngine.flows.collectAsState()
    val selectedId by AutomateEngine.selectedFlowId.collectAsState()
    val undoAvailable by AutomateEngine.undoAvailable.collectAsState()
    val currentFlow = flows.find { it.id == selectedId } ?: flows.firstOrNull()

    var showNewFlowDialog by remember { mutableStateOf(false) }
    var showAddBlockDialog by remember { mutableStateOf(false) }
    var addBlockPos by remember { mutableStateOf<Offset?>(null) }
    var editingBlock by remember { mutableStateOf<FlowBlock?>(null) }
    var contextMenuBlock by remember { mutableStateOf<FlowBlock?>(null) }
    var showFlowSettings by remember { mutableStateOf(false) }
    var showLogs by remember { mutableStateOf(false) }

    // Pulsing fiber animation for active wires
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulsePhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )

    // ================= MODAL 1: YENİ AKIŞ (ŞABLONLAR) =================
    if (showNewFlowDialog) {
        NewFlowDialog(
            onDismiss = { showNewFlowDialog = false },
            onCreated = { showNewFlowDialog = false }
        )
    }

    // ================= MODAL 2: BLOK EKLEME KATALOĞU =================
    if (showAddBlockDialog && currentFlow != null) {
        val density = LocalDensity.current
        AddBlockDialog(
            onDismiss = {
                showAddBlockDialog = false
                addBlockPos = null
            },
            onSelectTemplate = { cat, title, desc, type ->
                val posX = addBlockPos?.let { it.x / density.density } ?: 60f
                val posY = addBlockPos?.let { it.y / density.density } ?: (currentFlow.blocks.size * 120f + 60f)

                AutomateEngine.addBlock(
                    flowId = currentFlow.id,
                    category = cat,
                    title = title,
                    detail = desc,
                    blockType = type,
                    posX = posX,
                    posY = posY
                )
                showAddBlockDialog = false
                addBlockPos = null
            }
        )
    }

    // ================= MODAL 3: BLOK DETAY DÜZENLEME =================
    editingBlock?.let { block ->
        if (currentFlow != null) {
            EditBlockDialog(
                block = block,
                allBlocks = currentFlow.blocks,
                onDismiss = { editingBlock = null },
                onSave = { title, detail, outOkId, outNoId ->
                    AutomateEngine.updateBlockConfig(
                        flowId = currentFlow.id,
                        blockId = block.id,
                        title = title,
                        detail = detail,
                        outOkId = outOkId,
                        outNoId = outNoId
                    )
                    editingBlock = null
                },
                onDelete = {
                    AutomateEngine.deleteBlock(currentFlow.id, block.id)
                    editingBlock = null
                }
            )
        }
    }

    // ================= MODAL 4: BASILI TUTMA EYLEMLERİ =================
    contextMenuBlock?.let { block ->
        if (currentFlow != null) {
            BlockContextMenuDialog(
                block = block,
                onDismiss = { contextMenuBlock = null },
                onEdit = {
                    val b = block
                    contextMenuBlock = null
                    editingBlock = b
                },
                onDuplicate = {
                    AutomateEngine.duplicateBlock(currentFlow.id, block.id)
                    contextMenuBlock = null
                },
                onDisconnect = {
                    AutomateEngine.disconnectBlock(currentFlow.id, block.id)
                    contextMenuBlock = null
                },
                onDelete = {
                    AutomateEngine.deleteBlock(currentFlow.id, block.id)
                    contextMenuBlock = null
                }
            )
        }
    }

    // ================= MODAL 5: AKIŞ AYARLARI =================
    if (showFlowSettings && currentFlow != null) {
        FlowSettingsDialog(
            flow = currentFlow,
            onDismiss = { showFlowSettings = false },
            onSaveSettings = { title, desc, settings ->
                AutomateEngine.updateFlowInfo(currentFlow.id, title, desc)
                AutomateEngine.updateFlowSettings(currentFlow.id, settings)
                showFlowSettings = false
            }
        )
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        // 1. ÜST BİLGİ & AKIŞ SEÇİCİ
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Akış Otomasyonu",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = LocalPal.current.t1
                )
                Text(
                    text = "Görsel Akış Çizimi ve Fiber Motoru",
                    fontSize = 11.5.sp,
                    color = LocalPal.current.t2
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                UButton(
                    text = "+ Yeni Akış",
                    icon = Icons.Rounded.Add,
                    color = Amber
                ) {
                    showNewFlowDialog = true
                    Fx.tick()
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        // Akış Seçici Pill Çubuğu
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            flows.forEach { f ->
                val isSel = f.id == currentFlow?.id
                val statusDot = if (f.isRunning) " ●" else ""
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (isSel) Amber.copy(alpha = 0.16f) else LocalPal.current.surfaceSub.copy(alpha = 0.5f))
                        .border(1.dp, if (isSel) Amber else LocalPal.current.border.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .clickable {
                            AutomateEngine.selectFlow(f.id)
                            Fx.tick()
                        }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "${f.title}$statusDot",
                        fontSize = 11.5.sp,
                        fontWeight = if (isSel) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSel) Amber else LocalPal.current.t2
                    )
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        if (currentFlow != null) {
            // 2. KONTROL ARAÇ ÇUBUĞU (Başlat/Durdur, Geri Al, Ayarlar, + Blok)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = LocalPal.current.surface,
                border = androidx.compose.foundation.BorderStroke(1.dp, LocalPal.current.border.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Sol Taraf: Durum
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (currentFlow.isRunning) Accent else LocalPal.current.t3)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = if (currentFlow.isRunning) "Fiber Aktif" else "Durduruldu",
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (currentFlow.isRunning) Accent else LocalPal.current.t3
                        )
                    }

                    // Sağ Taraf Eylemleri
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Geri Alma (Undo)
                        IconButton(
                            onClick = { AutomateEngine.undo(currentFlow.id) },
                            enabled = undoAvailable,
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                Icons.Rounded.Undo,
                                contentDescription = "Geri Al",
                                tint = if (undoAvailable) Accent else LocalPal.current.t3.copy(alpha = 0.4f),
                                modifier = Modifier.size(19.dp)
                            )
                        }

                        // Akış Ayarları
                        IconButton(
                            onClick = { showFlowSettings = true },
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                Icons.Rounded.Settings,
                                contentDescription = "Ayarlar",
                                tint = LocalPal.current.t2,
                                modifier = Modifier.size(19.dp)
                            )
                        }

                        // Günlük Toggle
                        IconButton(
                            onClick = { showLogs = !showLogs },
                            modifier = Modifier.size(34.dp)
                        ) {
                            Icon(
                                Icons.Rounded.Terminal,
                                contentDescription = "Günlük",
                                tint = if (showLogs) Violet else LocalPal.current.t2,
                                modifier = Modifier.size(19.dp)
                            )
                        }

                        // + Blok Ekle
                        UButton(
                            text = "+ Blok",
                            color = Cyan
                        ) {
                            showAddBlockDialog = true
                            Fx.tick()
                        }

                        // Başlat / Durdur
                        UButtonPrimary(
                            text = if (currentFlow.isRunning) "Durdur" else "Başlat",
                            icon = if (currentFlow.isRunning) Icons.Rounded.Stop else Icons.Rounded.PlayArrow,
                            color = if (currentFlow.isRunning) Danger else Accent
                        ) {
                            AutomateEngine.toggleFiber(currentFlow.id, ctx)
                        }
                    }
                }
            }

            // 3. FİBER LOG ÇIKTISI (Drawer/Panel)
            if (showLogs) {
                Spacer(Modifier.height(6.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 110.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF04060A))
                        .border(1.dp, LocalPal.current.border.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                        .padding(8.dp)
                ) {
                    currentFlow.logs.takeLast(5).forEach { logLine ->
                        val lineColor = when {
                            logLine.contains("▶") || logLine.contains("EVET") -> Accent
                            logLine.contains("⚡") || logLine.contains("HAYIR") -> Amber
                            logLine.contains("⏹") -> Danger
                            else -> LocalPal.current.t2
                        }
                        Text(logLine, fontSize = 9.5.sp, fontFamily = Mono, color = lineColor)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // 4. 2D SERBEST KAYDIRILABİLİR & SÜRÜKLENEBİLİR TUVAL (FLOWCHART CANVAS)
            FlowCanvas(
                blocks = currentFlow.blocks,
                isRunning = currentFlow.isRunning,
                pulsePhase = pulsePhase,
                onBlockMoved = { blockId, newX, newY ->
                    AutomateEngine.updateBlockPosition(currentFlow.id, blockId, newX, newY)
                },
                onBlockTapped = { block ->
                    editingBlock = block
                    Fx.tick()
                },
                onBlockLongPressed = { block ->
                    contextMenuBlock = block
                    Fx.click()
                },
                onCanvasLongPressed = { offset ->
                    addBlockPos = offset
                    showAddBlockDialog = true
                    Fx.click()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )

            // İpucu Barı
            Text(
                text = "İpucu: Blokları basılı tutarak sürükleyebilir, boş alana basılı tutarak yeni blok ekleyebilirsiniz.",
                fontSize = 10.5.sp,
                color = LocalPal.current.t3,
                modifier = Modifier.padding(top = 4.dp, start = 4.dp)
            )
        }
    }
}

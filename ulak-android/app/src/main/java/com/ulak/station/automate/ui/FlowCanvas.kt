package com.ulak.station.automate.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ulak.station.automate.model.BlockCategory
import com.ulak.station.automate.model.FlowBlock
import com.ulak.station.core.Accent
import com.ulak.station.core.Danger
import com.ulak.station.core.LocalPal
import com.ulak.station.core.Mono
import kotlin.math.roundToInt

private const val BLOCK_WIDTH_DP = 220f
private const val BLOCK_HEIGHT_DP = 82f

/**
 * 2D Serbest Kaydırılabilir, Blok Sürüklenebilir ve Basılı Tutma Destekli
 * LlamaLab Automate Çizim Tuvali (Pannable Flowchart Canvas).
 */
@Composable
fun FlowCanvas(
    blocks: List<FlowBlock>,
    isRunning: Boolean,
    pulsePhase: Float,
    onBlockMoved: (blockId: Int, newX: Float, newY: Float) -> Unit,
    onBlockTapped: (FlowBlock) -> Unit,
    onBlockLongPressed: (FlowBlock) -> Unit,
    onCanvasLongPressed: (canvasOffset: Offset) -> Unit,
    modifier: Modifier = Modifier
) {
    var panOffset by remember { mutableStateOf(Offset.Zero) }
    val density = LocalDensity.current

    val blockWidthPx = with(density) { BLOCK_WIDTH_DP.dp.toPx() }
    val blockHeightPx = with(density) { BLOCK_HEIGHT_DP.dp.toPx() }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color(0xFF070B12))
            .border(1.dp, LocalPal.current.border.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            .pointerInput(Unit) {
                // Boş Tuval Basılı Tutma (Yeni Blok Ekle) ve 2D Tuval Kaydırma (Pan)
                detectTransformGestures { _, pan, _, _ ->
                    panOffset += pan
                }
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onLongPress = { tapPos ->
                        val canvasPos = tapPos - panOffset
                        onCanvasLongPressed(canvasPos)
                    }
                )
            }
    ) {
        // 1. Sonsuz / Kaydırılabilir Blueprint Izgara Arka Planı (Dotted Grid)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val step = 20.dp.toPx()
            val offsetX = (panOffset.x % step + step) % step
            val offsetY = (panOffset.y % step + step) % step

            var x = offsetX
            while (x < size.width) {
                var y = offsetY
                while (y < size.height) {
                    drawCircle(
                        color = Color(0x2264748B),
                        radius = 1.0f,
                        center = Offset(x, y)
                    )
                    y += step
                }
                x += step
            }
        }

        // 2. Bezier Bağlantı Telleri (Wires & Pulse Packets)
        Canvas(modifier = Modifier.fillMaxSize()) {
            blocks.forEach { source ->
                // OK / YES Çıkış Teli
                source.outOkId?.let { targetId ->
                    val target = blocks.find { it.id == targetId }
                    if (target != null) {
                        val start = Offset(
                            source.posX * density.density + blockWidthPx / 2f + panOffset.x,
                            source.posY * density.density + blockHeightPx + panOffset.y
                        )
                        val end = Offset(
                            target.posX * density.density + blockWidthPx / 2f + panOffset.x,
                            target.posY * density.density + panOffset.y
                        )
                        drawWire(start, end, Accent, isRunning, pulsePhase)
                    }
                }

                // NO Çıkış Teli (Koşul Blokları)
                source.outNoId?.let { targetId ->
                    val target = blocks.find { it.id == targetId }
                    if (target != null) {
                        val start = Offset(
                            source.posX * density.density + 36.dp.toPx() + panOffset.x,
                            source.posY * density.density + blockHeightPx + panOffset.y
                        )
                        val end = Offset(
                            target.posX * density.density + blockWidthPx / 2f + panOffset.x,
                            target.posY * density.density + panOffset.y
                        )
                        drawWire(start, end, Danger, isRunning, pulsePhase)
                    }
                }
            }
        }

        // 3. Serbest Konumlandırılabilir & Sürüklenebilir Bloklar
        blocks.forEach { block ->
            val blockLeft = (block.posX * density.density + panOffset.x).roundToInt()
            val blockTop = (block.posY * density.density + panOffset.y).roundToInt()

            Box(
                modifier = Modifier
                    .offset { IntOffset(blockLeft, blockTop) }
                    .width(BLOCK_WIDTH_DP.dp)
                    .pointerInput(block.id) {
                        // Basılı tutma menüsü ve tıklama
                        detectTapGestures(
                            onTap = { onBlockTapped(block) },
                            onLongPress = { onBlockLongPressed(block) }
                        )
                    }
                    .pointerInput(block.id) {
                        // Sürükle ve Bırak (Freeform Drag)
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val newX = block.posX + (dragAmount.x / density.density)
                            val newY = block.posY + (dragAmount.y / density.density)
                            onBlockMoved(block.id, newX, newY)
                        }
                    }
            ) {
                DraggableAutomateBlock(block = block)
            }
        }
    }
}

/**
 * Automate Blok Tasarımı (Kategori Başlığı, ID Rozeti, IN/OUT Pinleri)
 */
@Composable
private fun DraggableAutomateBlock(block: FlowBlock) {
    val blockColor = Color(block.category.colorHex)
    val glowColor by animateColorAsState(
        targetValue = if (block.isHighlighted) Accent else blockColor,
        animationSpec = tween(220),
        label = "glow"
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.fillMaxWidth()
    ) {
        // Üst Giriş Pini (IN Pin)
        if (block.inPin) {
            Box(
                modifier = Modifier
                    .size(14.dp, 6.dp)
                    .clip(RoundedCornerShape(bottomStart = 3.dp, bottomEnd = 3.dp))
                    .background(blockColor)
            )
        } else {
            Spacer(Modifier.height(6.dp))
        }

        // Blok Gövdesi
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF111827))
                .border(
                    width = if (block.isHighlighted) 2.dp else 1.dp,
                    color = glowColor.copy(alpha = if (block.isHighlighted) 1f else 0.7f),
                    shape = RoundedCornerShape(10.dp)
                )
        ) {
            Column {
                // Kategori Başlık Çizgisi
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(blockColor.copy(alpha = 0.22f))
                        .padding(horizontal = 9.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(blockColor)
                                .padding(horizontal = 5.dp, vertical = 1.5.dp)
                        ) {
                            Text(
                                text = "#${block.id}",
                                fontSize = 9.sp,
                                fontFamily = Mono,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = block.title,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            maxLines = 1
                        )
                    }

                    Text(
                        text = block.category.label,
                        fontSize = 8.5.sp,
                        color = blockColor,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                // Blok Parametresi
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 9.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = block.detail,
                        fontSize = 10.5.sp,
                        color = LocalPal.current.t2,
                        maxLines = 1
                    )

                    if (block.isHighlighted) {
                        Text(
                            text = "⚡ Fiber",
                            fontSize = 9.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = Accent
                        )
                    } else {
                        Icon(
                            Icons.Rounded.Edit,
                            contentDescription = null,
                            tint = LocalPal.current.t3,
                            modifier = Modifier.size(11.dp)
                        )
                    }
                }
            }
        }

        // Çıkış Pinleri (OK / YES / NO)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (block.outNoId != null) Arrangement.SpaceBetween else Arrangement.Center
        ) {
            if (block.outNoId != null) {
                Box(
                    modifier = Modifier
                        .padding(start = 14.dp)
                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                        .background(Danger)
                        .padding(horizontal = 5.dp, vertical = 1.5.dp)
                ) {
                    Text(
                        text = "NO ➔ #${block.outNoId}",
                        fontSize = 7.5.sp,
                        fontFamily = Mono,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                    .background(Accent)
                    .padding(horizontal = 6.dp, vertical = 1.5.dp)
            ) {
                Text(
                    text = if (block.outOkId != null) "OK ➔ #${block.outOkId}" else "DURDUR",
                    fontSize = 7.5.sp,
                    fontFamily = Mono,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

/**
 * Bloklar arası yumuşak Bezier Tel ve Sinyal Paketi Çizimi
 */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawWire(
    start: Offset,
    end: Offset,
    color: Color,
    isRunning: Boolean,
    pulsePhase: Float
) {
    val deltaY = (end.y - start.y).coerceAtLeast(40f)
    val c1 = Offset(start.x, start.y + deltaY * 0.5f)
    val c2 = Offset(end.x, end.y - deltaY * 0.5f)

    val path = Path().apply {
        moveTo(start.x, start.y)
        cubicTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y)
    }

    // Tel Çizimi
    drawPath(
        path = path,
        color = if (isRunning) color else Color(0xFF283548),
        style = Stroke(
            width = 2.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 5f), 0f)
        )
    )

    // Canlı Sinyal Paketi (Hareket eden nokta)
    if (isRunning) {
        val t = pulsePhase
        val px = (1 - t) * (1 - t) * (1 - t) * start.x + 3 * (1 - t) * (1 - t) * t * c1.x + 3 * (1 - t) * t * t * c2.x + t * t * t * end.x
        val py = (1 - t) * (1 - t) * (1 - t) * start.y + 3 * (1 - t) * (1 - t) * t * c1.y + 3 * (1 - t) * t * t * c2.y + t * t * t * end.y

        drawCircle(
            color = Color.White,
            radius = 2.8.dp.toPx(),
            center = Offset(px, py)
        )
    }
}

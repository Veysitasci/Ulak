package com.ulak.station.core

import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.core.content.ContextCompat
import com.ulak.station.R

private val R18 = RoundedCornerShape(18.dp)
private val R14 = RoundedCornerShape(14.dp)
private val R10 = RoundedCornerShape(10.dp)

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    accent: Color = Accent,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val p = LocalPal.current
    Column(
        modifier
            .clip(R18)
            .background(p.surface)
            .border(1.dp, p.border.copy(alpha = 0.65f), R18)
            .then(if (onClick != null) Modifier.clickable { Fx.tick(); onClick() } else Modifier)
            .padding(14.dp),
        content = content
    )
}

@Composable
fun IconBox(icon: ImageVector, color: Color = Accent, size: Dp = 38.dp) {
    Box(
        Modifier
            .size(size)
            .clip(R10)
            .background(color.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = color, modifier = Modifier.size(size * 0.54f))
    }
}

@Composable
fun IconBox(painter: Painter, color: Color = Accent, size: Dp = 38.dp) {
    Box(
        Modifier
            .size(size)
            .clip(R10)
            .background(color.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(painter, null, tint = color, modifier = Modifier.size(size * 0.54f))
    }
}

// Canlı Kalkan Rozeti (Güvenlik Duvarı için animasyonlu siber kalkan)
@Composable
fun LivingShieldBadge(active: Boolean = true, color: Color = Accent, size: Dp = 46.dp) {
    val inf = rememberInfiniteTransition(label = "shb")
    val rot by inf.animateFloat(0f, 360f, infiniteRepeatable(tween(6000, easing = LinearEasing)), label = "r")
    val pulse by inf.animateFloat(0.5f, 0.95f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "p")

    Box(
        Modifier
            .size(size)
            .clip(R14)
            .background(color.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize().padding(3.dp)) {
            rotate(rot) {
                drawCircle(
                    color.copy(alpha = pulse * 0.35f),
                    this.size.minDimension / 2f,
                    center,
                    style = Stroke(1.2f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f)))
                )
            }
        }
        Icon(
            painter = painterResource(id = if (active) R.drawable.ic_hero_shield_check_solid else R.drawable.ic_hero_shield_exclamation),
            contentDescription = "Shield",
            tint = color,
            modifier = Modifier.size(size * 0.56f)
        )
    }
}

// Canlı Radar Rozeti (P2P Radar & Ağ Takipçisi için)
@Composable
fun LivingRadarBadge(color: Color = Cyan, size: Dp = 46.dp) {
    val inf = rememberInfiniteTransition(label = "rdb")
    val rot by inf.animateFloat(0f, 360f, infiniteRepeatable(tween(3000, easing = LinearEasing)), label = "r")

    Box(
        Modifier
            .size(size)
            .clip(R14)
            .background(color.copy(alpha = 0.12f)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize().padding(3.dp)) {
            rotate(rot) {
                drawCircle(
                    Brush.sweepGradient(0f to Color.Transparent, 0.8f to Color.Transparent, 1f to color.copy(alpha = 0.5f)),
                    this.size.minDimension / 2f,
                    center
                )
            }
        }
        Icon(
            painter = painterResource(id = R.drawable.ic_hero_signal),
            contentDescription = "Radar",
            tint = color,
            modifier = Modifier.size(size * 0.52f)
        )
    }
}

// Canlı Donanım/İşlemci Rozeti
@Composable
fun LivingCpuBadge(color: Color = Accent, size: Dp = 46.dp) {
    val inf = rememberInfiniteTransition(label = "cpub")
    val pulse by inf.animateFloat(0.6f, 1f, infiniteRepeatable(tween(1400), RepeatMode.Reverse), label = "p")

    Box(
        Modifier
            .size(size)
            .clip(R14)
            .background(color.copy(alpha = 0.12f * pulse)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            painter = painterResource(id = R.drawable.ic_hero_cpu_chip_solid),
            contentDescription = "CPU",
            tint = color,
            modifier = Modifier.size(size * 0.56f)
        )
    }
}

@Composable
fun Header(icon: ImageVector, title: String, sub: String, color: Color = Accent) = GlassCard(Modifier.fillMaxWidth(), color) {
    val p = LocalPal.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconBox(icon, color, 44.dp)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = p.t1)
            Text(sub, fontSize = 12.sp, color = p.t2)
        }
    }
}

@Composable
fun Header(painter: Painter, title: String, sub: String, color: Color = Accent) = GlassCard(Modifier.fillMaxWidth(), color) {
    val p = LocalPal.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        IconBox(painter, color, 44.dp)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = p.t1)
            Text(sub, fontSize = 12.sp, color = p.t2)
        }
    }
}

@Composable
fun Header(title: String, sub: String, color: Color = Accent, iconSlot: @Composable () -> Unit) = GlassCard(Modifier.fillMaxWidth(), color) {
    val p = LocalPal.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        iconSlot()
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 17.sp, color = p.t1)
            Text(sub, fontSize = 12.sp, color = p.t2)
        }
    }
}

@Composable
fun SectionTitle(text: String, icon: ImageVector? = null, trailing: @Composable () -> Unit = {}) {
    val p = LocalPal.current
    Row(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        icon?.let {
            Icon(it, null, tint = Accent, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(7.dp))
        }
        Text(text, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = p.t1, modifier = Modifier.weight(1f))
        trailing()
    }
}

@Composable
fun SectionTitle(text: String, painter: Painter? = null, trailing: @Composable () -> Unit = {}) {
    val p = LocalPal.current
    Row(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        painter?.let {
            Icon(it, null, tint = Accent, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(7.dp))
        }
        Text(text, fontWeight = FontWeight.Bold, fontSize = 13.5.sp, color = p.t1, modifier = Modifier.weight(1f))
        trailing()
    }
}

// Sadeleştirilmiş Liste Satırı (Box-in-a-box elendi, hafif ve modern)
@Composable
fun SettingRow(
    icon: ImageVector,
    title: String,
    sub: String,
    color: Color = Accent,
    trailing: @Composable () -> Unit = {}
) {
    val p = LocalPal.current
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
            .clip(R10)
            .background(p.surfaceSub.copy(alpha = 0.5f))
            .border(1.dp, p.border.copy(alpha = 0.35f), R10)
            .padding(horizontal = 11.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconBox(icon, color, 32.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = p.t1, maxLines = 1)
            if (sub.isNotEmpty()) {
                Text(sub, fontSize = 11.sp, color = p.t2, maxLines = 2, lineHeight = 14.sp)
            }
        }
        Spacer(Modifier.width(8.dp))
        trailing()
    }
}

@Composable
fun SettingRow(
    painter: Painter,
    title: String,
    sub: String,
    color: Color = Accent,
    trailing: @Composable () -> Unit = {}
) {
    val p = LocalPal.current
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
            .clip(R10)
            .background(p.surfaceSub.copy(alpha = 0.5f))
            .border(1.dp, p.border.copy(alpha = 0.35f), R10)
            .padding(horizontal = 11.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconBox(painter, color, 32.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = p.t1, maxLines = 1)
            if (sub.isNotEmpty()) {
                Text(sub, fontSize = 11.sp, color = p.t2, maxLines = 2, lineHeight = 14.sp)
            }
        }
        Spacer(Modifier.width(8.dp))
        trailing()
    }
}

@Composable
fun UChip(text: String, color: Color = Accent) {
    Row(
        Modifier
            .clip(CircleShape)
            .background(color.copy(alpha = 0.14f))
            .padding(horizontal = 9.dp, vertical = 3.5.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(5.dp).clip(CircleShape).background(color))
        Spacer(Modifier.width(5.dp))
        Text(text, fontSize = 10.5.sp, color = color, fontWeight = FontWeight.SemiBold)
    }
}

// 1. KADEME: Primary Filled Button (Ana Eylemler)
@Composable
fun UButtonPrimary(
    text: String,
    icon: ImageVector? = null,
    color: Color = Accent,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = { Fx.tick(); onClick() },
        enabled = enabled,
        modifier = modifier.heightIn(min = 40.dp),
        shape = R10,
        colors = ButtonDefaults.buttonColors(
            containerColor = color,
            contentColor = Color.White
        ),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
    ) {
        icon?.let { Icon(it, null, Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

// 2. KADEME: Tonal Button (İkincil Eylemler - Standart UButton)
@Composable
fun UButton(
    text: String,
    icon: ImageVector? = null,
    color: Color = Accent,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    FilledTonalButton(
        onClick = { Fx.tick(); onClick() },
        enabled = enabled,
        modifier = modifier.heightIn(min = 38.dp),
        shape = R10,
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = color.copy(alpha = 0.15f),
            contentColor = color
        ),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp)
    ) {
        icon?.let { Icon(it, null, Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
fun UButton(
    text: String,
    painter: Painter,
    color: Color = Accent,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    FilledTonalButton(
        onClick = { Fx.tick(); onClick() },
        enabled = enabled,
        modifier = modifier.heightIn(min = 38.dp),
        shape = R10,
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = color.copy(alpha = 0.15f),
            contentColor = color
        ),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp)
    ) {
        Icon(painter, null, Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

// 3. KADEME: Outlined / Subtle Button
@Composable
fun UButtonOutlined(
    text: String,
    icon: ImageVector? = null,
    color: Color = Accent,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = { Fx.tick(); onClick() },
        enabled = enabled,
        modifier = modifier.heightIn(min = 38.dp),
        shape = R10,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color),
        border = BorderStroke(1.dp, color.copy(alpha = 0.4f)),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 7.dp)
    ) {
        icon?.let { Icon(it, null, Modifier.size(16.dp)); Spacer(Modifier.width(6.dp)) }
        Text(text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

@Composable
fun SegmentedTabs(
    tabs: List<String>,
    selectedIdx: Int,
    onSelect: (Int) -> Unit,
    color: Color = Accent
) {
    val p = LocalPal.current
    Row(
        Modifier
            .fillMaxWidth()
            .clip(R10)
            .background(p.surfaceSub.copy(alpha = 0.8f))
            .border(1.dp, p.border.copy(alpha = 0.4f), R10)
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        tabs.forEachIndexed { idx, title ->
            val sel = selectedIdx == idx
            Box(
                Modifier
                    .weight(1f)
                    .clip(R10)
                    .background(if (sel) color.copy(alpha = 0.22f) else Color.Transparent)
                    .clickable { Fx.tick(); onSelect(idx) }
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    title,
                    fontSize = 11.5.sp,
                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Medium,
                    color = if (sel) color else p.t2,
                    maxLines = 1
                )
            }
        }
    }
}

@Composable
fun BentoDialog(title: String, onDismiss: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val p = LocalPal.current
    Dialog(onDismissRequest = onDismiss) {
        GlassCard(Modifier.fillMaxWidth(), Accent) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = p.t1)
                IconButton(onClick = onDismiss, Modifier.size(28.dp)) {
                    Icon(Icons.Rounded.Close, null, tint = p.t2, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
fun RingGauge(value: Float, label: String, center: String, sub: String, color: Color, modifier: Modifier = Modifier) {
    val p = LocalPal.current
    val v by animateFloatAsState(value.coerceIn(0f, 1f), spring(stiffness = Spring.StiffnessLow), label = "g")
    GlassCard(modifier, color) {
        Text(label, fontSize = 10.sp, color = p.t3, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Box(
            Modifier
                .fillMaxWidth()
                .height(82.dp)
                .padding(top = 4.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(Modifier.size(74.dp)) {
                drawArc(color.copy(alpha = 0.12f), 135f, 270f, false, style = Stroke(8f, cap = StrokeCap.Round))
                drawArc(
                    Brush.sweepGradient(listOf(color.copy(alpha = 0.4f), color, color.copy(alpha = 0.4f))),
                    135f,
                    270f * v,
                    false,
                    style = Stroke(8f, cap = StrokeCap.Round)
                )
            }
            Text(center, fontFamily = Mono, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = p.t1)
        }
        Text(sub, fontSize = 10.sp, color = p.t2, maxLines = 1)
    }
}

@Composable
fun Sparkline(values: List<Float>, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        if (values.size < 2) return@Canvas
        val mx = (values.maxOrNull() ?: 1f).coerceAtLeast(0.001f)
        val dx = size.width / (values.size - 1)
        val path = Path()
        values.forEachIndexed { i, v ->
            val x = i * dx
            val y = size.height - (v / mx * size.height * 0.85f).coerceAtMost(size.height)
            if (i == 0) path.moveTo(x, y) else {
                val px = (i - 1) * dx
                val py = size.height - (values[i - 1] / mx * size.height * 0.85f).coerceAtMost(size.height)
                path.cubicTo(px + dx / 2, py, x - dx / 2, y, x, y)
            }
        }
        val fill = Path().apply {
            addPath(path)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(fill, Brush.verticalGradient(listOf(color.copy(alpha = 0.25f), Color.Transparent)))
        drawPath(path, color, style = Stroke(2.5f, cap = StrokeCap.Round))
    }
}

@Composable
fun Stat(label: String, value: String, sub: String, color: Color = Accent, modifier: Modifier = Modifier) = GlassCard(modifier, color) {
    val p = LocalPal.current
    Text(label, fontSize = 9.5.sp, color = p.t3, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Spacer(Modifier.height(3.dp))
    Text(value, fontSize = 17.sp, color = color, fontWeight = FontWeight.Bold, fontFamily = Mono, maxLines = 1)
    Spacer(Modifier.height(2.dp))
    Text(sub, fontSize = 10.5.sp, color = p.t2, maxLines = 1)
}

@Composable
fun Console(text: String, title: String = "Konsol Çıktısı", modifier: Modifier = Modifier) {
    val p = LocalPal.current
    val clip = LocalClipboardManager.current
    GlassCard(modifier.fillMaxWidth(), Cyan) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            listOf(Danger, Amber, Accent).forEach {
                Box(Modifier.padding(end = 5.dp).size(8.dp).clip(CircleShape).background(it))
            }
            Text(title, fontSize = 11.5.sp, color = p.t2, modifier = Modifier.weight(1f).padding(start = 6.dp))
            IconButton(onClick = { Fx.tick(); clip.setText(AnnotatedString(text)) }, Modifier.size(26.dp)) {
                Icon(Icons.Rounded.ContentCopy, null, tint = p.t2, modifier = Modifier.size(15.dp))
            }
        }
        Spacer(Modifier.height(8.dp))
        SelectionContainer {
            Text(
                text,
                fontFamily = Mono,
                fontSize = 11.sp,
                lineHeight = 15.sp,
                color = if (p.dark) Color(0xFFE2E8F0) else p.t1,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 80.dp, max = 360.dp)
                    .clip(R10)
                    .background(if (p.dark) Color(0xF2060910) else Color(0xFFF1F5F9))
                    .verticalScroll(rememberScrollState())
                    .padding(10.dp)
            )
        }
    }
}

@Composable
fun ScreenList(content: LazyListScope.() -> Unit) = LazyColumn(
    Modifier.fillMaxSize(),
    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
    verticalArrangement = Arrangement.spacedBy(11.dp),
    content = content
)

@Composable
fun rememberPerms(vararg perms: String): Pair<Boolean, () -> Unit> {
    val ctx = LocalContext.current
    fun check() = perms.all { ContextCompat.checkSelfPermission(ctx, it) == PackageManager.PERMISSION_GRANTED }
    var ok by remember { mutableStateOf(check()) }
    val l = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { ok = check() }
    return ok to { l.launch(arrayOf(*perms)) }
}

@Composable
fun PermCard(text: String, request: () -> Unit) = GlassCard(Modifier.fillMaxWidth(), Amber) {
    Text(text, fontSize = 12.sp, color = LocalPal.current.t2)
    Spacer(Modifier.height(8.dp))
    UButton("İzin Ver", color = Amber, onClick = request)
}

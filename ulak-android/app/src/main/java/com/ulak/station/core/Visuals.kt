package com.ulak.station.core

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlin.math.*
import kotlin.random.Random

// ================= CANLI ARKA PLAN (Parçacık Ağı / Siber Dalga / Siber Akış) =================
class TouchTracker { var pos by mutableStateOf<Offset?>(null) }

fun Modifier.trackTouch(t: TouchTracker) = pointerInput(Unit) {
    awaitPointerEventScope {
        while (true) {
            val e = awaitPointerEvent(PointerEventPass.Initial)
            val c = e.changes.firstOrNull() ?: continue
            t.pos = if (c.pressed) c.position else null
        }
    }
}

private class Pt(var x: Float, var y: Float, var vx: Float, var vy: Float, val r: Float, val acc: Boolean, val sp: Float)

@Composable
fun LiveBackground(mode: Int, touch: TouchTracker, modifier: Modifier = Modifier) {
    if (mode == 3) return
    val pts = remember { ArrayList<Pt>() }
    var box by remember { mutableStateOf(IntSize.Zero) }
    var frame by remember { mutableLongStateOf(0L) }
    val dark = LocalPal.current.dark
    LaunchedEffect(box, mode) {
        if (box.width == 0 || mode == 3) return@LaunchedEffect
        val w = box.width.toFloat(); val h = box.height.toFloat()
        if (pts.isEmpty()) repeat((w * h / 24000).toInt().coerceIn(20, 42)) {
            val a = Random.nextFloat() * 6.28f; val s = 0.9f * (.35f + Random.nextFloat() * .65f)
            pts.add(Pt(Random.nextFloat() * w, Random.nextFloat() * h, cos(a) * s, sin(a) * s, 1.6f + Random.nextFloat() * 1.8f, Random.nextFloat() < .24f, .5f + Random.nextFloat() * 1.2f))
        }
        while (true) {
            withFrameNanos { frame = it }
            val t = touch.pos
            for (p in pts) {
                if (mode == 2) {
                    p.y -= p.sp * 2f
                    if (p.y < -10) { p.y = h + 10; p.x = Random.nextFloat() * w }
                    t?.let { if (abs(p.x - it.x) < 120 && abs(p.y - it.y) < 120) p.x += (p.x - it.x) / 40f }
                } else {
                    t?.let {
                        val dx = p.x - it.x; val dy = p.y - it.y; val d = sqrt(dx * dx + dy * dy)
                        if (d in .1f..170f) { val f = (1 - d / 170f) * .9f; p.vx += dx / d * f; p.vy += dy / d * f }
                    }
                    val s = sqrt(p.vx * p.vx + p.vy * p.vy)
                    if (s > 3f) { p.vx *= 3f / s; p.vy *= 3f / s } else if (s > 1.2f) { p.vx *= .98f; p.vy *= .98f }
                    p.x += p.vx; p.y += p.vy
                    if (p.x < 0 || p.x > w) p.vx = -p.vx
                    if (p.y < 0 || p.y > h) p.vy = -p.vy
                    p.x = p.x.coerceIn(0f, w); p.y = p.y.coerceIn(0f, h)
                }
            }
        }
    }
    Canvas(modifier.onSizeChanged { box = it }) {
        val time = frame / 1e9f
        val line = if (dark) Color(0xFF00C7FF) else Color(0xFF0D9488)
        val acc = if (dark) Accent else Color(0xFF059669)
        drawRect(Brush.radialGradient(listOf(line.copy(alpha = .04f), Color.Transparent), Offset(size.width * .5f, size.height * .2f), size.maxDimension * .65f))
        val t = touch.pos
        when (mode) {
            0 -> {
                val md = 105f
                for (i in pts.indices) for (j in i + 1 until pts.size) {
                    val a = pts[i]; val b = pts[j]; val dx = a.x - b.x; val dy = a.y - b.y
                    if (abs(dx) > md || abs(dy) > md) continue
                    val d = sqrt(dx * dx + dy * dy); if (d > md) continue
                    drawLine(line.copy(alpha = (if (dark) .18f else .12f) * (1 - d / md)), Offset(a.x, a.y), Offset(b.x, b.y), 1.0f)
                }
                t?.let { tp -> pts.forEach { p -> val d = hypot(p.x - tp.x, p.y - tp.y); if (d < 130) drawLine(acc.copy(alpha = .35f * (1 - d / 130)), tp, Offset(p.x, p.y), 1.2f) } }
                pts.forEach { drawCircle((if (it.acc) acc else line).copy(alpha = .55f), it.r, Offset(it.x, it.y)) }
            }
            1 -> for (w in 0 until 5) {
                val base = size.height * (.15f + w * .16f); val amp = 18f + w * 8f; val freq = .005f + w * .002f
                val path = Path(); var x = 0f
                while (x <= size.width) {
                    var y = base + sin(x * freq + time * 1.2f + w) * amp + cos(x * .003f - time * .6f) * amp * .5f
                    t?.let { val d = hypot(x - it.x, y - it.y); if (d < 140) y += (if (it.y > y) 1 else -1) * (1 - d / 140) * 28 }
                    if (x == 0f) path.moveTo(x, y) else path.lineTo(x, y); x += 16f
                }
                drawPath(path, (if (w % 2 == 0) acc else line).copy(alpha = .18f + w * .06f), style = Stroke(3f))
            }
            else -> pts.forEach {
                val c = if (it.acc) acc else line
                drawLine(Brush.verticalGradient(listOf(c.copy(alpha = .5f), Color.Transparent), it.y, it.y + it.sp * 24), Offset(it.x, it.y), Offset(it.x, it.y + it.sp * 24), 2f)
                drawCircle(c, it.r * .9f, Offset(it.x, it.y))
            }
        }
    }
}

// ================= SONAR RADAR =================
data class RadarNode(val id: String, val label: String, val strength: Float, val color: Color)

private fun nodePos(n: RadarNode, cx: Float, cy: Float, r: Float): Offset {
    val a = (n.id.hashCode() and 0xffff) / 65535f * 2 * PI.toFloat()
    val d = r * (.12f + (1 - n.strength.coerceIn(0f, 1f)) * .82f)
    return Offset(cx + cos(a) * d, cy + sin(a) * d)
}

@Composable
fun Radar(nodes: List<RadarNode>, modifier: Modifier = Modifier, onTap: (RadarNode) -> Unit = {}) {
    val inf = rememberInfiniteTransition(label = "radar")
    val ang by inf.animateFloat(0f, 360f, infiniteRepeatable(tween(2600, easing = LinearEasing)), label = "a")
    val pulse by inf.animateFloat(0f, 1f, infiniteRepeatable(tween(1400)), label = "p")
    val p = LocalPal.current
    val paint = remember { android.graphics.Paint().apply { isAntiAlias = true; textSize = 26f; typeface = android.graphics.Typeface.MONOSPACE } }
    Canvas(modifier.aspectRatio(1f).pointerInput(nodes) {
        detectTapGestures { o ->
            val r = size.width / 2f * .95f
            nodes.minByOrNull { (nodePos(it, size.width / 2f, size.height / 2f, r) - o).getDistance() }
                ?.takeIf { (nodePos(it, size.width / 2f, size.height / 2f, r) - o).getDistance() < 60 }?.let { Fx.click(); onTap(it) }
        }
    }) {
        val c = center; val r = size.minDimension / 2 * .95f
        drawCircle(Brush.radialGradient(listOf(Accent.copy(alpha = .1f), Color.Transparent), c, r), r, c)
        for (i in 1..4) drawCircle(Accent.copy(alpha = .22f), r * i / 4, c, style = Stroke(1.5f, pathEffect = if (i % 2 == 0) null else PathEffect.dashPathEffect(floatArrayOf(8f, 8f))))
        drawLine(Accent.copy(alpha = .15f), Offset(c.x - r, c.y), Offset(c.x + r, c.y)); drawLine(Accent.copy(alpha = .15f), Offset(c.x, c.y - r), Offset(c.x, c.y + r))
        rotate(ang, c) {
            drawCircle(Brush.sweepGradient(0f to Color.Transparent, .78f to Color.Transparent, 1f to Cyan.copy(alpha = .5f), center = c), r, c)
            drawLine(Cyan, c, Offset(c.x + r, c.y), 3f)
        }
        nodes.forEach { n ->
            val o = nodePos(n, c.x, c.y, r)
            drawCircle(n.color.copy(alpha = (1 - pulse) * .5f), 8f + pulse * 22f, o)
            drawCircle(n.color, 8f, o); drawCircle(Color.White, 3f, o)
            paint.color = p.t1.toArgb()
            drawContext.canvas.nativeCanvas.drawText(n.label.take(14), o.x + 14, o.y - 10, paint)
        }
        drawCircle(Accent, 6f, c)
    }
}

// ================= Wi-Fi PARABOLİK KANAL SPEKTRUMU =================
data class SpecNet(val ssid: String, val ch: Int, val dbm: Int, val color: Color)

@Composable
fun WifiSpectrum(nets: List<SpecNet>, band5: Boolean, modifier: Modifier = Modifier) {
    val p = LocalPal.current
    val paint = remember { android.graphics.Paint().apply { isAntiAlias = true; textSize = 22f } }
    Canvas(modifier) {
        val (lo, hi) = if (band5) 32f to 169f else -1f to 16f
        val hw = if (band5) 4f else 2.2f
        fun x(ch: Float) = (ch - lo) / (hi - lo) * size.width
        fun y(dbm: Int) = size.height - ((dbm + 100).coerceIn(0, 70) / 70f) * size.height * .92f
        for (d in listOf(-90, -70, -50, -30)) drawLine(p.border, Offset(0f, y(d)), Offset(size.width, y(d)))
        paint.color = p.t3.toArgb()
        val ticks = if (band5) listOf(36, 52, 100, 116, 132, 149, 165) else (1..13).toList()
        ticks.forEach { drawContext.canvas.nativeCanvas.drawText("$it", x(it.toFloat()) - 8, size.height - 4, paint) }
        nets.forEach { n ->
            val base = size.height; val peak = y(n.dbm); val cx = x(n.ch.toFloat())
            val path = Path().apply { moveTo(x(n.ch - hw), base); quadraticBezierTo(cx, 2 * peak - base, x(n.ch + hw), base) }
            drawPath(path, Brush.verticalGradient(listOf(n.color.copy(alpha = .35f), Color.Transparent), peak, base))
            drawPath(path, n.color, style = Stroke(2.5f))
            paint.color = n.color.toArgb()
            drawContext.canvas.nativeCanvas.drawText(n.ssid.take(12), cx - 30, peak + (base - peak) * .5f - 4, paint)
        }
    }
}

// ================= ENTROPİ ISI HARİTASI =================
fun entropyColor(e: Float) = when { e < 4.5f -> Accent; e < 6.8f -> Cyan; e < 7.5f -> Amber; else -> Danger }

@Composable
fun EntropyBar(blocks: List<Float>, modifier: Modifier = Modifier) = Canvas(modifier) {
    if (blocks.isEmpty()) return@Canvas
    val w = size.width / blocks.size
    blocks.forEachIndexed { i, e ->
        val h = size.height * (e / 8f).coerceIn(.08f, 1f)
        drawRoundRect(entropyColor(e), Offset(i * w + 1, size.height - h), Size(w - 2, h), CornerRadius(3f))
    }
}

// ================= ÇOK ÇEKİRDEKLİ CPU EKOLAYZER / MATRİS =================
@Composable
fun CpuCoreMatrixCanvas(loads: List<Float>, modifier: Modifier = Modifier.fillMaxWidth().height(90.dp)) {
    val p = LocalPal.current
    Canvas(modifier) {
        if (loads.isEmpty()) return@Canvas
        val gap = 6f
        val w = (size.width - (loads.size - 1) * gap) / loads.size
        loads.forEachIndexed { i, load ->
            val x = i * (w + gap)
            val h = (load.coerceIn(0.04f, 1f) * size.height)
            val y = size.height - h
            val col = when {
                load > 0.8f -> Danger
                load > 0.5f -> Amber
                else -> Accent
            }
            // Background slot
            drawRoundRect(p.border.copy(alpha = 0.3f), Offset(x, 0f), Size(w, size.height), CornerRadius(4f))
            // Active load bar
            drawRoundRect(
                Brush.verticalGradient(listOf(col, col.copy(alpha = 0.4f)), y, size.height),
                Offset(x, y), Size(w, h), CornerRadius(4f)
            )
            // Peak indicator line
            drawLine(Color.White, Offset(x + 2, y + 2), Offset(x + w - 2, y + 2), strokeWidth = 3f)
        }
    }
}

// ================= DÖNEN GEOMETRİK KALKAN =================
@Composable
fun ShieldEmblem(color: Color, speedMs: Int, modifier: Modifier = Modifier) {
    val inf = rememberInfiniteTransition(label = "sh")
    val rot by inf.animateFloat(0f, 360f, infiniteRepeatable(tween(speedMs, easing = LinearEasing)), label = "r")
    val glow by inf.animateFloat(.4f, .9f, infiniteRepeatable(tween(1600), RepeatMode.Reverse), label = "g")
    val p = LocalPal.current
    Canvas(modifier.aspectRatio(1f)) { drawShield(color, rot, glow, p.dark) }
}

private fun DrawScope.drawShield(color: Color, rot: Float, glow: Float, isDark: Boolean) {
    val w = size.minDimension
    val c = center
    val baseScale = w * 0.92f

    // Outer cyber aura
    drawCircle(
        Brush.radialGradient(
            listOf(color.copy(alpha = glow * 0.28f), Color.Transparent),
            c,
            baseScale * 0.5f
        ),
        baseScale * 0.5f,
        c
    )

    // Outer rotating tech ring
    rotate(rot, c) {
        drawCircle(
            color.copy(alpha = 0.35f),
            baseScale * 0.48f,
            c,
            style = Stroke(2f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f, 4f, 10f)))
        )
        hexagon(c, baseScale * 0.42f, color.copy(alpha = 0.45f), PathEffect.dashPathEffect(floatArrayOf(16f, 12f)))
    }

    // Inner counter-rotating ring
    rotate(-rot * 1.4f, c) {
        drawCircle(
            Cyan.copy(alpha = 0.35f),
            baseScale * 0.36f,
            c,
            style = Stroke(1.5f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f)))
        )
    }

    // Shield Body (Sleek aerodynamic apex & curved base)
    val sw = baseScale * 0.62f
    val sh = baseScale * 0.68f
    val top = c.y - sh * 0.48f
    val bot = c.y + sh * 0.52f
    val l = c.x - sw * 0.5f
    val r = c.x + sw * 0.5f

    val shieldPath = Path().apply {
        moveTo(c.x, top)
        lineTo(r, top + sh * 0.12f)
        lineTo(r, c.y + sh * 0.08f)
        cubicTo(r, c.y + sh * 0.36f, c.x + sw * 0.18f, bot - sh * 0.08f, c.x, bot)
        cubicTo(c.x - sw * 0.18f, bot - sh * 0.08f, l, c.y + sh * 0.36f, l, c.y + sh * 0.08f)
        lineTo(l, top + sh * 0.12f)
        close()
    }

    // Shield inner fill
    drawPath(
        shieldPath,
        Brush.verticalGradient(
            listOf(color.copy(alpha = if (isDark) 0.55f else 0.4f), color.copy(alpha = if (isDark) 0.15f else 0.1f)),
            top,
            bot
        )
    )

    // Shield primary neon stroke
    drawPath(shieldPath, color, style = Stroke(w * 0.026f, join = StrokeJoin.Round))

    // Inner contour line
    val innerScale = 0.82f
    val isw = sw * innerScale
    val ish = sh * innerScale
    val itop = c.y - ish * 0.48f
    val ibot = c.y + ish * 0.52f
    val il = c.x - isw * 0.5f
    val ir = c.x + isw * 0.5f

    val innerShield = Path().apply {
        moveTo(c.x, itop)
        lineTo(ir, itop + ish * 0.12f)
        lineTo(ir, c.y + ish * 0.08f)
        cubicTo(ir, c.y + ish * 0.36f, c.x + isw * 0.18f, ibot - ish * 0.08f, c.x, ibot)
        cubicTo(c.x - isw * 0.18f, ibot - ish * 0.08f, il, c.y + ish * 0.36f, il, c.y + ish * 0.08f)
        lineTo(il, itop + ish * 0.12f)
        close()
    }
    drawPath(innerShield, (if (isDark) Color.White else color).copy(alpha = 0.25f), style = Stroke(1.5f))

    // Center Insignia: Cyber Checkmark / ULAK Crest
    val ck = Path().apply {
        moveTo(c.x - sw * 0.18f, c.y)
        lineTo(c.x - sw * 0.04f, c.y + sh * 0.14f)
        lineTo(c.x + sw * 0.22f, c.y - sh * 0.12f)
    }
    drawPath(
        ck,
        if (isDark) Color.White else Color(0xFF0F172A),
        style = Stroke(w * 0.04f, cap = StrokeCap.Round, join = StrokeJoin.Round)
    )

    // Glowing core pip
    drawCircle(color, w * 0.028f, Offset(c.x, c.y + sh * 0.28f))
    drawCircle(Color.White, w * 0.012f, Offset(c.x, c.y + sh * 0.28f))
}

private fun DrawScope.hexagon(c: Offset, r: Float, color: Color, effect: PathEffect?) {
    val p = Path()
    for (i in 0..6) { val a = PI / 3 * i - PI / 2; val o = Offset(c.x + r * cos(a).toFloat(), c.y + r * sin(a).toFloat()); if (i == 0) p.moveTo(o.x, o.y) else p.lineTo(o.x, o.y) }
    drawPath(p, color, style = Stroke(3f, pathEffect = effect))
}

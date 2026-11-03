package com.ulak.station.data

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import com.ulak.station.MainActivity
import com.ulak.station.core.Prefs
import java.io.FileInputStream
import java.io.FileOutputStream

class FirewallVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var isRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == "STOP") {
            stopVpn()
            return START_NOT_STICKY
        }

        startForeground(1001, createNotification())
        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        if (isRunning) return
        isRunning = true

        val mode = Prefs.getInt("fw_mode", 1) // 0: Düşük, 1: Orta, 2: Yüksek, 3: Paranoid
        val blockedApps = Prefs.getSet("fw_blocked_apps")

        val builder = Builder()
            .setSession("ULAK Güvenlik Kalkanı")
            .addAddress("10.1.10.1", 32)
            .addRoute("0.0.0.0", 0)

        // Allow or block apps based on mode
        if (mode == 3) {
            // Paranoid mode: only ULAK itself is allowed network or total sinkhole
            try { builder.addAllowedApplication(packageName) } catch (_: Exception) {}
        } else {
            // Per-app blocking
            blockedApps.forEach { pkg ->
                try {
                    builder.addAllowedApplication(pkg) // Routed into dead-end TUN
                } catch (_: Exception) {}
            }
        }

        try {
            vpnInterface = builder.establish()
            // Read loop to safely consume blocked packets without high CPU
            Thread {
                val input = FileInputStream(vpnInterface?.fileDescriptor ?: return@Thread)
                val buffer = ByteArray(32767)
                while (isRunning) {
                    try {
                        val len = input.read(buffer)
                        if (len <= 0) Thread.sleep(100)
                    } catch (_: Exception) { break }
                }
            }.start()
        } catch (_: Exception) {
            stopVpn()
        }
    }

    private fun stopVpn() {
        isRunning = false
        try { vpnInterface?.close() } catch (_: Exception) {}
        vpnInterface = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    private fun createNotification(): Notification {
        val channelId = "ulak_shield"
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(channelId, "ULAK Güvenlik Kalkanı", NotificationManager.IMPORTANCE_LOW)
            nm?.createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return if (Build.VERSION.SDK_INT >= 26) {
            Notification.Builder(this, channelId)
                .setContentTitle("ULAK Kalkanı Aktif")
                .setContentText("Yerel güvenlik duvarı ve port koruması çalışıyor")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentIntent(pi)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("ULAK Kalkanı Aktif")
                .setContentText("Yerel güvenlik duvarı ve port koruması çalışıyor")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentIntent(pi)
                .build()
        }
    }
}

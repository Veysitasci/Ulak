package com.ulak.station

import android.app.Application
import com.ulak.station.core.Fx
import com.ulak.station.core.Prefs
import com.ulak.station.data.AutomationEngine

class UlakApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Prefs.init(this)
        Fx.init(this)
        AutomationEngine.init(this)
        com.ulak.station.automate.engine.AutomateEngine.init(this)
    }
}

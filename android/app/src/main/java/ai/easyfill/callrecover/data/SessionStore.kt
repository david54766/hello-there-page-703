package ai.easyfill.callrecover.data

import android.content.Context

class SessionStore(context: Context) {
    private val prefs = context.getSharedPreferences("callrecover.session", Context.MODE_PRIVATE)

    var accessToken: String?
        get() = prefs.getString("access_token", null)
        set(value) = prefs.edit().putString("access_token", value).apply()

    var refreshToken: String?
        get() = prefs.getString("refresh_token", null)
        set(value) = prefs.edit().putString("refresh_token", value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }
}

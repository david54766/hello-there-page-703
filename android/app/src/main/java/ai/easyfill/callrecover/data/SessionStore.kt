package ai.easyfill.callrecover.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SessionStore(context: Context) {
    private val appContext = context.applicationContext
    private val legacyPrefs = appContext.getSharedPreferences("callrecover.session", Context.MODE_PRIVATE)
    private val prefs = encryptedPrefsOrFallback()

    init {
        migrateLegacySession()
    }

    var accessToken: String?
        get() = prefs.getString("access_token", null)
        set(value) = prefs.edit().putString("access_token", value).apply()

    var refreshToken: String?
        get() = prefs.getString("refresh_token", null)
        set(value) = prefs.edit().putString("refresh_token", value).apply()

    fun clear() {
        prefs.edit().clear().apply()
        legacyPrefs.edit().clear().apply()
    }

    private fun encryptedPrefsOrFallback(): SharedPreferences {
        return runCatching {
            val masterKey = MasterKey.Builder(appContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                appContext,
                "callrecover.session.secure",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        }.getOrElse {
            legacyPrefs
        }
    }

    private fun migrateLegacySession() {
        if (prefs === legacyPrefs || !legacyPrefs.contains("access_token")) return
        prefs.edit()
            .putString("access_token", legacyPrefs.getString("access_token", null))
            .putString("refresh_token", legacyPrefs.getString("refresh_token", null))
            .apply()
        legacyPrefs.edit().clear().apply()
    }
}

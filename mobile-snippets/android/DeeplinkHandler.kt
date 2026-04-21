package az.nar.app.deeplink

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.android.installreferrer.api.InstallReferrerClient
import com.android.installreferrer.api.InstallReferrerStateListener
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Minimal App Link handler for the deeplink platform.
 *
 * In your Activity:
 *
 *     override fun onCreate(savedInstanceState: Bundle?) {
 *         super.onCreate(savedInstanceState)
 *         intent?.data?.let { DeeplinkHandler.handleUri(this, it) }
 *     }
 *     override fun onNewIntent(intent: Intent) {
 *         super.onNewIntent(intent)
 *         intent.data?.let { DeeplinkHandler.handleUri(this, it) }
 *     }
 *
 * In your Application.onCreate():
 *
 *     DeeplinkHandler.reportInstallIfFirstLaunch(this)
 */
object DeeplinkHandler {
    var baseUrl: String = "https://links.nar.az"

    private const val PREFS = "deeplink_prefs"
    private const val KEY_INSTALL_REPORTED = "install_reported"
    private val http = OkHttpClient()
    private val jsonType = "application/json".toMediaType()

    fun handleUri(context: Context, uri: Uri) {
        val cid = uri.getQueryParameter("cid")
        val slug = extractSlug(uri)
        reportEvent(kind = "open", cid = cid, slug = slug)
        routeInApp(context, uri)
    }

    fun reportInstallIfFirstLaunch(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getBoolean(KEY_INSTALL_REPORTED, false)) return

        val client = InstallReferrerClient.newBuilder(context).build()
        client.startConnection(object : InstallReferrerStateListener {
            override fun onInstallReferrerSetupFinished(responseCode: Int) {
                if (responseCode != InstallReferrerClient.InstallReferrerResponse.OK) {
                    client.endConnection()
                    return
                }
                val referrer = runCatching { client.installReferrer.installReferrer }
                    .getOrNull() ?: ""
                val cid = parseParam(referrer, "cid")
                val slug = parseParam(referrer, "slug")

                reportEvent(kind = "install", cid = cid, slug = slug)
                prefs.edit().putBoolean(KEY_INSTALL_REPORTED, true).apply()
                client.endConnection()
            }

            override fun onInstallReferrerServiceDisconnected() {}
        })
    }

    private fun reportEvent(kind: String, cid: String?, slug: String?) {
        val payload = JSONObject().apply {
            put("kind", kind)
            put("platform", "android")
            cid?.let { put("cid", it) }
            slug?.let { put("slug", it) }
        }
        val req = Request.Builder()
            .url("$baseUrl/api/events")
            .post(payload.toString().toRequestBody(jsonType))
            .build()
        http.newCall(req).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                Log.w("Deeplink", "event post failed", e)
            }
            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                response.close()
            }
        })
    }

    private fun extractSlug(uri: Uri): String? {
        val segments = uri.pathSegments ?: return null
        val i = segments.indexOf("l")
        return if (i >= 0 && i + 1 < segments.size) segments[i + 1] else null
    }

    private fun parseParam(referrer: String, name: String): String? {
        // referrer example: "cid=ab12cd34ef56&slug=abc1234"
        return referrer.split("&")
            .mapNotNull { kv ->
                val parts = kv.split("=", limit = 2)
                if (parts.size == 2 && parts[0] == name) Uri.decode(parts[1]) else null
            }
            .firstOrNull()
    }

    private fun routeInApp(context: Context, uri: Uri) {
        // TODO: map URL paths into your app's navigation.
        // Example: /promo/spring -> PromoActivity(slug = "spring")
    }
}

package ai.easyfill.callrecover.data

import ai.easyfill.callrecover.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.isSuccess
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.Base64

class CallRecoverApi(private val sessionStore: SessionStore) {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = true
    }
    private val client = HttpClient(Android) {
        install(ContentNegotiation) { json(json) }
    }
    private val refreshMutex = Mutex()

    suspend fun signIn(email: String, password: String): AuthResponse {
        val httpResponse = client.post("${BuildConfig.SUPABASE_URL}/auth/v1/token") {
            parameter("grant_type", "password")
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            contentType(ContentType.Application.Json)
            setBody(PasswordGrant(email, password))
        }
        if (!httpResponse.status.isSuccess()) {
            val errorText = httpResponse.bodyAsText()
            val message = runCatching {
                val error = json.decodeFromString<AuthErrorResponse>(errorText)
                error.msg ?: error.message ?: error.errorDescription ?: error.error
            }.getOrNull()
            error(message ?: "Sign in failed")
        }
        val response: AuthResponse = httpResponse.body()
        sessionStore.accessToken = response.accessToken
        sessionStore.refreshToken = response.refreshToken
        return response
    }

    suspend fun sendPasswordReset(email: String) {
        client.post("${BuildConfig.API_BASE_URL.trimEnd('/')}/api/public/password-reset") {
            contentType(ContentType.Application.Json)
            setBody(PasswordRecoveryRequest(email))
        }.checked()
    }

    suspend fun syncVapiAgent(forceRefresh: Boolean = true) {
        mobilePost("/api/mobile/sync-vapi-agent", SyncVapiBody(forceRefresh))
    }

    suspend fun recentCalls(): List<CallRecord> {
        return supabaseGet("/rest/v1/calls") {
            parameter("select", "id,business_id,caller_number,caller_name,status,lead_status,urgency,priority,callback_requested,archived_at,archived_by,created_at,ai_summary,ai_summary_short,service_needed,transcript,recording_url")
            parameter("order", "created_at.desc")
            parameter("limit", "50")
        }.body()
    }

    suspend fun businessProfile(): BusinessProfile? {
        val rows: List<BusinessProfile> = supabaseGet("/rest/v1/businesses") {
            parameter("select", "id,business_name,contractor_type,business_phone,owner_phone,carrier,twilio_number,avg_job_value,onboarding_complete,notify_sms,notify_email,notify_dashboard,notify_email_address,auto_send_ai_replies,sms_auto_response_mode,scheduling_enabled,scheduling_provider,website,website_blurb,address,booking_url,callback_form_url,sms_consent_text,cal_url,calendly_url,agent_voice_id,agent_prompt_override,observed_holidays")
            parameter("limit", "1")
        }.body()
        return rows.firstOrNull()
    }

    suspend fun updateBusiness(business: BusinessProfile) {
        supabasePatch(
            "/rest/v1/businesses",
            BusinessUpdateBody(
                businessName = business.businessName,
                contractorType = business.contractorType,
                businessPhone = business.businessPhone,
                ownerPhone = business.ownerPhone,
                carrier = business.carrier,
                avgJobValue = business.avgJobValue,
                notifySms = business.notifySms,
                notifyEmail = business.notifyEmail,
                notifyDashboard = business.notifyDashboard,
                notifyEmailAddress = business.notifyEmailAddress,
                autoSendAiReplies = business.autoSendAiReplies,
                smsAutoResponseMode = business.smsAutoResponseMode,
                schedulingEnabled = business.schedulingEnabled,
                schedulingProvider = business.schedulingProvider,
                website = business.website,
                websiteBlurb = business.websiteBlurb,
                address = business.address,
                bookingUrl = business.bookingUrl,
                callbackFormUrl = business.callbackFormUrl,
                calUrl = business.calUrl,
                calendlyUrl = business.calendlyUrl,
                agentVoiceId = business.agentVoiceId,
                agentPromptOverride = business.agentPromptOverride,
                observedHolidays = business.observedHolidays,
            )
        ) {
            parameter("id", "eq.${business.id}")
        }
    }

    suspend fun smsMessages(callerNumber: String): List<SmsMessage> {
        val threads: List<SmsThread> = supabaseGet("/rest/v1/sms_threads") {
            parameter("select", "id,caller_number,last_message_at")
            parameter("caller_number", "eq.$callerNumber")
            parameter("limit", "1")
        }.body()
        val thread = threads.firstOrNull() ?: return emptyList()
        return supabaseGet("/rest/v1/sms_messages") {
            parameter("select", "id,thread_id,direction,body,created_at")
            parameter("thread_id", "eq.${thread.id}")
            parameter("order", "created_at.asc")
        }.body()
    }

    suspend fun scriptTemplates(): List<ScriptTemplate> {
        return supabaseGet("/rest/v1/script_templates") {
            parameter("select", "id,business_id,kind,label,body,is_default,contractor_type")
            parameter("order", "kind.asc,label.asc")
        }.body()
    }

    suspend fun updateScript(script: ScriptTemplate, label: String, body: String, isDefault: Boolean) {
        supabasePatch(
            "/rest/v1/script_templates",
            ScriptTemplateUpdateBody(label = label, body = body, isDefault = isDefault)
        ) {
            parameter("id", "eq.${script.id}")
        }
    }

    suspend fun assistantNumbers(): List<AssistantNumber> {
        return supabaseGet("/rest/v1/vapi_number_assistants") {
            parameter("select", "id,business_id,phone_number_id,phone_number,assistant_id,assistant_name,custom_prompt,custom_first_message")
            parameter("order", "updated_at.desc")
            parameter("limit", "1")
        }.body()
    }

    suspend fun updateAssistant(row: AssistantNumber, name: String, firstMessage: String, prompt: String) {
        supabasePatch(
            "/rest/v1/vapi_number_assistants",
            AssistantUpdateBody(
                assistantName = name.ifBlank { null },
                customFirstMessage = firstMessage.ifBlank { null },
                customPrompt = prompt.ifBlank { null },
            )
        ) {
            parameter("id", "eq.${row.id}")
        }
    }

    suspend fun teamMembers(): List<TeamMember> {
        return supabaseGet("/rest/v1/team_members") {
            parameter("select", "id,business_id,name,phone,email,role,active,color,created_at")
            parameter("order", "created_at.asc")
        }.body()
    }

    suspend fun upsertTeamMember(member: TeamMember, businessId: String) {
        val body = TeamMemberBody(
            businessId = businessId,
            name = member.name,
            phone = member.phone,
            email = member.email,
            role = member.role,
            active = member.active
        )
        if (member.id == null) {
            supabasePost("/rest/v1/team_members", body)
        } else {
            supabasePatch("/rest/v1/team_members", body) {
                parameter("id", "eq.${member.id}")
            }
        }
    }

    suspend fun appointments(): List<Appointment> {
        return supabaseGet("/rest/v1/appointments") {
            parameter("select", "id,business_id,team_member_id,call_id,scheduled_for,duration_minutes,customer_name,customer_phone,service,notes,source,provider,status")
            parameter("order", "scheduled_for.asc")
            parameter("limit", "50")
        }.body()
    }

    suspend fun createAppointment(appointment: AppointmentBody) {
        supabasePost("/rest/v1/appointments", appointment)
    }

    suspend fun cancelAppointment(id: String) {
        supabasePatch("/rest/v1/appointments", AppointmentStatusBody("cancelled")) {
            parameter("id", "eq.$id")
        }
    }

    suspend fun blackouts(): List<ScheduleBlackout> {
        return supabaseGet("/rest/v1/schedule_blackouts") {
            parameter("select", "id,business_id,team_member_id,start_at,end_at,reason")
            parameter("order", "start_at.asc")
            parameter("limit", "50")
        }.body()
    }

    suspend fun createBlackout(blackout: ScheduleBlackoutBody) {
        supabasePost("/rest/v1/schedule_blackouts", blackout)
    }

    suspend fun deleteBlackout(id: String) {
        supabaseDelete("/rest/v1/schedule_blackouts") {
            parameter("id", "eq.$id")
        }
    }

    suspend fun notifications(): List<NotificationItem> {
        return supabaseGet("/rest/v1/notifications") {
            parameter("select", "id,call_id,kind,title,body,read,created_at")
            parameter("order", "created_at.desc")
            parameter("limit", "30")
        }.body()
    }

    suspend fun markNotificationRead(id: String) {
        supabasePatch("/rest/v1/notifications", NotificationReadBody()) {
            parameter("id", "eq.$id")
        }
    }

    suspend fun updateCallLeadStatus(call: CallRecord, leadStatus: String, archive: Boolean = false) {
        supabasePatch(
            "/rest/v1/calls",
            CallLeadStatusBody(
                leadStatus = leadStatus,
                status = if (leadStatus == "closed") "resolved" else null,
                callbackRequested = if (leadStatus == "scheduled" || leadStatus == "requesting_call") true else null,
                archivedAt = if (archive) java.time.Instant.now().toString() else null
            )
        ) {
            parameter("id", "eq.${call.id}")
        }
    }

    suspend fun restoreCallArchive(call: CallRecord) {
        supabasePatchRaw(
            "/rest/v1/calls",
            """{"archived_at":null,"archived_by":null}"""
        ) {
            parameter("id", "eq.${call.id}")
        }
    }

    suspend fun recordingUrl(callId: String): RecordingResponse {
        return mobilePost("/api/mobile/recording-url", RecordingRequest(callId)).body()
    }

    suspend fun forwardingStatus(): ForwardingStatus? {
        return mobileGet("/api/mobile/forwarding-status").body<ForwardingStatusResponse>().status
    }

    suspend fun updateForwardingStatus(status: ForwardingStatus) {
        mobilePost("/api/mobile/forwarding-status", status)
    }

    suspend fun registerPushToken(token: String, deviceId: String?) {
        mobilePost("/api/mobile/push-token", PushTokenBody(token = token, deviceId = deviceId))
    }

    suspend fun deletePushToken(token: String) {
        mobileDelete("/api/mobile/push-token", PushTokenBody(token = token))
    }

    suspend fun voicePreview(voiceId: String, text: String): ByteArray {
        val response: VoicePreviewResponse = mobilePost(
            "/api/mobile/voice-preview",
            VoicePreviewRequest(voiceId = voiceId, text = text)
        ).body()
        return Base64.getDecoder().decode(response.audioBase64)
    }

    suspend fun scanSetupWebsite(url: String): SetupScanResult? {
        return mobilePost("/api/mobile/setup-scan", SetupScanRequest(url)).body<SetupScanResponse>().result
    }

    fun signOut() = sessionStore.clear()

    private suspend fun supabaseGet(path: String, block: io.ktor.client.request.HttpRequestBuilder.() -> Unit): HttpResponse {
        ensureFreshSession()
        return client.get("${BuildConfig.SUPABASE_URL}$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            bearer()
            block()
        }.checked()
    }

    private suspend inline fun <reified T : Any> mobilePost(path: String, body: T): HttpResponse {
        ensureFreshSession()
        return client.post("${BuildConfig.API_BASE_URL}$path") {
            bearer()
            contentType(ContentType.Application.Json)
            setBody(body)
        }.checked()
    }

    private suspend fun mobileGet(path: String): HttpResponse {
        ensureFreshSession()
        return client.get("${BuildConfig.API_BASE_URL}$path") { bearer() }.checked()
    }

    private suspend inline fun <reified T : Any> supabasePatch(
        path: String,
        body: T,
        block: io.ktor.client.request.HttpRequestBuilder.() -> Unit
    ): HttpResponse {
        ensureFreshSession()
        return client.patch("${BuildConfig.SUPABASE_URL}$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Prefer", "return=minimal")
            bearer()
            contentType(ContentType.Application.Json)
            setBody(body)
            block()
        }.checked()
    }

    private suspend fun supabasePatchRaw(
        path: String,
        body: String,
        block: io.ktor.client.request.HttpRequestBuilder.() -> Unit
    ): HttpResponse {
        ensureFreshSession()
        return client.patch("${BuildConfig.SUPABASE_URL}$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Prefer", "return=minimal")
            bearer()
            contentType(ContentType.Application.Json)
            setBody(body)
            block()
        }.checked()
    }

    private suspend inline fun <reified T : Any> supabasePost(path: String, body: T): HttpResponse {
        ensureFreshSession()
        return client.post("${BuildConfig.SUPABASE_URL}$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Prefer", "return=minimal")
            bearer()
            contentType(ContentType.Application.Json)
            setBody(body)
        }.checked()
    }

    private suspend fun supabaseDelete(path: String, block: io.ktor.client.request.HttpRequestBuilder.() -> Unit): HttpResponse {
        ensureFreshSession()
        return client.delete("${BuildConfig.SUPABASE_URL}$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Prefer", "return=minimal")
            bearer()
            block()
        }.checked()
    }

    private suspend inline fun <reified T : Any> mobileDelete(path: String, body: T): HttpResponse {
        ensureFreshSession()
        return client.delete("${BuildConfig.API_BASE_URL}$path") {
            bearer()
            contentType(ContentType.Application.Json)
            setBody(body)
        }.checked()
    }

    private suspend fun HttpResponse.checked(): HttpResponse {
        if (status.isSuccess()) return this
        val errorText = bodyAsText()
        val message = runCatching {
            val error = json.decodeFromString<AuthErrorResponse>(errorText)
            error.msg ?: error.message ?: error.errorDescription ?: error.error
        }.getOrNull()
        error(message ?: errorText.ifBlank { "Request failed: $status" })
    }

    private suspend fun ensureFreshSession() {
        if (!isJwtExpiring(sessionStore.accessToken ?: return)) return

        refreshMutex.withLock {
            val currentToken = sessionStore.accessToken ?: return
            if (!isJwtExpiring(currentToken)) return
            val refreshToken = sessionStore.refreshToken ?: return

            try {
                val response = client.post("${BuildConfig.SUPABASE_URL}/auth/v1/token") {
                    parameter("grant_type", "refresh_token")
                    header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                    contentType(ContentType.Application.Json)
                    setBody(RefreshGrant(refreshToken))
                }.checked()
                val auth: AuthResponse = response.body()
                sessionStore.accessToken = auth.accessToken
                sessionStore.refreshToken = auth.refreshToken ?: refreshToken
            } catch (_: Throwable) {
                sessionStore.clear()
                error("Session expired. Please sign in again.")
            }
        }
    }

    private fun isJwtExpiring(token: String): Boolean {
        return runCatching {
            val payload = token.split(".").getOrNull(1) ?: return true
            val paddedPayload = payload.padEnd(((payload.length + 3) / 4) * 4, '=')
            val jsonPayload = String(Base64.getUrlDecoder().decode(paddedPayload), Charsets.UTF_8)
            val exp = Regex("\"exp\"\\s*:\\s*(\\d+)").find(jsonPayload)?.groupValues?.getOrNull(1)?.toLongOrNull()
            exp == null || exp <= (System.currentTimeMillis() / 1000L) + 60L
        }.getOrDefault(true)
    }

    private fun io.ktor.client.request.HttpRequestBuilder.bearer() {
        val token = sessionStore.accessToken ?: error("Missing access token")
        header(HttpHeaders.Authorization, "Bearer $token")
    }
}

@Serializable
private data class PasswordGrant(val email: String, val password: String)

@Serializable
private data class PasswordRecoveryRequest(val email: String)

@Serializable
private data class RefreshGrant(@SerialName("refresh_token") val refreshToken: String)

@Serializable
private data class VoicePreviewRequest(val voiceId: String, val text: String)

@Serializable
private data class VoicePreviewResponse(@SerialName("audioBase64") val audioBase64: String)

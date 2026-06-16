package ai.easyfill.callrecover.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    val user: SupabaseUser? = null
)

@Serializable
data class AuthErrorResponse(
    val msg: String? = null,
    val message: String? = null,
    val error: String? = null,
    @SerialName("error_description") val errorDescription: String? = null
)

@Serializable
data class SupabaseUser(val id: String, val email: String? = null)

@Serializable
data class BusinessMember(
    @SerialName("business_id") val businessId: String
)

@Serializable
data class UserRoleRecord(
    @SerialName("business_id") val businessId: String,
    val role: String
)

data class ViewerProfile(
    val businessId: String,
    val role: String,
    val teamMember: TeamMember? = null
) {
    val isAgent: Boolean get() = role == "agent"
    val canManageTenant: Boolean get() = role == "admin" || role == "staff"
    val teamMemberId: String? get() = teamMember?.id
}

@Serializable
data class CallRecord(
    val id: String,
    @SerialName("business_id") val businessId: String? = null,
    @SerialName("caller_number") val callerNumber: String? = null,
    @SerialName("caller_name") val callerName: String? = null,
    val status: String? = null,
    @SerialName("lead_status") val leadStatus: String? = null,
    val urgency: String? = null,
    val priority: String? = null,
    @SerialName("callback_requested") val callbackRequested: Boolean = false,
    @SerialName("archived_at") val archivedAt: String? = null,
    @SerialName("archived_by") val archivedBy: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    val transcript: String? = null,
    @SerialName("ai_summary") val aiSummary: String? = null,
    @SerialName("ai_summary_short") val aiSummaryShort: String? = null,
    @SerialName("service_needed") val serviceNeeded: String? = null,
    @SerialName("recording_url") val recordingUrl: String? = null
)

@Serializable
data class SmsThread(
    val id: String,
    @SerialName("caller_number") val callerNumber: String? = null,
    @SerialName("last_message_at") val lastMessageAt: String? = null
)

@Serializable
data class SmsMessage(
    val id: String,
    @SerialName("thread_id") val threadId: String,
    val direction: String,
    val body: String,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class ForwardingStatus(
    val id: String? = null,
    val status: String = "not_started",
    val carrier: String? = null,
    @SerialName("forwarding_number") val forwardingNumber: String? = null,
    @SerialName("dial_code") val dialCode: String? = null
)

@Serializable
data class PushTokenBody(val platform: String = "android", val token: String, val deviceId: String? = null)

@Serializable
data class SyncVapiBody(val forceRefresh: Boolean = true)

@Serializable
data class RecordingRequest(val callId: String)

@Serializable
data class RecordingResponse(val url: String? = null)

@Serializable
data class ForwardingStatusResponse(val status: ForwardingStatus? = null)

@Serializable
data class ScriptTemplate(
    val id: String,
    @SerialName("business_id") val businessId: String? = null,
    val kind: String,
    val label: String,
    val body: String,
    @SerialName("is_default") val isDefault: Boolean = false,
    @SerialName("contractor_type") val contractorType: String? = null
)

@Serializable
data class ScriptTemplateUpdateBody(
    val label: String? = null,
    val body: String? = null,
    @SerialName("is_default") val isDefault: Boolean? = null
)

@Serializable
data class AssistantNumber(
    val id: String,
    @SerialName("business_id") val businessId: String? = null,
    @SerialName("phone_number_id") val phoneNumberId: String,
    @SerialName("phone_number") val phoneNumber: String? = null,
    @SerialName("assistant_id") val assistantId: String? = null,
    @SerialName("assistant_name") val assistantName: String? = null,
    @SerialName("custom_prompt") val customPrompt: String? = null,
    @SerialName("custom_first_message") val customFirstMessage: String? = null
)

@Serializable
data class AssistantUpdateBody(
    @SerialName("assistant_name") val assistantName: String? = null,
    @SerialName("custom_prompt") val customPrompt: String? = null,
    @SerialName("custom_first_message") val customFirstMessage: String? = null
)

@Serializable
data class BusinessProfile(
    val id: String,
    @SerialName("business_name") val businessName: String = "My Business",
    @SerialName("contractor_type") val contractorType: String? = null,
    @SerialName("business_phone") val businessPhone: String? = null,
    @SerialName("owner_phone") val ownerPhone: String? = null,
    val carrier: String? = null,
    @SerialName("twilio_number") val twilioNumber: String? = null,
    @SerialName("avg_job_value") val avgJobValue: Int = 500,
    @SerialName("onboarding_complete") val onboardingComplete: Boolean = false,
    @SerialName("notify_sms") val notifySms: Boolean = true,
    @SerialName("notify_email") val notifyEmail: Boolean = false,
    @SerialName("notify_dashboard") val notifyDashboard: Boolean = true,
    @SerialName("notify_email_address") val notifyEmailAddress: String? = null,
    @SerialName("auto_send_ai_replies") val autoSendAiReplies: Boolean = true,
    @SerialName("sms_auto_response_mode") val smsAutoResponseMode: String = "off",
    @SerialName("scheduling_enabled") val schedulingEnabled: Boolean = false,
    @SerialName("scheduling_provider") val schedulingProvider: String? = "internal",
    val website: String? = null,
    @SerialName("website_blurb") val websiteBlurb: String? = null,
    val address: String? = null,
    @SerialName("booking_url") val bookingUrl: String? = null,
    @SerialName("callback_form_url") val callbackFormUrl: String? = null,
    @SerialName("cal_url") val calUrl: String? = null,
    @SerialName("calendly_url") val calendlyUrl: String? = null,
    @SerialName("agent_voice_id") val agentVoiceId: String? = null,
    @SerialName("agent_prompt_override") val agentPromptOverride: String? = null,
    @SerialName("observed_holidays") val observedHolidays: List<HolidaySelection> = emptyList()
)

@Serializable
data class HolidaySelection(
    val id: String,
    val name: String
)

@Serializable
data class BusinessUpdateBody(
    @SerialName("business_name") val businessName: String? = null,
    @SerialName("contractor_type") val contractorType: String? = null,
    @SerialName("business_phone") val businessPhone: String? = null,
    @SerialName("owner_phone") val ownerPhone: String? = null,
    val carrier: String? = null,
    @SerialName("avg_job_value") val avgJobValue: Int? = null,
    @SerialName("notify_sms") val notifySms: Boolean? = null,
    @SerialName("notify_email") val notifyEmail: Boolean? = null,
    @SerialName("notify_dashboard") val notifyDashboard: Boolean? = null,
    @SerialName("notify_email_address") val notifyEmailAddress: String? = null,
    @SerialName("auto_send_ai_replies") val autoSendAiReplies: Boolean? = null,
    @SerialName("sms_auto_response_mode") val smsAutoResponseMode: String? = null,
    @SerialName("scheduling_enabled") val schedulingEnabled: Boolean? = null,
    @SerialName("scheduling_provider") val schedulingProvider: String? = null,
    val website: String? = null,
    @SerialName("website_blurb") val websiteBlurb: String? = null,
    val address: String? = null,
    @SerialName("booking_url") val bookingUrl: String? = null,
    @SerialName("callback_form_url") val callbackFormUrl: String? = null,
    @SerialName("cal_url") val calUrl: String? = null,
    @SerialName("calendly_url") val calendlyUrl: String? = null,
    @SerialName("agent_voice_id") val agentVoiceId: String? = null,
    @SerialName("agent_prompt_override") val agentPromptOverride: String? = null,
    @SerialName("observed_holidays") val observedHolidays: List<HolidaySelection>? = null
)

@Serializable
data class TeamMember(
    val id: String? = null,
    @SerialName("business_id") val businessId: String? = null,
    @SerialName("user_id") val userId: String? = null,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val role: String = "office",
    val active: Boolean = true,
    val color: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class TeamMemberBody(
    @SerialName("business_id") val businessId: String,
    val name: String,
    val phone: String? = null,
    val email: String? = null,
    val role: String = "office",
    val active: Boolean = true
)

@Serializable
data class Appointment(
    val id: String,
    @SerialName("business_id") val businessId: String? = null,
    @SerialName("team_member_id") val teamMemberId: String? = null,
    @SerialName("call_id") val callId: String? = null,
    @SerialName("scheduled_for") val scheduledFor: String,
    @SerialName("duration_minutes") val durationMinutes: Int = 60,
    @SerialName("customer_name") val customerName: String? = null,
    @SerialName("customer_phone") val customerPhone: String? = null,
    val service: String? = null,
    val notes: String? = null,
    val source: String? = null,
    val provider: String? = null,
    val status: String = "booked"
)

@Serializable
data class AppointmentBody(
    @SerialName("business_id") val businessId: String,
    @SerialName("team_member_id") val teamMemberId: String? = null,
    @SerialName("call_id") val callId: String? = null,
    @SerialName("scheduled_for") val scheduledFor: String,
    @SerialName("duration_minutes") val durationMinutes: Int = 60,
    @SerialName("customer_name") val customerName: String? = null,
    @SerialName("customer_phone") val customerPhone: String? = null,
    val service: String? = null,
    val notes: String? = null,
    val source: String = "manual",
    val provider: String = "internal",
    val status: String = "booked"
)

@Serializable
data class AppointmentStatusBody(val status: String)

@Serializable
data class ScheduleBlackout(
    val id: String,
    @SerialName("business_id") val businessId: String? = null,
    @SerialName("team_member_id") val teamMemberId: String? = null,
    @SerialName("start_at") val startAt: String,
    @SerialName("end_at") val endAt: String,
    val reason: String? = null
)

@Serializable
data class ScheduleBlackoutBody(
    @SerialName("business_id") val businessId: String,
    @SerialName("team_member_id") val teamMemberId: String? = null,
    @SerialName("start_at") val startAt: String,
    @SerialName("end_at") val endAt: String,
    val reason: String? = null
)

@Serializable
data class NotificationItem(
    val id: String,
    @SerialName("call_id") val callId: String? = null,
    val kind: String = "dashboard",
    val title: String,
    val body: String? = null,
    val read: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class NotificationReadBody(val read: Boolean = true)

@Serializable
data class CallLeadStatusBody(
    @SerialName("lead_status") val leadStatus: String,
    val status: String? = null,
    @SerialName("callback_requested") val callbackRequested: Boolean? = null,
    @SerialName("archived_at") val archivedAt: String? = null
)

@Serializable
data class SetupScanRequest(val url: String)

@Serializable
data class SetupScanResponse(
    val ok: Boolean = false,
    val result: SetupScanResult? = null
)

@Serializable
data class SetupScanResult(
    val businessName: String? = null,
    val contractorType: String? = null,
    val businessPhone: String? = null,
    val address: String? = null,
    val website: String? = null,
    val websiteBlurb: String? = null,
    val bookingUrl: String? = null,
    val callbackFormUrl: String? = null
)

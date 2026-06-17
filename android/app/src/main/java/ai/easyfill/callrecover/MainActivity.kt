package ai.easyfill.callrecover

import ai.easyfill.callrecover.data.AssistantNumber
import ai.easyfill.callrecover.data.Appointment
import ai.easyfill.callrecover.data.AppointmentBody
import ai.easyfill.callrecover.data.BusinessProfile
import ai.easyfill.callrecover.data.CallRecoverApi
import ai.easyfill.callrecover.data.CallRecord
import ai.easyfill.callrecover.data.ForwardingStatus
import ai.easyfill.callrecover.data.HolidaySelection
import ai.easyfill.callrecover.data.NotificationItem
import ai.easyfill.callrecover.data.ScheduleBlackout
import ai.easyfill.callrecover.data.ScheduleBlackoutBody
import ai.easyfill.callrecover.data.ScriptTemplate
import ai.easyfill.callrecover.data.SessionStore
import ai.easyfill.callrecover.data.SetupScanResult
import ai.easyfill.callrecover.data.SmsMessage
import ai.easyfill.callrecover.data.TeamMember
import ai.easyfill.callrecover.data.ViewerProfile
import ai.easyfill.callrecover.ui.theme.CallRecoverTheme
import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.EventBusy
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SettingsPhone
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import java.time.Instant
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.io.File

private val Ink = Color(0xFF171717)
private val Slate = Color(0xFF6F6A60)
private val Panel = Color(0xFFFFFFFF)
private val PanelStroke = Color(0xFFE5DFD2)
private val SoftIndigo = Color(0xFFFFF0C6)
private val SoftSky = Color(0xFFF1EFE8)
private val SoftTeal = Color(0xFFF5E8C7)
private val AiViolet = Color(0xFFFFF6DF)
private val ActiveGreen = Color(0xFF137A53)
private val ActiveSurface = Color(0xFFE8F7EF)
private val InactiveGray = Color(0xFF7A756C)
private val InactiveSurface = Color(0xFFF0EEEA)
private val CompleteInk = Color(0xFF263244)
private val CompleteSurface = Color(0xFFE8EDF5)
private val PriorityRed = Color(0xFFE11D48)
private val PrioritySurface = Color(0xFFFFF1F2)
private val PremiumGradient = Brush.verticalGradient(
    colors = listOf(
        Color(0xFFFBFAF6),
        Color(0xFFF1EEE6),
        Color(0xFFFFF6DF),
        Color(0xFFF7F4EC),
    )
)
private val AccentGradient = Brush.linearGradient(
    colors = listOf(Color(0xFF171717), Color(0xFF3A352B), Color(0xFFD6A84F))
)

private data class LabelValue(val value: String, val label: String)
private data class HolidayPreset(val id: String, val name: String, val dateFor: (Int) -> LocalDate)

private fun nthWeekdayOfMonth(year: Int, month: Int, weekday: DayOfWeek, n: Int): LocalDate {
    var day = LocalDate.of(year, month, 1)
    while (day.dayOfWeek != weekday) day = day.plusDays(1)
    return day.plusWeeks((n - 1).toLong())
}

private fun lastWeekdayOfMonth(year: Int, month: Int, weekday: DayOfWeek): LocalDate {
    var day = LocalDate.of(year, month, YearMonth.of(year, month).lengthOfMonth())
    while (day.dayOfWeek != weekday) day = day.minusDays(1)
    return day
}

private val US_HOLIDAY_PRESETS = listOf(
    HolidayPreset("new_years", "New Year's Day") { LocalDate.of(it, 1, 1) },
    HolidayPreset("mlk", "MLK Jr. Day") { nthWeekdayOfMonth(it, 1, DayOfWeek.MONDAY, 3) },
    HolidayPreset("presidents", "Presidents' Day") { nthWeekdayOfMonth(it, 2, DayOfWeek.MONDAY, 3) },
    HolidayPreset("memorial", "Memorial Day") { lastWeekdayOfMonth(it, 5, DayOfWeek.MONDAY) },
    HolidayPreset("juneteenth", "Juneteenth") { LocalDate.of(it, 6, 19) },
    HolidayPreset("independence", "Independence Day") { LocalDate.of(it, 7, 4) },
    HolidayPreset("labor", "Labor Day") { nthWeekdayOfMonth(it, 9, DayOfWeek.MONDAY, 1) },
    HolidayPreset("columbus", "Columbus Day") { nthWeekdayOfMonth(it, 10, DayOfWeek.MONDAY, 2) },
    HolidayPreset("veterans", "Veterans Day") { LocalDate.of(it, 11, 11) },
    HolidayPreset("thanksgiving", "Thanksgiving") { nthWeekdayOfMonth(it, 11, DayOfWeek.THURSDAY, 4) },
    HolidayPreset("day_after_thanksgiving", "Day after Thanksgiving") { nthWeekdayOfMonth(it, 11, DayOfWeek.FRIDAY, 4) },
    HolidayPreset("christmas_eve", "Christmas Eve") { LocalDate.of(it, 12, 24) },
    HolidayPreset("christmas", "Christmas Day") { LocalDate.of(it, 12, 25) },
    HolidayPreset("new_years_eve", "New Year's Eve") { LocalDate.of(it, 12, 31) },
)
private data class VoiceOption(val id: String, val label: String, val description: String, val sample: String)

private val ContractorTypes = listOf(
    LabelValue("roofing", "Roofing"),
    LabelValue("plumbing", "Plumbing"),
    LabelValue("hvac", "HVAC"),
    LabelValue("electrical", "Electrical"),
    LabelValue("information_technology", "Information Technology (IT)"),
    LabelValue("landscaping", "Landscaping"),
    LabelValue("pest_control", "Pest Control"),
    LabelValue("restoration", "Restoration"),
    LabelValue("general_contractor", "General Contractor"),
    LabelValue("painting", "Painting"),
    LabelValue("concrete", "Concrete"),
    LabelValue("pool_services", "Pool Services"),
    LabelValue("pressure_washing", "Pressure Washing"),
    LabelValue("tree_services", "Tree Services"),
    LabelValue("flooring", "Flooring"),
    LabelValue("handyman", "Handyman"),
    LabelValue("solar", "Solar"),
    LabelValue("fencing", "Fencing"),
    LabelValue("other", "Other")
)

private val CarrierOptions = listOf(
    LabelValue("verizon", "Verizon"),
    LabelValue("att", "AT&T"),
    LabelValue("tmobile", "T-Mobile"),
    LabelValue("comcast", "Comcast / Xfinity"),
    LabelValue("ringcentral", "RingCentral"),
    LabelValue("google_voice", "Google Voice"),
    LabelValue("other", "Other")
)

private val AutoResponseModeOptions = listOf(
    LabelValue("off", "Off"),
    LabelValue("call", "Wait For A Call"),
    LabelValue("website", "Send Website"),
    LabelValue("both", "Call Back + Website")
)

private val VoiceOptions = listOf(
    VoiceOption("EXAVITQu4vr4xnSDxMaL", "Sarah", "Warm, professional", "Thanks for calling. I can take the details and make sure the team follows up."),
    VoiceOption("pFZP5JQG7iQjIQuC4Bku", "Lily", "Bright, friendly", "Hi there. I’ll grab a few quick details and get this moving for you."),
    VoiceOption("nPczCjzI2devNBz1zQrb", "Brian", "Calm, confident", "Thanks for calling. Tell me what happened and I’ll route this to the right person."),
    VoiceOption("TX3LPaxmHKxFdv7VOQHJ", "Liam", "Direct, upbeat", "Thanks for reaching out. I’ll keep this quick and get you pointed in the right direction.")
)

private val TeamRoles = listOf("all", "office", "sales", "service", "emergency")

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            CallRecoverTheme {
                val store = remember { SessionStore(applicationContext) }
                val api = remember { CallRecoverApi(store) }
                val vm: CallRecoverViewModel = viewModel(factory = CallRecoverViewModel.factory(api, store))
                CallRecoverApp(vm)
            }
        }
    }
}

class CallRecoverViewModel(private val api: CallRecoverApi, private val store: SessionStore) : ViewModel() {
    var isSignedIn by mutableStateOf(store.accessToken != null)
    var viewer by mutableStateOf<ViewerProfile?>(null)
    var business by mutableStateOf<BusinessProfile?>(null)
    var calls by mutableStateOf<List<CallRecord>>(emptyList())
    var selectedCall by mutableStateOf<CallRecord?>(null)
    var messages by mutableStateOf<List<SmsMessage>>(emptyList())
    var forwarding by mutableStateOf<ForwardingStatus?>(null)
    var scripts by mutableStateOf<List<ScriptTemplate>>(emptyList())
    var selectedScript by mutableStateOf<ScriptTemplate?>(null)
    var assistants by mutableStateOf<List<AssistantNumber>>(emptyList())
    var selectedAssistant by mutableStateOf<AssistantNumber?>(null)
    var teamMembers by mutableStateOf<List<TeamMember>>(emptyList())
    var appointments by mutableStateOf<List<Appointment>>(emptyList())
    var blackouts by mutableStateOf<List<ScheduleBlackout>>(emptyList())
    var notifications by mutableStateOf<List<NotificationItem>>(emptyList())
    var error by mutableStateOf<String?>(null)
    var passwordResetMessage by mutableStateOf<String?>(null)
    var loadWarnings by mutableStateOf<List<String>>(emptyList())
    var pushTokenPreview by mutableStateOf<String?>(null)
    var isLoading by mutableStateOf(false)

    val isAgent: Boolean
        get() = viewer?.isAgent == true

    val canManageTenant: Boolean
        get() = viewer?.canManageTenant == true

    val agentTeamMember: TeamMember?
        get() = viewer?.teamMember ?: teamMembers.firstOrNull { it.id == viewer?.teamMemberId }

    val assignableTeamMembers: List<TeamMember>
        get() = if (isAgent) agentTeamMember?.let { listOf(it) } ?: emptyList() else teamMembers

    val recoveredCount: Int
        get() = calls.count { it.isRecoveredLead() }

    val openLeadCount: Int
        get() = calls.count { !it.isArchivedLead() && (it.leadStatus == null || it.leadStatus == "open") }

    val estimatedRecoveredValue: Int
        get() = recoveredCount * (business?.avgJobValue ?: 500)

    val unreadCount: Int
        get() = notifications.count { !it.read }

    suspend fun signIn(email: String, password: String) = run {
        api.signIn(email, password)
        isSignedIn = true
        loadHome()
    }

    suspend fun requestPasswordReset(email: String) = run {
        passwordResetMessage = null
        api.sendPasswordReset(email)
        passwordResetMessage = "If an account exists, a secure CallRecover reset link has been sent."
    }

    fun clearPasswordResetStatus() {
        passwordResetMessage = null
        error = null
    }

    suspend fun loadHome() = run {
        fun Throwable.toLoadWarning(label: String): String = "$label will retry automatically."
        suspend fun <T> loadSection(label: String, block: suspend () -> T, onLoaded: (T) -> Unit) {
            runCatching { withTimeout(15_000) { block() } }
                .onSuccess(onLoaded)
                .onFailure {
                    if (it is CancellationException || (it.message ?: "").contains("rememberCoroutineScope left the composition", ignoreCase = true)) {
                        return@onFailure
                    } else if ((it.message ?: "").contains("Session expired", ignoreCase = true)) {
                        isSignedIn = false
                        error = "Please sign in again to refresh your session."
                    } else {
                        loadWarnings = loadWarnings + it.toLoadWarning(label)
                    }
                }
        }

        loadWarnings = emptyList()
        viewer = runCatching { withTimeout(15_000) { api.viewerProfile() } }
            .onFailure {
                if ((it.message ?: "").contains("Session expired", ignoreCase = true)) {
                    isSignedIn = false
                    error = "Please sign in again to refresh your session."
                } else if (it !is CancellationException) {
                    loadWarnings = loadWarnings + it.toLoadWarning("Access")
                }
            }
            .getOrNull()
        coroutineScope {
            launch { loadSection("Business", { api.businessProfile(viewer?.businessId) }) { business = it } }
            launch {
                loadSection("Calls", { api.recentCalls() }) { loadedCalls ->
                    calls = loadedCalls
                    selectedCall = loadedCalls.firstOrNull { !it.isArchivedLead() }
                }
            }
            if (!isAgent) {
                launch { loadSection("Scripts", { api.scriptTemplates() }) { scripts = it; selectedScript = it.firstOrNull() } }
                launch { loadSection("Agents", { api.assistantNumbers() }) { assistants = it; selectedAssistant = it.firstOrNull() } }
            } else {
                scripts = emptyList()
                selectedScript = null
                assistants = emptyList()
                selectedAssistant = null
            }
            launch { loadSection("Team", { api.teamMembers() }) { teamMembers = it } }
            launch { loadSection("Appointments", { api.appointments() }) { appointments = it } }
            launch { loadSection("Blackouts", { api.blackouts() }) { blackouts = it } }
            launch { loadSection("Alerts", { api.notifications() }) { notifications = it } }
            launch {
                runCatching { withTimeout(15_000) { api.forwardingStatus() } }
                    .onSuccess { forwarding = it }
            }
        }
        selectedScript = pickScriptForBusiness(scripts, business, selectedScript?.id)
        messages = selectedCall?.callerNumber?.let { number ->
            runCatching { api.smsMessages(number) }.getOrElse { emptyList() }
        } ?: emptyList()
    }

    suspend fun selectCall(call: CallRecord) = run {
        selectedCall = call
        messages = call.callerNumber?.let { api.smsMessages(it) } ?: emptyList()
    }

    suspend fun refreshSelectedConversation() {
        val call = selectedCall ?: return
        try {
            val loadedCalls = api.recentCalls()
            calls = loadedCalls
            selectedCall = loadedCalls.firstOrNull { it.id == call.id && !it.isArchivedLead() }
                ?: if (call.isArchivedLead()) null else call
            messages = selectedCall?.callerNumber?.let { api.smsMessages(it) } ?: emptyList()
            notifications = api.notifications()
        } catch (_: Exception) {
            // The regular app refresh loop will retry; avoid interrupting review.
        }
    }

    suspend fun updateLeadStatus(status: String) = run {
        val call = selectedCall ?: return@run
        val shouldArchive = status == "closed"
        val optimistic = call.copy(
            leadStatus = status,
            status = if (status == "closed") "resolved" else call.status,
            callbackRequested = if (status == "scheduled" || status == "requesting_call") true else call.callbackRequested,
            archivedAt = if (shouldArchive) Instant.now().toString() else call.archivedAt,
        )
        calls = calls.map { if (it.id == call.id) optimistic else it }
        selectedCall = if (shouldArchive) null else optimistic
        api.updateCallLeadStatus(call, status, archive = shouldArchive)
        calls = api.recentCalls()
        selectedCall = if (shouldArchive) null else calls.firstOrNull { it.id == call.id } ?: optimistic
        messages = selectedCall?.callerNumber?.let { api.smsMessages(it) } ?: emptyList()
    }

    suspend fun restoreLead(call: CallRecord) = run {
        val optimistic = call.copy(archivedAt = null, archivedBy = null)
        calls = calls.map { if (it.id == call.id) optimistic else it }
        selectedCall = optimistic
        api.restoreCallArchive(call)
        calls = api.recentCalls()
        selectedCall = calls.firstOrNull { it.id == call.id } ?: optimistic
        messages = selectedCall?.callerNumber?.let { api.smsMessages(it) } ?: emptyList()
    }

    suspend fun recordingUrlFor(call: CallRecord): String? {
        error = null
        return try {
            call.recordingUrl ?: api.recordingUrl(call.id).url
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (!(e.message ?: "").contains("rememberCoroutineScope left the composition", ignoreCase = true)) {
                error = e.message ?: "Could not open recording"
            }
            null
        }
    }

    suspend fun markForwarding(status: ForwardingStatus) = run {
        api.updateForwardingStatus(status)
        forwarding = status
    }

    suspend fun saveAssistant(row: AssistantNumber, name: String, first: String, prompt: String) = run {
        if (!canManageTenant) error("Team member logins cannot edit the AI agent.")
        api.updateAssistant(row, name, first, bookingAwarePrompt(prompt, business))
        api.syncVapiAgent(forceRefresh = false)
        assistants = api.assistantNumbers()
        selectedAssistant = assistants.firstOrNull { it.id == row.id } ?: assistants.firstOrNull()
    }

    suspend fun saveScript(row: ScriptTemplate, label: String, body: String, isDefault: Boolean) = run {
        if (!canManageTenant) error("Team member logins cannot edit scripts.")
        api.updateScript(row, label, bookingAwarePrompt(body, business), isDefault)
        api.syncVapiAgent(forceRefresh = true)
        scripts = api.scriptTemplates()
        selectedScript = pickScriptForBusiness(scripts, business, row.id)
    }

    suspend fun saveBusiness(next: BusinessProfile) = run {
        if (!canManageTenant) error("Team member logins cannot edit business settings.")
        api.updateBusiness(next)
        business = api.businessProfile(viewer?.businessId)
        scripts = api.scriptTemplates()
        selectedScript = pickScriptForBusiness(scripts, business, selectedScript?.id)
        business?.takeIf { !it.schedulingEnabled }?.let { currentBusiness ->
            assistants
                .filter { !it.customPrompt.isNullOrBlank() }
                .forEach { assistant ->
                    val safePrompt = bookingAwarePrompt(assistant.customPrompt.orEmpty(), currentBusiness)
                    if (safePrompt != assistant.customPrompt) {
                        api.updateAssistant(
                            assistant,
                            assistant.assistantName.orEmpty(),
                            assistant.customFirstMessage.orEmpty(),
                            safePrompt
                        )
                    }
                }
            assistants = api.assistantNumbers()
            selectedAssistant = assistants.firstOrNull { it.id == selectedAssistant?.id } ?: assistants.firstOrNull()
        }
        api.syncVapiAgent(forceRefresh = true)
    }

    suspend fun saveObservedHolidays(next: List<HolidaySelection>) = run {
        if (!canManageTenant) error("Team member logins cannot edit holiday closures.")
        val current = business ?: return@run
        business = current.copy(observedHolidays = next)
        api.updateBusiness(current.copy(observedHolidays = next))
        business = api.businessProfile(viewer?.businessId) ?: business

        api.blackouts()
            .filter { it.reason?.startsWith("Holiday: ") == true }
            .forEach { api.deleteBlackout(it.id) }

        val businessId = business?.id ?: current.id
        val years = listOf(LocalDate.now().year, LocalDate.now().year + 1)
        next.forEach { selection ->
            val preset = US_HOLIDAY_PRESETS.find { it.id == selection.id } ?: return@forEach
            years.forEach { year ->
                val date = preset.dateFor(year)
                api.createBlackout(
                    ScheduleBlackoutBody(
                        businessId = businessId,
                        teamMemberId = null,
                        startAt = "${date}T00:00:00Z",
                        endAt = "${date}T23:59:59Z",
                        reason = "Holiday: ${preset.name}"
                    )
                )
            }
        }
        blackouts = api.blackouts()
    }

    suspend fun scanSetupWebsite(url: String): SetupScanResult? {
        error = null
        return try {
            api.scanSetupWebsite(url)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Could not scan website"
            null
        }
    }

    suspend fun saveTeamMember(member: TeamMember) = run {
        if (!canManageTenant) error("Team member logins cannot edit the team.")
        val businessId = business?.id ?: return@run
        api.upsertTeamMember(member, businessId)
        teamMembers = api.teamMembers()
    }

    suspend fun createAppointment(
        teamMemberId: String?,
        scheduledFor: String,
        durationMinutes: Int,
        customerName: String,
        customerPhone: String,
        service: String,
        notes: String
    ) = run {
        val businessId = business?.id ?: return@run
        val safeTeamMemberId = if (isAgent) {
            agentTeamMember?.id ?: error("Your team login is not linked to a team member yet.")
        } else {
            teamMemberId
        }
        api.createAppointment(
            AppointmentBody(
                businessId = businessId,
                teamMemberId = safeTeamMemberId,
                scheduledFor = scheduledFor,
                durationMinutes = durationMinutes,
                customerName = customerName.ifBlank { null },
                customerPhone = customerPhone.ifBlank { null },
                service = service.ifBlank { null },
                notes = notes.ifBlank { null },
            )
        )
        appointments = api.appointments()
    }

    suspend fun cancelAppointment(id: String) = run {
        api.cancelAppointment(id)
        appointments = api.appointments()
    }

    suspend fun createBlackout(teamMemberId: String?, startAt: String, endAt: String, reason: String) = run {
        val businessId = business?.id ?: return@run
        val safeTeamMemberId = if (isAgent) {
            agentTeamMember?.id ?: error("Your team login is not linked to a team member yet.")
        } else {
            teamMemberId
        }
        api.createBlackout(
            ScheduleBlackoutBody(
                businessId = businessId,
                teamMemberId = safeTeamMemberId,
                startAt = startAt,
                endAt = endAt,
                reason = reason.ifBlank { null }
            )
        )
        blackouts = api.blackouts()
    }

    suspend fun deleteBlackout(id: String) = run {
        api.deleteBlackout(id)
        blackouts = api.blackouts()
    }

    suspend fun markNotificationRead(id: String) = run {
        api.markNotificationRead(id)
        notifications = api.notifications()
    }

    suspend fun registerPushToken(token: String) = run {
        api.registerPushToken(token, null)
    }

    suspend fun voicePreviewAudio(voiceId: String, text: String): ByteArray {
        error = null
        return try {
            api.voicePreview(voiceId, text)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = e.message ?: "Could not load voice preview"
            throw e
        }
    }

    fun syncPushTokenFromFirebase() {
        try {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { token ->
                    pushTokenPreview = token.take(8) + "..."
                    viewModelScope.launch { runCatching { api.registerPushToken(token, null) } }
                }
                .addOnFailureListener { /* Push token sync retries on the next automatic refresh. */ }
        } catch (syncError: Exception) {
            // Push token sync is background-only; do not interrupt the operator workflow.
        }
    }

    fun signOut() {
        api.signOut()
        isSignedIn = false
        viewer = null
        business = null
        calls = emptyList()
        selectedCall = null
        messages = emptyList()
        scripts = emptyList()
        selectedScript = null
        assistants = emptyList()
        teamMembers = emptyList()
        appointments = emptyList()
        blackouts = emptyList()
        notifications = emptyList()
    }

    private suspend fun run(block: suspend () -> Unit) {
        isLoading = true
        error = null
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            if (!(e.message ?: "").contains("rememberCoroutineScope left the composition", ignoreCase = true)) {
                error = e.message ?: "Something went wrong"
            }
        } finally {
            isLoading = false
        }
    }

    companion object {
        fun factory(api: CallRecoverApi, store: SessionStore) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = CallRecoverViewModel(api, store) as T
        }
    }
}

@Composable
fun CallRecoverApp(vm: CallRecoverViewModel) {
    Surface(Modifier.fillMaxSize(), color = Color.Transparent) {
        if (!vm.isSignedIn) LoginScreen(vm) else HomeScreen(vm)
    }
}

@Composable
fun LoginScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showResetDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(PremiumGradient)
            .padding(horizontal = 24.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(top = 34.dp, bottom = 34.dp)
        ) {
            BrandMark()
            Spacer(Modifier.height(12.dp))
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = Color.White.copy(alpha = 0.78f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.96f)),
                shadowElevation = 3.dp
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
                ) {
                    Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("AI missed-call recovery", color = Slate, style = MaterialTheme.typography.labelLarge)
                }
            }
            Spacer(Modifier.height(30.dp))
            LoginCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Sign in", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Ink)
                        Text("Access your AI call recovery workspace.", color = Slate)
                    }
                }
                Spacer(Modifier.height(24.dp))
                PremiumTextField(email, { email = it }, "Email")
                Spacer(Modifier.height(14.dp))
                PremiumTextField(password, { password = it }, "Password", isPassword = true)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = {
                        vm.clearPasswordResetStatus()
                        showResetDialog = true
                    }) {
                        Text("Forgot password?", fontWeight = FontWeight.SemiBold)
                    }
                }
                Spacer(Modifier.height(22.dp))
                Button(
                    onClick = { scope.launch { vm.signIn(email.trim(), password) } },
                    enabled = email.isNotBlank() && password.isNotBlank() && !vm.isLoading,
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        disabledContainerColor = Color(0xFFE6E8EF),
                        disabledContentColor = Color(0xFFA9A39A)
                    ),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text(if (vm.isLoading) "Signing in..." else "Sign in", fontWeight = FontWeight.Bold)
                }
                vm.error?.let {
                    Spacer(Modifier.height(14.dp))
                    ErrorCard(it)
                }
            }
        }
    }

    if (showResetDialog) {
        ForgotPasswordDialog(
            vm = vm,
            initialEmail = email,
            onDismiss = {
                showResetDialog = false
                vm.clearPasswordResetStatus()
            },
        )
    }
}

@Composable
fun ForgotPasswordDialog(vm: CallRecoverViewModel, initialEmail: String, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    var resetEmail by remember { mutableStateOf(initialEmail) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(28.dp),
            color = Panel,
            border = BorderStroke(1.dp, PanelStroke),
            shadowElevation = 18.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.padding(24.dp)) {
                Text("Reset password", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Ink)
                Spacer(Modifier.height(6.dp))
                Text("Enter your account email and we will send a secure reset link.", color = Slate)
                Spacer(Modifier.height(22.dp))
                PremiumTextField(resetEmail, { resetEmail = it }, "Email")

                vm.passwordResetMessage?.let {
                    Spacer(Modifier.height(14.dp))
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = SoftTeal,
                        border = BorderStroke(1.dp, Color(0xFFC7F7EC)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(it, color = Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(14.dp))
                    }
                }

                vm.error?.let {
                    Spacer(Modifier.height(14.dp))
                    ErrorCard(it)
                }

                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = { scope.launch { vm.requestPasswordReset(resetEmail.trim()) } },
                    enabled = resetEmail.isNotBlank() && !vm.isLoading,
                    shape = RoundedCornerShape(18.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp)
                ) {
                    Text(if (vm.isLoading) "Sending..." else "Send reset link", fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) {
                    Text("Close", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
fun BrandMark() {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center) {
        AppIconMark(markSize = 46.dp, iconSize = 22.dp)
        Spacer(Modifier.width(10.dp))
        Column {
            Text("CallRecover AI", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
            Text("AI tool for recovering missed leads", style = MaterialTheme.typography.bodySmall, color = Slate)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(vm: CallRecoverViewModel) {
    val context = LocalContext.current
    var tab by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        suspend fun refreshQuietly() {
            vm.loadHome()
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            ) {
                vm.syncPushTokenFromFirebase()
            }
        }

        refreshQuietly()
        while (true) {
            delay(90_000)
            refreshQuietly()
        }
    }

    Scaffold(
        modifier = Modifier.background(PremiumGradient),
        containerColor = Color.Transparent,
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AppIconMark(markSize = 34.dp, iconSize = 18.dp)
                        Spacer(Modifier.width(10.dp))
                        Text("CallRecover AI", fontWeight = FontWeight.Bold, color = Ink)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent),
                actions = {
                    PremiumIconButton(onClick = { vm.signOut() }) { Icon(Icons.AutoMirrored.Filled.Logout, "Sign out", tint = Slate) }
                }
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = Color(0xFFF5EAD0),
                tonalElevation = 18.dp
            ) {
                NavigationBarItem(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    icon = { Icon(Icons.Default.Insights, null) },
                    label = { Text("Home", fontWeight = if (tab == 0) FontWeight.Bold else FontWeight.SemiBold) },
                    colors = premiumNavColors()
                )
                NavigationBarItem(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    icon = { Icon(Icons.Default.Inbox, null) },
                    label = { Text("Leads", fontWeight = if (tab == 1) FontWeight.Bold else FontWeight.SemiBold) },
                    colors = premiumNavColors()
                )
                NavigationBarItem(
                    selected = tab == 2,
                    onClick = { tab = 2 },
                    icon = { Icon(Icons.Default.CalendarMonth, null) },
                    label = { Text("Booking", fontWeight = if (tab == 2) FontWeight.Bold else FontWeight.SemiBold) },
                    colors = premiumNavColors()
                )
                NavigationBarItem(
                    selected = tab == 3,
                    onClick = { tab = 3 },
                    icon = { Icon(Icons.Default.Group, null) },
                    label = { Text("Team", fontWeight = if (tab == 3) FontWeight.Bold else FontWeight.SemiBold) },
                    colors = premiumNavColors()
                )
                NavigationBarItem(
                    selected = tab == 4,
                    onClick = { tab = 4 },
                    icon = { Icon(if (vm.isAgent) Icons.Default.Settings else Icons.Default.MoreHoriz, null) },
                    label = { Text(if (vm.isAgent) "Settings" else "More", fontWeight = if (tab == 4) FontWeight.Bold else FontWeight.SemiBold) },
                    colors = premiumNavColors()
                )
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            vm.error?.let { item { ErrorCard(it) } }
            if (vm.loadWarnings.isNotEmpty()) item { WarningCard(vm.loadWarnings) }
            item {
                when (tab) {
                    0 -> DashboardScreen(vm)
                    1 -> InboxScreen(vm)
                    2 -> BookingScreen(vm)
                    3 -> TeamScreen(vm)
                    4 -> if (vm.isAgent) AgentSettingsScreen(vm) else MoreScreen(vm)
                }
            }
        }
    }
}

@Composable
fun DashboardScreen(vm: CallRecoverViewModel) {
    if (vm.viewer == null) {
        EmptyCard("Loading access", "Your CallRecover workspace is syncing.")
        return
    }
    if (vm.isAgent) {
        AgentDashboardScreen(vm)
        return
    }
    DashboardActionsCard(vm)
    Spacer(Modifier.height(12.dp))
    RecoveredRevenueCard(vm)
}

@Composable
fun AgentDashboardScreen(vm: CallRecoverViewModel) {
    val activeCalls = vm.calls.filterNot { it.isArchivedLead() }
    val responseRate = if (vm.calls.isEmpty()) 0 else ((vm.recoveredCount.toFloat() / vm.calls.size.toFloat()) * 100).toInt()

    SectionHeader("Assigned calls", vm.agentTeamMember?.name ?: "Team member")
    Spacer(Modifier.height(10.dp))
    AppCard {
        Text("Agent dashboard", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Text("Your assigned recovered calls and follow-up work.", color = Slate)
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            MetricTile("${vm.recoveredCount}", "recovered", SoftIndigo, Modifier.weight(1f))
            MetricTile("${responseRate}%", "response", SoftTeal, Modifier.weight(1f))
            MetricTile("${vm.openLeadCount}", "open", SoftSky, Modifier.weight(1f))
        }
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Live activity", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(8.dp))
        if (activeCalls.isEmpty()) {
            Text("No assigned leads yet.", color = Slate)
        } else {
            activeCalls.take(5).forEachIndexed { index, call ->
                Text(call.callerName ?: call.callerNumber ?: "Unknown caller", fontWeight = FontWeight.SemiBold, color = Ink)
                Text(call.aiSummaryShort ?: call.aiSummary ?: "Lead details will appear here.", color = Slate, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (index != activeCalls.take(5).lastIndex) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider(color = PanelStroke)
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
fun DashboardActionsCard(vm: CallRecoverViewModel) {
    var showForwarding by remember { mutableStateOf(false) }
    val forwardingReady = vm.forwarding?.status in listOf("user_confirmed", "test_detected")

    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(46.dp)
                    .background(AiViolet, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("AI call recovery", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text(if (forwardingReady) "Forwarding is active. The AI agent can catch missed calls." else "Connect missed calls to the AI agent in one forwarding step.", color = Slate)
            }
        }
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = { showForwarding = true },
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.SettingsPhone, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text(if (forwardingReady) "Review forwarding" else "Forward calls")
        }
    }

    if (showForwarding) {
        ForwardingActionDialog(vm = vm, allowEditing = true, onDismiss = { showForwarding = false })
    }
}

@Composable
fun RecoveredRevenueCard(vm: CallRecoverViewModel) {
    val chartPoints = recoveredRevenueBuckets(vm.calls, vm.business?.avgJobValue ?: 500)
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Insights, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Estimated recovered revenue", fontWeight = FontWeight.SemiBold, color = Ink)
        }
        Spacer(Modifier.height(14.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(Modifier.weight(1f)) {
                Text("${vm.recoveredCount}", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("recovered calls", color = Slate, fontWeight = FontWeight.SemiBold)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("$${vm.estimatedRecoveredValue}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
                Text("est. recovered revenue", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
        }
        Spacer(Modifier.height(14.dp))
        RevenueChart(chartPoints)
    }
}

@Composable
fun RevenueChart(points: List<Pair<String, Int>>) {
    val maxValue = (points.maxOfOrNull { it.second } ?: 0).coerceAtLeast(1)
    Column {
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Bottom,
            modifier = Modifier.fillMaxWidth().height(148.dp)
        ) {
            points.forEach { point ->
                val percent = point.second.toFloat() / maxValue.toFloat()
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Bottom,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                ) {
                    Text(
                        if (point.second == 0) "$0" else "$${point.second}",
                        color = Slate,
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1
                    )
                    Spacer(Modifier.height(4.dp))
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(92.dp),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height((22 + (62 * percent)).dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFD6A84F))
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        point.first,
                        color = Slate,
                        style = MaterialTheme.typography.labelMedium,
                        maxLines = 1,
                        modifier = Modifier.height(18.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun ForwardingSetupCard(vm: CallRecoverViewModel, allowEditing: Boolean = false) {
    var showDialog by remember { mutableStateOf(false) }
    val suggestedForwardingNumber = vm.forwarding?.forwardingNumber
        ?: vm.business?.twilioNumber
        ?: vm.assistants.firstOrNull { !it.phoneNumber.isNullOrBlank() }?.phoneNumber
        ?: ""
    val confirmed = vm.forwarding?.status in listOf("user_confirmed", "test_detected")

    SectionHeader("Forwarding", if (confirmed) "Confirmed" else "2 Steps")
    Spacer(Modifier.height(10.dp))
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(48.dp)
                    .background(SoftSky, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.SettingsPhone, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Missed-call forwarding", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text(
                    when {
                        confirmed -> "Forwarding is marked on."
                        suggestedForwardingNumber.isBlank() -> "Add the forwarding number to generate the code."
                        else -> "Open the two-step forwarding assistant."
                    },
                    color = Slate
                )
            }
            StatusChip(if (confirmed) "on" else "setup")
        }
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = { showDialog = true },
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Call, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text(if (confirmed) "Review forwarding" else "Forward calls")
        }
    }

    if (showDialog) {
        ForwardingActionDialog(vm = vm, allowEditing = allowEditing, onDismiss = { showDialog = false })
    }
}

@Composable
fun ForwardingActionDialog(vm: CallRecoverViewModel, allowEditing: Boolean = false, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val suggestedForwardingNumber = vm.forwarding?.forwardingNumber
        ?: vm.business?.twilioNumber
        ?: vm.assistants.firstOrNull { !it.phoneNumber.isNullOrBlank() }?.phoneNumber
        ?: ""
    var draftForwardingNumber by remember(suggestedForwardingNumber) { mutableStateOf(suggestedForwardingNumber) }
    var selectedCarrier by remember(vm.forwarding?.carrier, vm.business?.carrier) {
        mutableStateOf(vm.forwarding?.carrier ?: vm.business?.carrier ?: "other")
    }
    val forwardingNumber = draftForwardingNumber.ifBlank { suggestedForwardingNumber }
    val dialCode = forwardingDialCode(selectedCarrier, forwardingNumber)
    val confirmed = vm.forwarding?.status in listOf("user_confirmed", "test_detected")

    fun copyText(label: String, value: String) {
        val clipboard = context.getSystemService(ClipboardManager::class.java)
        clipboard.setPrimaryClip(ClipData.newPlainText(label, value))
        Toast.makeText(context, "$label copied", Toast.LENGTH_SHORT).show()
    }

    ActionDialog(
        title = "Forward missed calls",
        subtitle = if (confirmed) "Forwarding is marked on for this business." else "Copy the forwarding code, dial it, then confirm it is on.",
        onDismiss = onDismiss
    ) {
        Text("Carrier", fontWeight = FontWeight.SemiBold, color = Ink)
        Text(
            if (!vm.business?.carrier.isNullOrBlank()) "Using ${carrierLabel(vm.business?.carrier)} from setup. Change it if the line moved carriers." else "Select the carrier for the business phone line.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(8.dp))
        CarrierPicker(selectedCarrier) { selectedCarrier = it }
        Spacer(Modifier.height(12.dp))
        if (suggestedForwardingNumber.isBlank() && allowEditing) {
            Text("Add the CallRecover forwarding number from initial setup.", color = Slate)
            Spacer(Modifier.height(12.dp))
            PremiumTextField(draftForwardingNumber, { draftForwardingNumber = it }, "Forwarding number")
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    val nextCode = forwardingDialCode(selectedCarrier, draftForwardingNumber)
                    scope.launch {
                        vm.business?.let { vm.saveBusiness(it.copy(carrier = selectedCarrier)) }
                        vm.markForwarding(
                            ForwardingStatus(
                                status = "not_started",
                                carrier = selectedCarrier,
                                forwardingNumber = draftForwardingNumber,
                                dialCode = nextCode
                            )
                        )
                    }
                },
                enabled = draftForwardingNumber.isNotBlank(),
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Save forwarding number")
            }
            return@ActionDialog
        }

        if (forwardingNumber.isBlank()) {
            Text("Forwarding number is not set yet. Add the CallRecover number when the production line is ready.", color = Slate)
            return@ActionDialog
        }

        Text("Forwarding extension", color = Slate, style = MaterialTheme.typography.bodySmall)
        Text(forwardingInstruction(selectedCarrier), color = Slate, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(6.dp))
        Text(
            "Carrier notice: your provider may charge additional fees or use plan minutes for call forwarding. Check your carrier's terms if you are unsure.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(6.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(SoftIndigo)
                .padding(16.dp)
        ) {
            Text(dialCode, color = Ink, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
        }
        Spacer(Modifier.height(14.dp))
        FilledTonalButton(
            onClick = { copyText("Forwarding extension", dialCode) },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Copy forwarding extension")
        }
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.business?.let { vm.saveBusiness(it.copy(carrier = selectedCarrier)) }
                    vm.markForwarding(
                        ForwardingStatus(
                            status = "dialer_opened",
                            carrier = selectedCarrier,
                            forwardingNumber = forwardingNumber,
                            dialCode = dialCode
                        )
                    )
                }
                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(dialCode)}")))
            },
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Call, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Step 1: open dialer")
        }
        Spacer(Modifier.height(10.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(if (confirmed) SoftTeal else Color(0xFFF8FAFC))
                .clickable {
                    scope.launch {
                        vm.business?.let { vm.saveBusiness(it.copy(carrier = selectedCarrier)) }
                        vm.markForwarding(
                            ForwardingStatus(
                                status = if (confirmed) "dialer_opened" else "user_confirmed",
                                carrier = selectedCarrier,
                                forwardingNumber = forwardingNumber,
                                dialCode = dialCode
                            )
                        )
                    }
                }
                .padding(10.dp)
        ) {
            Checkbox(
                checked = confirmed,
                onCheckedChange = { checked ->
                    scope.launch {
                        vm.business?.let { vm.saveBusiness(it.copy(carrier = selectedCarrier)) }
                        vm.markForwarding(
                            ForwardingStatus(
                                status = if (checked) "user_confirmed" else "dialer_opened",
                                carrier = selectedCarrier,
                                forwardingNumber = forwardingNumber,
                                dialCode = dialCode
                            )
                        )
                    }
                }
            )
            Column(Modifier.weight(1f)) {
                Text("Forwarding is turned on", fontWeight = FontWeight.SemiBold, color = Ink)
                Text("Check this after your phone accepts the extension.", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
fun SetupChecklist(vm: CallRecoverViewModel, onAction: (SetupAction) -> Unit = {}) {
    val business = vm.business
    val forwardingReady = vm.forwarding?.status in listOf("user_confirmed", "test_detected")
    val bookingReady = business?.schedulingEnabled == true ||
        !business?.bookingUrl.isNullOrBlank() ||
        !business?.calUrl.isNullOrBlank() ||
        !business?.calendlyUrl.isNullOrBlank()
    val items = listOf(
        SetupItem("Forwarding Active", forwardingReady, SetupAction.Forwarding),
        SetupItem("Business Profile", business != null && business.businessName.isNotBlank() && !business.ownerPhone.isNullOrBlank(), SetupAction.Business),
        SetupItem("AI Agent Connected", vm.assistants.any { !it.assistantId.isNullOrBlank() }, SetupAction.Agent),
        SetupItem("Script Library", vm.scripts.isNotEmpty(), SetupAction.Scripts),
        SetupItem("Team Routing", vm.teamMembers.any { it.active }, SetupAction.Team),
        SetupItem("Scheduling", bookingReady, SetupAction.Scheduling),
        SetupItem("Alerts Configured", business?.notifyDashboard == true || business?.notifySms == true || business?.notifyEmail == true, SetupAction.Alerts),
    )
    val done = items.count { it.done }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Setup readiness", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("$done of ${items.size} essentials ready", color = Slate)
            }
            StatusChip(if (done == items.size) "ready" else "in progress")
        }
        Spacer(Modifier.height(10.dp))
        items.forEach { item ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { onAction(item.action) }
                    .padding(vertical = 8.dp, horizontal = 4.dp)
            ) {
                Box(
                    Modifier
                        .size(28.dp)
                        .background(if (item.done) SoftTeal else Color(0xFFF2F4F7), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (item.done) {
                        Icon(
                            Icons.Default.CheckCircle,
                            null,
                            tint = Color(0xFF8A6A22),
                            modifier = Modifier.size(16.dp)
                        )
                    } else {
                        Box(
                            Modifier
                                .size(8.dp)
                                .background(Slate.copy(alpha = 0.55f), CircleShape)
                        )
                    }
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    item.label,
                    color = if (item.done) Ink else Slate,
                    fontWeight = if (item.done) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.weight(1f)
                )
                Text(if (item.done) "Edit" else "Fix", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

private fun bookingLinkDisplay(business: BusinessProfile): String =
    listOf(business.calUrl, business.calendlyUrl, business.bookingUrl)
        .firstOrNull { !it.isNullOrBlank() }
        ?: "Coming soon - booking links will appear here when connected."

enum class SetupAction { Business, Forwarding, Agent, Scripts, Team, Scheduling, Alerts }

private data class SetupItem(val label: String, val done: Boolean, val action: SetupAction)

@Composable
fun InboxScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val call = vm.selectedCall
    val sortedCalls = remember(vm.calls) {
        vm.calls
            .filterNot { it.isArchivedLead() }
            .sortedWith(priorityLeadComparator())
    }
    val archivedCalls = remember(vm.calls) {
        vm.calls
            .filter { it.isArchivedLead() }
            .sortedByDescending { it.createdAt ?: "" }
    }

    LaunchedEffect(call?.id) {
        if (call == null) return@LaunchedEffect
        while (true) {
            delay(12_000)
            vm.refreshSelectedConversation()
        }
    }

    SectionHeader("Leads", "${sortedCalls.size} recent")
    Spacer(Modifier.height(10.dp))
    if (sortedCalls.isEmpty()) {
        EmptyCard("No calls yet", "New missed calls will appear here with transcript, recording, and SMS follow-up.")
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            sortedCalls.forEach { item ->
                AppCard(onClick = { scope.launch { vm.selectCall(item) } }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.callerName ?: item.callerNumber ?: "Unknown caller",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = Ink
                            )
                            Text(
                                item.aiSummaryShort ?: item.serviceNeeded ?: item.aiSummary ?: "No summary yet",
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                color = Slate
                            )
                        }
                        StatusChip(item.leadStatus ?: item.priority ?: item.urgency ?: item.status ?: "new")
                    }
                    item.createdAt?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(prettyDate(it), style = MaterialTheme.typography.bodySmall, color = Slate)
                    }
                }
            }
        }
    }
    if (archivedCalls.isNotEmpty()) {
        Spacer(Modifier.height(16.dp))
        SectionHeader("Archived", "${archivedCalls.size} completed")
        Spacer(Modifier.height(10.dp))
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            archivedCalls.forEach { item ->
                AppCard(onClick = { scope.launch { vm.selectCall(item) } }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                item.callerName ?: item.callerNumber ?: "Unknown caller",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = Ink
                            )
                            Text(
                                item.aiSummaryShort ?: item.serviceNeeded ?: item.aiSummary ?: "Archived lead",
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                color = Slate
                            )
                        }
                        StatusChip("archived")
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = { scope.launch { vm.restoreLead(item) } },
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Restore")
                    }
                }
            }
        }
    }
    Spacer(Modifier.height(14.dp))
    SectionHeader("Conversation", if (call == null) "Select a lead" else call.createdAt?.let(::prettyDate) ?: "Review lead details")
    Spacer(Modifier.height(10.dp))
    if (call == null) {
        EmptyCard("No lead selected", "Pick a caller above to review the transcript, recording, and messages.")
        return
    }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(call.callerName ?: "Selected lead", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(call.leadStatus ?: call.status ?: "new lead", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
            StatusChip(call.priority ?: call.urgency ?: "normal")
        }
        displaySummary(call)?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilledTonalButton(
                onClick = { call.callerNumber?.let { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$it"))) } },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Call, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Call")
            }
            FilledTonalButton(
                onClick = { openNativeSms(context, call.callerNumber) },
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.AutoMirrored.Filled.Message, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Text")
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            RecordingPlaybackButton(vm, call)
        }
        call.transcript?.let {
            Spacer(Modifier.height(16.dp))
            TranscriptPanel(it)
        }
        Spacer(Modifier.height(8.dp))
        if (call.isArchivedLead()) {
            FilledTonalButton(
                onClick = {
                    scope.launch {
                        vm.restoreLead(call)
                        Toast.makeText(context, "Lead restored", Toast.LENGTH_SHORT).show()
                    }
                },
                shape = RoundedCornerShape(16.dp),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 14.dp),
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Restore lead", maxLines = 1, softWrap = false)
            }
        } else {
            LeadStatusActionButtons(
                currentStatus = call.leadStatus,
                onStatus = { nextStatus, label ->
                    scope.launch {
                        vm.updateLeadStatus(nextStatus)
                        Toast.makeText(context, "Lead marked $label", Toast.LENGTH_SHORT).show()
                    }
                }
            )
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                FilledTonalButton(
                    onClick = {
                        scope.launch {
                            vm.updateLeadStatus("contacted")
                            Toast.makeText(context, "Lead marked contacted", Toast.LENGTH_SHORT).show()
                        }
                    },
                    enabled = call.leadStatus != "contacted",
                    shape = RoundedCornerShape(16.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 14.dp),
                    modifier = Modifier.weight(1.45f).height(56.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(if (call.leadStatus == "contacted") "Contacted" else "Mark contacted", maxLines = 1, softWrap = false)
                }
                FilledTonalButton(
                    onClick = {
                        scope.launch {
                            vm.updateLeadStatus("closed")
                            Toast.makeText(context, "Lead resolved and archived", Toast.LENGTH_SHORT).show()
                        }
                    },
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(containerColor = CompleteSurface, contentColor = CompleteInk),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 14.dp),
                    modifier = Modifier.weight(1f).height(56.dp)
                ) {
                    Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Resolved", maxLines = 1, softWrap = false)
                }
            }
        }
    }
    Spacer(Modifier.height(10.dp))
    var smsExpanded by remember(call.id) { mutableStateOf(false) }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("SMS thread", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("Read-only system history", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
            TextButton(onClick = { smsExpanded = !smsExpanded }) {
                Text(if (smsExpanded) "Hide" else "Show")
            }
        }
        if (smsExpanded) {
            Spacer(Modifier.height(8.dp))
            if (vm.messages.isEmpty()) {
                Text("No messages yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                vm.messages.forEach { msg ->
                    SmsBubble(msg)
                    Spacer(Modifier.height(8.dp))
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                "Use Text above so the assigned team member replies from their own phone, not the CallRecover system number.",
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
        } else {
            Spacer(Modifier.height(8.dp))
            Text("${vm.messages.size} message${if (vm.messages.size == 1) "" else "s"} recorded. Tap Show to review.", color = Slate)
        }
    }
}

private val LeadStatusActions = listOf(
    "active" to "Active",
    "requesting_call" to "Requesting Call",
    "in_progress" to "In Progress"
)

@Composable
fun LeadStatusActionButtons(
    currentStatus: String?,
    onStatus: (status: String, label: String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            LeadStatusActionButton(
                status = LeadStatusActions[0].first,
                label = LeadStatusActions[0].second,
                selected = currentStatus == LeadStatusActions[0].first,
                modifier = Modifier.weight(1f),
                onStatus = onStatus
            )
            LeadStatusActionButton(
                status = LeadStatusActions[1].first,
                label = LeadStatusActions[1].second,
                selected = currentStatus == LeadStatusActions[1].first,
                modifier = Modifier.weight(1.35f),
                onStatus = onStatus
            )
        }
        LeadStatusActionButton(
            status = LeadStatusActions[2].first,
            label = LeadStatusActions[2].second,
            selected = currentStatus == LeadStatusActions[2].first,
            modifier = Modifier.fillMaxWidth(),
            onStatus = onStatus
        )
    }
}

@Composable
fun LeadStatusActionButton(
    status: String,
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onStatus: (status: String, label: String) -> Unit
) {
    FilledTonalButton(
        onClick = { if (!selected) onStatus(status, label.lowercase()) },
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = if (selected) statusChipColor(status) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.72f),
            contentColor = if (selected) statusTextColor(status) else Ink
        ),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 12.dp),
        modifier = modifier.height(52.dp)
    ) {
        if (selected) {
            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(5.dp))
        }
        Text(label, maxLines = 1, softWrap = false, overflow = TextOverflow.Ellipsis)
    }
}

private data class TranscriptSegment(val speaker: String, val text: String, val isAgent: Boolean)

@Composable
fun TranscriptPanel(transcript: String) {
    var expanded by remember(transcript) { mutableStateOf(false) }
    val segments = remember(transcript) { transcriptSegments(transcript) }
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFFFBFAF6),
        border = BorderStroke(1.dp, PanelStroke),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
            ) {
                Column(Modifier.weight(1f)) {
                    Text("Transcript", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
                    Text(
                        if (expanded) "${segments.size} turns" else "Collapsed by default",
                        color = Slate,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                TextButton(onClick = { expanded = !expanded }) {
                    Text(if (expanded) "Hide" else "Show", fontWeight = FontWeight.SemiBold)
                }
            }
            if (expanded) {
                Spacer(Modifier.height(10.dp))
                segments.forEach { segment ->
                    TranscriptBubble(segment)
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun TranscriptBubble(segment: TranscriptSegment) {
    Row(
        horizontalArrangement = if (segment.isAgent) Arrangement.Start else Arrangement.End,
        modifier = Modifier.fillMaxWidth()
    ) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = if (segment.isAgent) Color(0xFFFFF8E6) else ActiveSurface,
            border = BorderStroke(1.dp, if (segment.isAgent) Color(0xFFE8D097) else Color(0xFFBFE8D0)),
            modifier = Modifier.fillMaxWidth(0.9f)
        ) {
            Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                Text(
                    segment.speaker,
                    color = if (segment.isAgent) Color(0xFF8A6A22) else ActiveGreen,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.height(2.dp))
                Text(segment.text, color = Ink)
            }
        }
    }
}

@Composable
fun RecordingPlaybackButton(vm: CallRecoverViewModel, call: CallRecord) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var player by remember(call.id) { mutableStateOf<MediaPlayer?>(null) }
    var isPreparing by remember(call.id) { mutableStateOf(false) }
    var isPlaying by remember(call.id) { mutableStateOf(false) }

    fun releasePlayer() {
        player?.release()
        player = null
        isPreparing = false
        isPlaying = false
    }

    DisposableEffect(call.id) {
        onDispose { releasePlayer() }
    }

    FilledTonalButton(
        enabled = !isPreparing,
        onClick = {
            if (isPlaying || isPreparing) {
                releasePlayer()
                return@FilledTonalButton
            }

            scope.launch {
                isPreparing = true
                val url = vm.recordingUrlFor(call)
                if (url.isNullOrBlank()) {
                    isPreparing = false
                    return@launch
                }

                runCatching {
                    val nextPlayer = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        )
                        setDataSource(context, Uri.parse(url))
                        setOnPreparedListener { mediaPlayer ->
                            isPreparing = false
                            isPlaying = true
                            mediaPlayer.start()
                        }
                        setOnCompletionListener { mediaPlayer ->
                            if (player === mediaPlayer) player = null
                            isPreparing = false
                            isPlaying = false
                            mediaPlayer.release()
                        }
                        setOnErrorListener { mediaPlayer, _, _ ->
                            if (player === mediaPlayer) player = null
                            isPreparing = false
                            isPlaying = false
                            vm.error = "Could not play recording"
                            mediaPlayer.release()
                            true
                        }
                        prepareAsync()
                    }
                    player?.release()
                    player = nextPlayer
                }.onFailure { error ->
                    isPreparing = false
                    isPlaying = false
                    vm.error = error.message ?: "Could not play recording"
                }
            }
        }
    ) {
        Icon(
            if (isPlaying || isPreparing) Icons.Default.Stop else Icons.Default.PlayArrow,
            null,
            modifier = Modifier.size(16.dp)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            when {
                isPreparing -> "Loading"
                isPlaying -> "Stop"
                else -> "Recording"
            }
        )
    }
}

@Composable
fun SmsBubble(message: SmsMessage) {
    val outbound = message.direction.equals("outbound", ignoreCase = true)
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (outbound) Arrangement.End else Arrangement.Start
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.86f)
                .clip(
                    RoundedCornerShape(
                        topStart = 18.dp,
                        topEnd = 18.dp,
                        bottomStart = if (outbound) 18.dp else 6.dp,
                        bottomEnd = if (outbound) 6.dp else 18.dp
                    )
                )
                .background(if (outbound) MaterialTheme.colorScheme.primary else SoftSky)
                .padding(12.dp)
        ) {
            Text(
                message.body,
                color = if (outbound) Color.White else Ink,
                style = MaterialTheme.typography.bodyMedium
            )
            message.createdAt?.let {
                Spacer(Modifier.height(4.dp))
                Text(
                    prettyDate(it),
                    color = if (outbound) Color.White.copy(alpha = 0.78f) else Slate,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
fun ForwardingScreen(vm: CallRecoverViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var forwardingNumber by remember(vm.forwarding?.forwardingNumber) { mutableStateOf(vm.forwarding?.forwardingNumber ?: "") }
    val dialCode = if (forwardingNumber.isBlank()) "" else "**21*$forwardingNumber#"

    SectionHeader("Call forwarding", prettyLabel(vm.forwarding?.status ?: "not started"))
    Spacer(Modifier.height(10.dp))
    AppCard {
        Text("Forward missed calls to CallRecover", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text("Open your phone dialer with the carrier forwarding code, then confirm when it is enabled.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            "Carrier notice: your provider may charge additional fees or use plan minutes for call forwarding. Check your carrier's terms if you are unsure.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(14.dp))
        PremiumTextField(forwardingNumber, { forwardingNumber = it }, "Forwarding number")
        Spacer(Modifier.height(12.dp))
        Button(
            enabled = forwardingNumber.isNotBlank(),
            onClick = {
                scope.launch { vm.markForwarding(ForwardingStatus(status = "dialer_opened", forwardingNumber = forwardingNumber, dialCode = dialCode)) }
                context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(dialCode)}")))
            },
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Call, null)
            Spacer(Modifier.width(8.dp))
            Text("Open dialer")
        }
        TextButton(onClick = {
            scope.launch { vm.markForwarding(ForwardingStatus(status = "user_confirmed", forwardingNumber = forwardingNumber, dialCode = dialCode)) }
        }) {
            Text("I turned forwarding on")
        }
    }
}

@Composable
fun StudioScreen(vm: CallRecoverViewModel) {
    var section by remember { mutableStateOf("agent") }
    SectionHeader("Agent studio", "Scripts, behavior prompts, and the account assistant")
    Spacer(Modifier.height(10.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = section == "agent",
            onClick = { section = "agent" },
            label = { Text("Agent") },
            leadingIcon = { Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(16.dp)) }
        )
        FilterChip(
            selected = section == "scripts",
            onClick = { section = "scripts" },
            label = { Text("Scripts") },
            leadingIcon = { Icon(Icons.Default.Description, null, modifier = Modifier.size(16.dp)) }
        )
    }
    Spacer(Modifier.height(12.dp))
    if (section == "agent") AgentScreen(vm) else ScriptsScreen(vm)
}

@Composable
fun ScriptsScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val associatedScripts = scriptsForBusiness(vm.scripts, vm.business)
    val visibleScripts = associatedScripts.ifEmpty { vm.scripts }
    val selected = vm.selectedScript?.takeIf { it in visibleScripts } ?: visibleScripts.firstOrNull()
    var label by remember(selected?.id) { mutableStateOf(selected?.label ?: "") }
    var body by remember(selected?.id, vm.business?.schedulingEnabled) { mutableStateOf(bookingAwarePrompt(selected?.body ?: "", vm.business)) }
    var isDefault by remember(selected?.id) { mutableStateOf(selected?.isDefault ?: false) }

    SectionHeader("Scripts", "${visibleScripts.size} Associated")
    Spacer(Modifier.height(10.dp))
    if (vm.scripts.isEmpty()) {
        EmptyCard("No scripts found", "Script templates will appear here after setup.")
        return
    }
    vm.business?.let { business ->
        AppCard {
            Text("Business type and scripts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
            Text("Showing scripts matched to ${business.contractorType?.let(::businessTypeLabel) ?: "Any Business Type"}.", color = Slate)
            Spacer(Modifier.height(10.dp))
            BusinessTypePicker(business.contractorType ?: "") { type ->
                scope.launch { vm.saveBusiness(business.copy(contractorType = type.ifBlank { null })) }
            }
        }
        Spacer(Modifier.height(12.dp))
    }
    selected?.let { script ->
        AppCard {
            Text("Edit ${prettyLabel(script.kind)}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
            Text(script.contractorType?.let(::businessTypeLabel) ?: "Business Template", color = Slate, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(12.dp))
            PremiumTextField(label, { label = it }, "Label")
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                body,
                { body = it },
                label = { Text("Script body") },
                minLines = 5,
                shape = RoundedCornerShape(18.dp),
                colors = premiumFieldColors(),
                modifier = Modifier.fillMaxWidth()
            )
            if (vm.business?.schedulingEnabled == false) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Booking is disabled, so this script is kept in callback mode and will not offer booking links.",
                    color = Slate,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("Default template", color = Slate)
                Switch(checked = isDefault, onCheckedChange = { isDefault = it }, colors = appSwitchColors())
            }
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = { scope.launch { vm.saveScript(script, label, body, isDefault) } },
                enabled = label.isNotBlank() && body.isNotBlank(),
                shape = RoundedCornerShape(18.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Save script")
            }
        }
        Spacer(Modifier.height(12.dp))
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        visibleScripts.take(25).forEach { script ->
            AppCard(onClick = { vm.selectedScript = script }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(script.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("${prettyLabel(script.kind)} - ${script.contractorType?.let(::businessTypeLabel) ?: "Any Trade"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                    if (script.isDefault) StatusChip("default")
                }
                Spacer(Modifier.height(8.dp))
                Text(bookingAwarePrompt(script.body, vm.business), maxLines = 5, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun AgentScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val row = vm.selectedAssistant
    var name by remember(row?.id) { mutableStateOf(row?.assistantName ?: "") }
    var first by remember(row?.id) { mutableStateOf(row?.customFirstMessage ?: "") }
    var prompt by remember(row?.id, vm.business?.schedulingEnabled) { mutableStateOf(bookingAwarePrompt(row?.customPrompt ?: "", vm.business)) }
    var voiceId by remember(vm.business?.id, vm.business?.agentVoiceId) { mutableStateOf(vm.business?.agentVoiceId ?: VoiceOptions.first().id) }

    SectionHeader("AI agent", row?.phoneNumber ?: "Number setup")
    Spacer(Modifier.height(10.dp))
    if (row == null) {
        EmptyCard("No account assistant found", "Provision the account assistant from the web dashboard first, then edit it here.")
        return
    }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(44.dp)
                    .background(if (row.assistantId.isNullOrBlank()) SoftIndigo else SoftTeal, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    if (row.assistantId.isNullOrBlank()) "Assistant pending" else "Assistant connected",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Ink
                )
                Text(row.phoneNumber ?: "Voice number not assigned yet", color = Slate)
            }
        }
        Spacer(Modifier.height(14.dp))
        PremiumTextField(name, { name = it }, "Assistant name")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(first, { first = it }, "First message")
        Spacer(Modifier.height(10.dp))
        Text("Voice", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        VoicePicker(vm, voiceId) { voiceId = it }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            prompt,
            { prompt = it },
            label = { Text("System prompt") },
            minLines = 4,
            shape = RoundedCornerShape(18.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = PanelStroke,
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedLabelColor = MaterialTheme.colorScheme.primary,
                unfocusedLabelColor = Slate,
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (vm.business?.schedulingEnabled == false) {
            Spacer(Modifier.height(6.dp))
            Text(
                "Booking is disabled. The assistant will collect callback preferences instead of offering appointments.",
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
        }
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.saveAssistant(row, name, first, prompt)
                    vm.business?.let { vm.saveBusiness(it.copy(agentVoiceId = voiceId)) }
                }
            },
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save agent draft")
        }
    }
}

@Composable
fun MoreScreen(vm: CallRecoverViewModel) {
    var section by remember { mutableStateOf("setup") }
    SectionHeader("More", if (section == "alerts") "Alerts and notification settings" else "Setup and account controls")
    Spacer(Modifier.height(10.dp))
    AppCard {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            MoreChip("setup", section, "Setup", Icons.Default.Tune, Modifier.weight(1f)) { section = it }
            MoreChip("alerts", section, "Alerts", Icons.Default.Notifications, Modifier.weight(1f)) { section = it }
        }
    }
    Spacer(Modifier.height(12.dp))
    when (section) {
        "setup" -> SetupScreen(vm)
        "alerts" -> NotificationsScreen(vm)
    }
}

@Composable
fun SetupScreen(vm: CallRecoverViewModel) {
    var section by remember { mutableStateOf("readiness") }
    var showForwarding by remember { mutableStateOf(false) }
    var showTeamMember by remember { mutableStateOf(false) }
    AppCard {
        Text("Setup areas", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            MoreChip("readiness", section, "Readiness", Icons.Default.CheckCircle, Modifier.weight(1f)) { section = it }
            MoreChip("business", section, "Business", Icons.Default.Business, Modifier.weight(1f)) { section = it }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            MoreChip("agent", section, "Agent", Icons.Default.AutoAwesome, Modifier.weight(1f)) { section = it }
            MoreChip("scripts", section, "Scripts", Icons.Default.Description, Modifier.weight(1f)) { section = it }
        }
    }
    Spacer(Modifier.height(12.dp))
    when (section) {
        "readiness" -> {
            SetupChecklist(vm) { action ->
                when (action) {
                    SetupAction.Business -> section = "business"
                    SetupAction.Forwarding -> showForwarding = true
                    SetupAction.Agent -> section = "agent"
                    SetupAction.Scripts -> section = "scripts"
                    SetupAction.Team -> showTeamMember = true
                    SetupAction.Scheduling -> section = "business"
                    SetupAction.Alerts -> section = "business"
                }
            }
        }
        "agent" -> AgentScreen(vm)
        "scripts" -> ScriptsScreen(vm)
        "business" -> SettingsScreen(vm)
    }
    if (showForwarding) {
        ForwardingActionDialog(vm = vm, allowEditing = true, onDismiss = { showForwarding = false })
    }
    if (showTeamMember) {
        TeamMemberDialog(vm = vm, member = null, onDismiss = { showTeamMember = false })
    }
}

@Composable
fun MoreChip(
    id: String,
    selected: String,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier,
    onSelect: (String) -> Unit
) {
    FilterChip(
        selected = selected == id,
        onClick = { onSelect(id) },
        label = { Text(label) },
        leadingIcon = { Icon(icon, null, modifier = Modifier.size(16.dp)) },
        modifier = modifier
    )
}

@Composable
fun NotificationsScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val settingAlerts = vm.notifications.filterNot(::isLeadNotification)
    SectionHeader("Alerts", "${settingAlerts.count { !it.read }} unread")
    Spacer(Modifier.height(10.dp))
    NotificationPermissionCard(vm)
    Spacer(Modifier.height(12.dp))
    vm.business?.let {
        NotificationPreferenceCard(vm, it)
        Spacer(Modifier.height(12.dp))
    }
    if (settingAlerts.isEmpty()) {
        EmptyCard("No app alerts yet", "Lead alerts and missed-call details stay on the Leads tab.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        settingAlerts.forEach { note ->
            AppCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(42.dp)
                            .background(if (note.read) SoftSky else SoftIndigo, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(if (note.read) Icons.Default.Notifications else Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.primary)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(note.title, fontWeight = FontWeight.SemiBold, color = Ink)
                        note.body?.let { Text(it, maxLines = 2, overflow = TextOverflow.Ellipsis, color = Slate) }
                        note.createdAt?.let { Text(prettyDate(it), style = MaterialTheme.typography.bodySmall, color = Slate) }
                    }
                }
                if (!note.read) {
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = { scope.launch { vm.markNotificationRead(note.id) } }) {
                        Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Mark read")
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationPreferenceCard(vm: CallRecoverViewModel, business: BusinessProfile) {
    val scope = rememberCoroutineScope()
    var notifyEmailAddress by remember(business.id, business.notifyEmailAddress) { mutableStateOf(business.notifyEmailAddress ?: "") }
    AppCard {
        Text("Lead alerts and AI replies", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Text("Keep every lead notification and automatic reply setting in one place.", color = Slate)
        Spacer(Modifier.height(10.dp))
        SettingsToggle("SMS alerts", "Text your phone when a new lead lands.", business.notifySms) { enabled ->
            scope.launch { vm.saveBusiness(business.copy(notifySms = enabled)) }
        }
        SettingsToggle("Email alerts", "Send alerts or digests to the business inbox.", business.notifyEmail) { enabled ->
            scope.launch { vm.saveBusiness(business.copy(notifyEmail = enabled)) }
        }
        if (business.notifyEmail) {
            Spacer(Modifier.height(8.dp))
            PremiumTextField(notifyEmailAddress, { notifyEmailAddress = it }, "Notification email")
            Spacer(Modifier.height(8.dp))
            FilledTonalButton(
                onClick = { scope.launch { vm.saveBusiness(business.copy(notifyEmailAddress = notifyEmailAddress.ifBlank { null })) } },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Save email")
            }
        }
        SettingsToggle("Dashboard alerts", "Show realtime in-app notifications.", business.notifyDashboard) { enabled ->
            scope.launch { vm.saveBusiness(business.copy(notifyDashboard = enabled)) }
        }
        SettingsToggle("Automatic text response", "Send one approved next-step reply after SMS opt-in.", business.autoSendAiReplies) { enabled ->
            scope.launch {
                vm.saveBusiness(
                    business.copy(
                        autoSendAiReplies = enabled,
                        smsAutoResponseMode = if (enabled && business.smsAutoResponseMode == "off") "call" else if (enabled) business.smsAutoResponseMode else "off"
                    )
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        Text("Response direction", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        LabelValueDropdown(
            selected = business.smsAutoResponseMode,
            options = AutoResponseModeOptions,
            placeholder = "Response direction"
        ) { mode ->
            scope.launch {
                vm.saveBusiness(
                    business.copy(
                        autoSendAiReplies = mode != "off",
                        smsAutoResponseMode = mode
                    )
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Only replies after confirmed SMS opt-in. Use the Text button on leads for team-member replies.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
fun NotificationPermissionCard(vm: CallRecoverViewModel) {
    val context = LocalContext.current
    fun hasPermission(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }
    var granted by remember { mutableStateOf(hasPermission()) }

    fun syncToken() {
        vm.syncPushTokenFromFirebase()
    }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { approved ->
        granted = approved
        if (approved) syncToken()
    }

    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(46.dp)
                    .background(if (granted) SoftTeal else SoftIndigo, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Notifications, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Push alerts", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
                Text(
                    if (granted) "Notifications are on for this device." else "Enable notifications for new leads and SMS alerts.",
                    color = Slate
                )
            }
        }
        if (!granted) {
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    } else {
                        syncToken()
                    }
                },
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Notifications, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Enable push alerts")
            }
        }
    }
}

@Composable
fun BookingScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val business = vm.business
    var showAppointment by remember { mutableStateOf(false) }
    var showBlackout by remember { mutableStateOf(false) }
    var cancelTarget by remember { mutableStateOf<Appointment?>(null) }
    val upcoming = vm.appointments.filter { it.status != "cancelled" }.sortedBy { it.scheduledFor }
    val today = LocalDate.now(ZoneId.systemDefault())
    val todayCount = upcoming.count { appt ->
        runCatching { Instant.parse(appt.scheduledFor).atZone(ZoneId.systemDefault()).toLocalDate() == today }.getOrDefault(false)
    }

    SectionHeader("Appointments", "${upcoming.size} scheduled")
    Spacer(Modifier.height(10.dp))
    if (business == null) {
        EmptyCard("Booking data is loading", "Account data is syncing automatically.")
        return
    }
    BookingSummaryCard(
        upcomingCount = upcoming.size,
        todayCount = todayCount,
        bookedCount = vm.appointments.count { it.status.equals("booked", ignoreCase = true) },
        bookingEnabled = business.schedulingEnabled
    )
    Spacer(Modifier.height(12.dp))
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Scheduled appointments", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("Current bookings for recovered leads and manual follow-up.", color = Slate)
            }
            Button(onClick = { showAppointment = true }, shape = RoundedCornerShape(16.dp)) {
                Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Add")
            }
        }
        Spacer(Modifier.height(10.dp))
        if (upcoming.isEmpty()) {
            Text("No appointments scheduled yet.", color = Slate)
        } else {
            upcoming.take(12).forEachIndexed { index, appt ->
                AppointmentRow(appt, vm.teamMembers, onCancel = { cancelTarget = appt })
                if (index != upcoming.take(12).lastIndex) HorizontalDivider(color = PanelStroke)
            }
        }
    }
    Spacer(Modifier.height(12.dp))
    if (vm.canManageTenant) {
        AppCard {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    Text("Booking availability", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                    Text("Control whether CallRecover can set appointments.", color = Slate)
                }
                Switch(
                    checked = business.schedulingEnabled,
                    colors = appSwitchColors(),
                    onCheckedChange = { enabled ->
                        scope.launch { vm.saveBusiness(business.copy(schedulingEnabled = enabled)) }
                    }
                )
            }
            Spacer(Modifier.height(12.dp))
            Text("Booking link", fontWeight = FontWeight.SemiBold, color = Ink)
            Text(
                "Cal.com and Calendly links work now. Provider-native booking links are coming soon and will appear here once connected.",
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(Modifier.height(6.dp))
            Text(bookingLinkDisplay(business), color = Slate)
        }
        Spacer(Modifier.height(12.dp))
    }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Agent blackout dates", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("Block the whole business, one agent, or part of a specific day.", color = Slate)
            }
            FilledTonalButton(onClick = { showBlackout = true }, shape = RoundedCornerShape(16.dp)) {
                Icon(Icons.Default.EventBusy, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Add")
            }
        }
        Spacer(Modifier.height(10.dp))
        if (vm.blackouts.isEmpty()) {
            Text("No blackout dates yet.", color = Slate)
        } else {
            vm.blackouts.take(6).forEachIndexed { index, blackout ->
                BlackoutRow(blackout, vm.teamMembers, onRemove = { scope.launch { vm.deleteBlackout(blackout.id) } })
                if (index != vm.blackouts.take(6).lastIndex) HorizontalDivider(color = PanelStroke)
            }
        }
    }
    Spacer(Modifier.height(12.dp))
    if (vm.canManageTenant) HolidayClosuresSection(vm)

    if (showAppointment) {
        AppointmentDialog(vm = vm, onDismiss = { showAppointment = false })
    }
    if (showBlackout) {
        BlackoutDialog(vm = vm, onDismiss = { showBlackout = false })
    }
    cancelTarget?.let { appt ->
        ConfirmCancelAppointmentDialog(
            appointment = appt,
            team = vm.teamMembers,
            onDismiss = { cancelTarget = null },
            onConfirm = {
                scope.launch {
                    vm.cancelAppointment(appt.id)
                    cancelTarget = null
                }
            }
        )
    }
}

@Composable
fun HolidayClosuresSection(vm: CallRecoverViewModel) {
    var showDialog by remember { mutableStateOf(false) }
    val business = vm.business ?: return
    val active = business.observedHolidays

    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(46.dp)
                    .background(SoftIndigo, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.EventBusy, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Holiday closures", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text(
                    if (active.isEmpty()) "No holidays blocked" else "${active.size} holidays blocked",
                    color = Slate
                )
            }
            TextButton(onClick = { showDialog = true }) {
                Text("Manage")
            }
        }
        if (active.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            Text(
                active.take(3).joinToString(" · ") { it.name } + if (active.size > 3) " · +${active.size - 3} more" else "",
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }

    if (showDialog) {
        ActionDialog(
            title = "Holiday closures",
            subtitle = "Choose holidays that should block appointments.",
            onDismiss = { showDialog = false }
        ) {
            HolidayClosuresControls(vm)
        }
    }
}

@Composable
fun HolidayClosuresCard(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val business = vm.business ?: return
    val activeIds = business.observedHolidays.map { it.id }.toSet()
    val year = LocalDate.now().year

    fun save(next: List<HolidaySelection>) {
        scope.launch { vm.saveObservedHolidays(next.distinctBy { it.id }) }
    }

    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Holiday closures", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("Block appointments on selected holidays for this year and next.", color = Slate)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilledTonalButton(
                onClick = { save(US_HOLIDAY_PRESETS.map { HolidaySelection(it.id, it.name) }) },
                shape = RoundedCornerShape(16.dp)
            ) { Text("Turn All On") }
            TextButton(
                onClick = { save(emptyList()) },
                shape = RoundedCornerShape(16.dp)
            ) { Text("Turn All Off") }
        }
        Spacer(Modifier.height(8.dp))
        US_HOLIDAY_PRESETS.forEach { holiday ->
            val checked = holiday.id in activeIds
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 7.dp)
            ) {
                Column(Modifier.weight(1f)) {
                    Text(holiday.name, fontWeight = FontWeight.SemiBold, color = Ink)
                    Text(
                        "${holiday.dateFor(year).format(HolidayDateFormatter)} · ${if (checked) "Closed" else "Open"}",
                        color = Slate,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Switch(
                    checked = checked,
                    colors = appSwitchColors(),
                    onCheckedChange = { enabled ->
                        val next = if (enabled) {
                            business.observedHolidays + HolidaySelection(holiday.id, holiday.name)
                        } else {
                            business.observedHolidays.filterNot { it.id == holiday.id }
                        }
                        save(next)
                    }
                )
            }
            HorizontalDivider(color = PanelStroke.copy(alpha = 0.65f))
        }
    }
}

@Composable
fun HolidayClosuresControls(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val business = vm.business ?: return
    val activeIds = business.observedHolidays.map { it.id }.toSet()
    val year = LocalDate.now().year

    fun save(next: List<HolidaySelection>) {
        scope.launch { vm.saveObservedHolidays(next.distinctBy { it.id }) }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilledTonalButton(
            onClick = { save(US_HOLIDAY_PRESETS.map { HolidaySelection(it.id, it.name) }) },
            shape = RoundedCornerShape(16.dp)
        ) { Text("Turn All On") }
        TextButton(
            onClick = { save(emptyList()) },
            shape = RoundedCornerShape(16.dp)
        ) { Text("Turn All Off") }
    }
    Spacer(Modifier.height(8.dp))
    US_HOLIDAY_PRESETS.forEach { holiday ->
        val checked = holiday.id in activeIds
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 7.dp)
        ) {
            Column(Modifier.weight(1f)) {
                Text(holiday.name, fontWeight = FontWeight.SemiBold, color = Ink)
                Text(
                    "${holiday.dateFor(year).format(HolidayDateFormatter)} · ${if (checked) "Closed" else "Open"}",
                    color = Slate,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Switch(
                checked = checked,
                colors = appSwitchColors(),
                onCheckedChange = { enabled ->
                    val next = if (enabled) {
                        business.observedHolidays + HolidaySelection(holiday.id, holiday.name)
                    } else {
                        business.observedHolidays.filterNot { it.id == holiday.id }
                    }
                    save(next)
                }
            )
        }
        HorizontalDivider(color = PanelStroke.copy(alpha = 0.65f))
    }
}

@Composable
fun AppointmentDialog(vm: CallRecoverViewModel, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val assignableTeam = vm.assignableTeamMembers
    var selectedTeamId by remember { mutableStateOf<String?>(assignableTeam.firstOrNull { it.active }?.id ?: assignableTeam.firstOrNull()?.id) }
    var scheduledFor by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("60") }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var service by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    ActionDialog(
        title = "Add appointment",
        subtitle = "Create a booking for a recovered lead or walk-in customer.",
        onDismiss = onDismiss
    ) {
        TeamPicker(assignableTeam, selectedTeamId) { selectedTeamId = it }
        Spacer(Modifier.height(10.dp))
        DateTimePickerField(scheduledFor, { scheduledFor = it }, "Appointment time")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(customerName, { customerName = it }, "Customer name")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(customerPhone, { customerPhone = it }, "Customer phone")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(service, { service = it }, "Service")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(duration, { duration = it.filter(Char::isDigit) }, "Duration minutes")
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            notes,
            { notes = it },
            label = { Text("Notes") },
            minLines = 2,
            shape = RoundedCornerShape(18.dp),
            colors = premiumFieldColors(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.createAppointment(
                        selectedTeamId,
                        scheduledFor,
                        duration.toIntOrNull() ?: 60,
                        customerName,
                        customerPhone,
                        service,
                        notes
                    )
                    onDismiss()
                }
            },
            enabled = scheduledFor.isNotBlank(),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Schedule, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Set booking")
        }
    }
}

@Composable
fun BlackoutDialog(vm: CallRecoverViewModel, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val assignableTeam = vm.assignableTeamMembers
    var blackoutTeamId by remember { mutableStateOf<String?>(if (vm.isAgent) assignableTeam.firstOrNull()?.id else null) }
    var blackoutAllDay by remember { mutableStateOf(false) }
    var blackoutDate by remember { mutableStateOf("") }
    var blackoutStart by remember { mutableStateOf("") }
    var blackoutEnd by remember { mutableStateOf("") }
    var blackoutReason by remember { mutableStateOf("") }

    ActionDialog(
        title = "Agent blackout dates",
        subtitle = "Choose the whole business or one agent. Pick start and end times for a partial-day block.",
        onDismiss = onDismiss
    ) {
        TeamPicker(assignableTeam, blackoutTeamId, allowWholeBusiness = vm.canManageTenant) { blackoutTeamId = it }
        Spacer(Modifier.height(10.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(SoftSky)
                .padding(14.dp)
        ) {
            Column(Modifier.weight(1f)) {
                Text("Full day", fontWeight = FontWeight.SemiBold, color = Ink)
                Text("Turn off for a partial-day time block.", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = blackoutAllDay, onCheckedChange = { blackoutAllDay = it }, colors = appSwitchColors())
        }
        Spacer(Modifier.height(10.dp))
        if (blackoutAllDay) {
            DateOnlyPickerField(blackoutDate, { blackoutDate = it }, "Date")
        } else {
            DateTimePickerField(blackoutStart, { blackoutStart = it }, "Start")
            Spacer(Modifier.height(10.dp))
            DateTimePickerField(blackoutEnd, { blackoutEnd = it }, "End")
        }
        Spacer(Modifier.height(10.dp))
        Text("Use the same date with different start and end times to block only part of a day.", color = Slate, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(10.dp))
        PremiumTextField(blackoutReason, { blackoutReason = it }, "Reason")
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    val (startAt, endAt) = if (blackoutAllDay) {
                        dayBoundsIso(blackoutDate)
                    } else {
                        blackoutStart to blackoutEnd
                    }
                    vm.createBlackout(blackoutTeamId, startAt, endAt, blackoutReason)
                    onDismiss()
                }
            },
            enabled = if (blackoutAllDay) blackoutDate.isNotBlank() else blackoutStart.isNotBlank() && blackoutEnd.isNotBlank(),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.EventBusy, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Add blackout")
        }
    }
}

@Composable
fun BookingSummaryCard(upcomingCount: Int, todayCount: Int, bookedCount: Int, bookingEnabled: Boolean) {
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(if (bookingEnabled) "Booking is active" else "Booking is paused", fontWeight = FontWeight.Bold, color = Ink)
                Text("Use this tab to set and manage appointments.", color = Slate)
            }
            BookingStatusBadge(bookingEnabled)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            MetricTile("$upcomingCount", "upcoming", SoftIndigo, Modifier.weight(1f))
            MetricTile("$todayCount", "today", SoftTeal, Modifier.weight(1f))
            MetricTile("$bookedCount", "booked", SoftSky, Modifier.weight(1f))
        }
    }
}

@Composable
fun BookingStatusBadge(enabled: Boolean) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(if (enabled) SoftTeal else Color(0xFFF2EFE8))
            .padding(horizontal = 12.dp, vertical = 9.dp)
    ) {
        Box(
            Modifier
                .size(9.dp)
                .background(if (enabled) ActiveGreen else InactiveGray, CircleShape)
        )
        Spacer(Modifier.width(7.dp))
        Text(if (enabled) "Active" else "Paused", color = if (enabled) ActiveGreen else InactiveGray, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun SchedulingScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val business = vm.business
    var selectedTeamId by remember { mutableStateOf<String?>(vm.teamMembers.firstOrNull()?.id) }
    var scheduledFor by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("60") }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var service by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var blackoutTeamId by remember { mutableStateOf<String?>(null) }
    var blackoutStart by remember { mutableStateOf("") }
    var blackoutEnd by remember { mutableStateOf("") }
    var blackoutReason by remember { mutableStateOf("") }
    var cancelTarget by remember { mutableStateOf<Appointment?>(null) }

    SectionHeader("Bookings", if (business?.schedulingEnabled == true) "enabled" else "disabled")
    Spacer(Modifier.height(10.dp))
    if (business == null) {
        EmptyCard("Business not loaded", "Refresh the app to load scheduling settings.")
        return
    }
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("In-app scheduling", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
                Text("Let the team book appointments and block unavailable windows.", color = Slate)
            }
            Switch(
                checked = business.schedulingEnabled,
                colors = appSwitchColors(),
                onCheckedChange = { enabled ->
                    scope.launch { vm.saveBusiness(business.copy(schedulingEnabled = enabled)) }
                }
            )
        }
        Spacer(Modifier.height(12.dp))
        Text("Booking links", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Cal.com and Calendly links work now. Provider-native booking links are coming soon and will appear here once connected.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(6.dp))
        Text(bookingLinkDisplay(business), color = Slate)
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("New appointment", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(10.dp))
        TeamPicker(vm.teamMembers, selectedTeamId) { selectedTeamId = it }
        Spacer(Modifier.height(10.dp))
        DateTimePickerField(scheduledFor, { scheduledFor = it }, "Appointment time")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(customerName, { customerName = it }, "Customer name")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(customerPhone, { customerPhone = it }, "Customer phone")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(service, { service = it }, "Service")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(duration, { duration = it.filter(Char::isDigit) }, "Duration minutes")
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            notes,
            { notes = it },
            label = { Text("Notes") },
            minLines = 2,
            shape = RoundedCornerShape(18.dp),
            colors = premiumFieldColors(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.createAppointment(
                        selectedTeamId,
                        scheduledFor,
                        duration.toIntOrNull() ?: 60,
                        customerName,
                        customerPhone,
                        service,
                        notes
                    )
                    scheduledFor = ""
                    customerName = ""
                    customerPhone = ""
                    service = ""
                    notes = ""
                }
            },
            enabled = scheduledFor.isNotBlank(),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Schedule, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Book appointment")
        }
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Upcoming appointments", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(8.dp))
        if (vm.appointments.isEmpty()) {
            Text("No appointments yet.", color = Slate)
        } else {
            vm.appointments.take(8).forEach { appt ->
                AppointmentRow(appt, vm.teamMembers, onCancel = { cancelTarget = appt })
                HorizontalDivider(color = PanelStroke)
            }
        }
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Agent blackout dates", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Text("Block all booking or one team member for a full day or specific time window.", color = Slate)
        Spacer(Modifier.height(10.dp))
        TeamPicker(vm.teamMembers, blackoutTeamId, allowWholeBusiness = true) { blackoutTeamId = it }
        Spacer(Modifier.height(10.dp))
        DateTimePickerField(blackoutStart, { blackoutStart = it }, "Start")
        Spacer(Modifier.height(10.dp))
        DateTimePickerField(blackoutEnd, { blackoutEnd = it }, "End")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(blackoutReason, { blackoutReason = it }, "Reason")
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.createBlackout(blackoutTeamId, blackoutStart, blackoutEnd, blackoutReason)
                    blackoutStart = ""
                    blackoutEnd = ""
                    blackoutReason = ""
                }
            },
            enabled = blackoutStart.isNotBlank() && blackoutEnd.isNotBlank(),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.EventBusy, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Add blackout")
        }
        Spacer(Modifier.height(10.dp))
        vm.blackouts.take(8).forEach { blackout ->
            BlackoutRow(blackout, vm.teamMembers, onRemove = { scope.launch { vm.deleteBlackout(blackout.id) } })
            HorizontalDivider(color = PanelStroke)
        }
    }
    Spacer(Modifier.height(12.dp))
    HolidayClosuresSection(vm)
    cancelTarget?.let { appt ->
        ConfirmCancelAppointmentDialog(
            appointment = appt,
            team = vm.teamMembers,
            onDismiss = { cancelTarget = null },
            onConfirm = {
                scope.launch {
                    vm.cancelAppointment(appt.id)
                    cancelTarget = null
                }
            }
        )
    }
}

@Composable
fun TeamScreen(vm: CallRecoverViewModel) {
    var editing by remember { mutableStateOf<TeamMember?>(null) }
    var adding by remember { mutableStateOf(false) }
    val members = vm.teamMembers.sortedWith(compareByDescending<TeamMember> { it.active }.thenBy { it.name })
    val canEditTeam = vm.canManageTenant

    SectionHeader("Team routing", "${vm.teamMembers.count { it.active }} active")
    Spacer(Modifier.height(10.dp))
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Assigned members", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("People who receive recovered lead routing.", color = Slate)
            }
            if (canEditTeam) {
                Button(onClick = { adding = true }, shape = RoundedCornerShape(16.dp)) {
                    Icon(Icons.Default.Add, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Add")
                }
            } else {
                StatusChip("read only")
            }
        }
        Spacer(Modifier.height(10.dp))
        if (members.isEmpty()) {
            Text("No team members assigned yet.", color = Slate)
        } else {
            members.forEachIndexed { index, member ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .then(if (canEditTeam) Modifier.clickable { editing = member } else Modifier)
                        .padding(vertical = 10.dp)
                ) {
                    Box(
                        Modifier
                            .size(46.dp)
                            .background(if (member.active) ActiveSurface else InactiveSurface, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Group, null, tint = if (member.active) ActiveGreen else InactiveGray)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(member.name, fontWeight = FontWeight.SemiBold, color = Ink)
                        Text("${roleDisplay(member.role)} - ${member.phone ?: member.email ?: "no contact"}", color = Slate, style = MaterialTheme.typography.bodySmall)
                    }
                    StatusChip(if (member.active) "active" else "paused")
                }
                if (index != members.lastIndex) HorizontalDivider(color = PanelStroke)
            }
        }
    }

    if (canEditTeam && adding) {
        TeamMemberDialog(vm = vm, member = null, onDismiss = { adding = false })
    }
    if (canEditTeam) editing?.let { member ->
        TeamMemberDialog(vm = vm, member = member, onDismiss = { editing = null })
    }
}

@Composable
fun AgentSettingsScreen(vm: CallRecoverViewModel) {
    val member = vm.agentTeamMember
    val business = vm.business

    SectionHeader("Settings", "Team member access")
    Spacer(Modifier.height(10.dp))
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(46.dp)
                    .background(CompleteSurface, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Group, null, tint = CompleteInk)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Assigned team login", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text("Limited to assigned leads, scheduling, and read-only team details.", color = Slate)
            }
        }
        Spacer(Modifier.height(14.dp))
        DetailLine("Business", business?.businessName ?: "Loading")
        DetailLine("Role", "Team Member")
        DetailLine("Team profile", member?.name ?: "Not linked yet")
        DetailLine("Routing", member?.role?.let(::roleDisplay) ?: "Not assigned")
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Support", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Spacer(Modifier.height(8.dp))
        Text("support@callrecover.net", color = Slate)
        Text("(701) 203-1073", color = Slate)
    }
}

@Composable
fun DetailLine(label: String, value: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 5.dp)
    ) {
        Text(label, color = Slate, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.width(10.dp))
        Text(value, color = Ink, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
fun TeamMemberDialog(vm: CallRecoverViewModel, member: TeamMember?, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    var name by remember(member?.id) { mutableStateOf(member?.name ?: "") }
    var phone by remember(member?.id) { mutableStateOf(member?.phone ?: "") }
    var email by remember(member?.id) { mutableStateOf(member?.email ?: "") }
    var selectedRole by remember(member?.id) { mutableStateOf(normalizeRoutingRole(member?.role)) }
    var active by remember(member?.id) { mutableStateOf(member?.active ?: true) }

    ActionDialog(
        title = if (member == null) "Add team member" else "Edit team member",
        subtitle = "Assign who receives recovered lead routing.",
        onDismiss = onDismiss
    ) {
        PremiumTextField(name, { name = it }, "Name")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(phone, { phone = it }, "Phone")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(email, { email = it }, "Email")
        Spacer(Modifier.height(10.dp))
        TeamRolePicker(selectedRole) { selectedRole = it }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1f)) {
                Text("Receives leads", fontWeight = FontWeight.SemiBold, color = Ink)
                Text("Keep this member active for routing.", color = Slate, style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = active, onCheckedChange = { active = it }, colors = appSwitchColors())
        }
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                scope.launch {
                    vm.saveTeamMember(
                        TeamMember(
                            id = member?.id,
                            name = name,
                            phone = phone.ifBlank { null },
                            email = email.ifBlank { null },
                            role = selectedRole,
                            active = active
                        )
                    )
                    onDismiss()
                }
            },
            enabled = name.isNotBlank(),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Save team member")
        }
    }
}

@Composable
fun SettingsScreen(vm: CallRecoverViewModel) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val biz = vm.business
    if (biz == null) {
        EmptyCard("Business settings unavailable", "Refresh the app to load your business profile.")
        return
    }
    var businessName by remember(biz.id, biz.businessName) { mutableStateOf(biz.businessName) }
    var contractorType by remember(biz.id, biz.contractorType) { mutableStateOf(biz.contractorType ?: "") }
    var carrier by remember(biz.id, biz.carrier) { mutableStateOf(biz.carrier ?: "other") }
    var businessPhone by remember(biz.id, biz.businessPhone) { mutableStateOf(biz.businessPhone ?: "") }
    var ownerPhone by remember(biz.id, biz.ownerPhone) { mutableStateOf(biz.ownerPhone ?: "") }
    var avgJobValue by remember(biz.id, biz.avgJobValue) { mutableStateOf(biz.avgJobValue.toString()) }
    var website by remember(biz.id, biz.website) { mutableStateOf(biz.website ?: "") }
    var websiteBlurb by remember(biz.id, biz.websiteBlurb) { mutableStateOf(biz.websiteBlurb ?: "") }
    var address by remember(biz.id, biz.address) { mutableStateOf(biz.address ?: "") }
    var bookingUrl by remember(biz.id, biz.bookingUrl) { mutableStateOf(biz.bookingUrl ?: "") }
    var callbackFormUrl by remember(biz.id, biz.callbackFormUrl) { mutableStateOf(biz.callbackFormUrl ?: "") }
    var schedulingEnabled by remember(biz.id, biz.schedulingEnabled) { mutableStateOf(biz.schedulingEnabled) }
    var agentVoiceId by remember(biz.id, biz.agentVoiceId) { mutableStateOf(biz.agentVoiceId ?: VoiceOptions.first().id) }
    var scanningWebsite by remember { mutableStateOf(false) }

    SectionHeader("Settings", biz.businessName)
    Spacer(Modifier.height(10.dp))
    AppCard {
        Text("Business profile", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(12.dp))
        PremiumTextField(businessName, { businessName = it }, "Business name")
        Spacer(Modifier.height(10.dp))
        Text("Business type", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        BusinessTypePicker(contractorType) { contractorType = it }
        Spacer(Modifier.height(10.dp))
        PremiumTextField(businessPhone, { businessPhone = it }, "Business phone")
        Spacer(Modifier.height(10.dp))
        PremiumTextField(ownerPhone, { ownerPhone = it }, "Owner cell")
        Spacer(Modifier.height(10.dp))
        Text("Carrier", fontWeight = FontWeight.SemiBold, color = Ink)
        Text("Used to generate the correct missed-call forwarding code.", color = Slate, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(6.dp))
        CarrierPicker(carrier) { carrier = it }
        Spacer(Modifier.height(10.dp))
        PremiumTextField(avgJobValue, { avgJobValue = it.filter(Char::isDigit) }, "Average job value")
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Agent tag values", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(12.dp))
        PremiumTextField(website, { website = it }, "Website")
        Spacer(Modifier.height(10.dp))
        FilledTonalButton(
            onClick = {
                if (website.isBlank()) {
                    Toast.makeText(context, "Add a website first.", Toast.LENGTH_SHORT).show()
                    return@FilledTonalButton
                }
                scope.launch {
                    scanningWebsite = true
                    val result = vm.scanSetupWebsite(website)
                    scanningWebsite = false
                    if (result == null) {
                        Toast.makeText(context, "Website scan could not be completed.", Toast.LENGTH_SHORT).show()
                        return@launch
                    }
                    businessName = result.businessName ?: businessName
                    contractorType = result.contractorType ?: contractorType
                    businessPhone = result.businessPhone ?: businessPhone
                    address = result.address ?: address
                    website = result.website ?: website
                    websiteBlurb = result.websiteBlurb ?: websiteBlurb
                    bookingUrl = result.bookingUrl ?: bookingUrl
                    callbackFormUrl = result.callbackFormUrl ?: callbackFormUrl
                    Toast.makeText(context, "Website scan applied. Review and save.", Toast.LENGTH_SHORT).show()
                }
            },
            enabled = !scanningWebsite,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.AutoAwesome, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text(if (scanningWebsite) "Scanning website..." else "Scan website with AI")
        }
        Spacer(Modifier.height(10.dp))
        PremiumTextField(address, { address = it }, "Business address")
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            websiteBlurb,
            { websiteBlurb = it },
            label = { Text("Website summary") },
            minLines = 3,
            shape = RoundedCornerShape(18.dp),
            colors = premiumFieldColors(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        PremiumTextField(bookingUrl, { bookingUrl = it }, "Booking URL (optional)")
        Text(
            "Cal.com, Calendly, or any public booking page can be used now. Jobber and Housecall Pro booking-link setup is coming soon and can be enabled server-side.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(10.dp))
        PremiumTextField(callbackFormUrl, { callbackFormUrl = it }, "Callback form URL")
        Spacer(Modifier.height(6.dp))
        Text(
            "Optional public form link for customers who request a callback or choose to opt in to SMS follow-up. Leave it blank if you do not have a form yet.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            LockedSmsConsentText,
            {},
            label = { Text("Locked SMS consent text") },
            minLines = 4,
            readOnly = true,
            shape = RoundedCornerShape(18.dp),
            colors = premiumFieldColors(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "Managed by CallRecover to keep every account aligned with Twilio/TCR consent rules.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(10.dp))
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("AI voice and scheduling", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(10.dp))
        Text("Agent voice", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        VoicePicker(vm, agentVoiceId) { agentVoiceId = it }
        Spacer(Modifier.height(10.dp))
        SettingsToggle("In-app booking", "Allow recovered leads to be booked inside CallRecover.", schedulingEnabled) { schedulingEnabled = it }
    }
    Spacer(Modifier.height(12.dp))
    AppCard {
        Text("Privacy and account", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        Text(
            "Review privacy details or request account deletion from the account email.",
            color = Slate,
            style = MaterialTheme.typography.bodySmall
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://callrecover.net/privacy-policy")))
                },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Privacy policy", maxLines = 1)
            }
            OutlinedButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://callrecover.net/account-deletion")))
                },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Delete account", maxLines = 1)
            }
        }
        Spacer(Modifier.height(14.dp))
        Text("Support", fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        Text("Need help with your account or service?", color = Slate, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            OutlinedButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:support@callrecover.net")))
                },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Message, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Email", maxLines = 1)
            }
            OutlinedButton(
                onClick = {
                    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:7012031073")))
                },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Call, null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Call", maxLines = 1)
            }
        }
        Spacer(Modifier.height(8.dp))
        Text("support@callrecover.net · (701) 203-1073", color = Slate, style = MaterialTheme.typography.bodySmall)
    }
    Spacer(Modifier.height(12.dp))
    Button(
        onClick = {
            scope.launch {
                vm.saveBusiness(
                    biz.copy(
                        businessName = businessName,
                        contractorType = contractorType.ifBlank { null },
                        businessPhone = businessPhone.ifBlank { null },
                        ownerPhone = ownerPhone.ifBlank { null },
                        carrier = carrier,
                        avgJobValue = avgJobValue.toIntOrNull() ?: biz.avgJobValue,
                        website = website.ifBlank { null },
                        websiteBlurb = websiteBlurb.ifBlank { null },
                        address = address.ifBlank { null },
                        bookingUrl = bookingUrl.ifBlank { null },
                        callbackFormUrl = callbackFormUrl.ifBlank { null },
                        schedulingEnabled = schedulingEnabled,
                        schedulingProvider = "internal",
                        agentVoiceId = agentVoiceId
                    )
                )
            }
        },
        enabled = businessName.isNotBlank(),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(Icons.Default.Save, null, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text("Save settings")
    }
}

@Composable
fun DashboardHero(vm: CallRecoverViewModel, tab: Int) {
    val title = when (tab) {
        0 -> "Lead recovery"
        1 -> "Conversation desk"
        2 -> "Forwarding setup"
        3 -> "Agent studio"
        else -> "Control center"
    }
    val subtitle = when (tab) {
        0 -> "Missed calls, transcripts, and customer follow-up in one calm queue."
        1 -> "Review context and respond without leaving the app."
        2 -> "Start, track, and confirm phone forwarding from your handset."
        3 -> "Tune scripts, behavior prompts, and the assistant that answers for the business."
        else -> "Calendar, team routing, notifications, and business settings."
    }

    Card(
        shape = RoundedCornerShape(28.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 10.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .background(AccentGradient)
                .padding(20.dp)
        ) {
            Column {
                Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(6.dp))
                Text(subtitle, color = Color.White.copy(alpha = 0.84f))
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    MetricPill("${vm.calls.size}", "calls")
                    MetricPill("${vm.messages.size}", "texts")
                    MetricPill("${vm.assistants.size}", "agents")
                }
            }
        }
    }
}

@Composable
fun MetricPill(value: String, label: String) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White.copy(alpha = 0.18f))
            .padding(horizontal = 12.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(value, color = Color.White, fontWeight = FontWeight.Bold)
        Spacer(Modifier.width(5.dp))
        Text(label, color = Color.White.copy(alpha = 0.82f), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
fun MetricTile(value: String, label: String, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(color)
            .padding(14.dp)
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink, maxLines = 1)
        Text(label, style = MaterialTheme.typography.bodySmall, color = Slate, maxLines = 1)
    }
}

@Composable
fun BusinessTypePicker(selected: String, onSelected: (String) -> Unit) {
    LabelValueDropdown(
        selected = selected,
        options = listOf(LabelValue("", "Select Business Type")) + ContractorTypes,
        placeholder = "Select Business Type",
        onSelected = onSelected
    )
}

@Composable
fun CarrierPicker(selected: String, onSelected: (String) -> Unit) {
    LabelValueDropdown(
        selected = selected,
        options = CarrierOptions,
        placeholder = "Select Carrier",
        onSelected = onSelected
    )
}

@Composable
private fun LabelValueDropdown(
    selected: String,
    options: List<LabelValue>,
    placeholder: String,
    onSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.firstOrNull { it.value == selected }?.label ?: placeholder
    Box(Modifier.fillMaxWidth()) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color.White,
            border = BorderStroke(1.dp, PanelStroke),
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Text(
                    selectedLabel,
                    color = if (selected.isNotBlank() && options.any { it.value == selected }) Ink else Slate,
                    modifier = Modifier.weight(1f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Icon(Icons.Default.KeyboardArrowDown, null, tint = Slate)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.86f)
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    onClick = {
                        onSelected(option.value)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
fun VoicePicker(vm: CallRecoverViewModel, selectedId: String, onSelected: (String) -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var player by remember { mutableStateOf<MediaPlayer?>(null) }
    var playingVoiceId by remember { mutableStateOf<String?>(null) }
    var loadingVoiceId by remember { mutableStateOf<String?>(null) }
    var previewRequestId by remember { mutableStateOf(0) }

    fun stopVoicePreview() {
        previewRequestId += 1
        player?.let {
            runCatching { it.stop() }
            it.release()
        }
        player = null
        playingVoiceId = null
        loadingVoiceId = null
    }

    DisposableEffect(Unit) {
        onDispose {
            stopVoicePreview()
        }
    }

    val selectedVoice = VoiceOptions.firstOrNull { it.id == selectedId } ?: VoiceOptions.first()

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        VoiceDropdown(selectedVoice) { voiceId ->
            stopVoicePreview()
            onSelected(voiceId)
        }
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = SoftIndigo.copy(alpha = 0.62f),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(14.dp)
            ) {
                Column(Modifier.weight(1f)) {
                    Text(selectedVoice.description, color = Slate, style = MaterialTheme.typography.bodySmall)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Sample: ${selectedVoice.sample}",
                        color = Slate,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.width(10.dp))
                VoiceSampleButton(
                    enabled = loadingVoiceId == null || loadingVoiceId == selectedVoice.id || playingVoiceId == selectedVoice.id,
                    isLoading = loadingVoiceId == selectedVoice.id,
                    isPlaying = playingVoiceId == selectedVoice.id,
                    onToggle = {
                        if (playingVoiceId == selectedVoice.id || loadingVoiceId == selectedVoice.id) {
                            stopVoicePreview()
                        } else {
                            val requestId = previewRequestId + 1
                            previewRequestId = requestId
                            scope.launch {
                                loadingVoiceId = selectedVoice.id
                                try {
                                    player?.let {
                                        runCatching { it.stop() }
                                        it.release()
                                    }
                                    player = null
                                    playingVoiceId = null
                                    val audioBytes = vm.voicePreviewAudio(selectedVoice.id, selectedVoice.sample)
                                    if (previewRequestId != requestId) return@launch
                                    val file = File.createTempFile("callrecover-voice-${selectedVoice.id}", ".mp3", context.cacheDir)
                                    file.writeBytes(audioBytes)
                                    val nextPlayer = MediaPlayer().apply {
                                        setAudioAttributes(
                                            AudioAttributes.Builder()
                                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                                .build()
                                        )
                                        setDataSource(file.absolutePath)
                                        setOnCompletionListener { completed ->
                                            completed.release()
                                            if (previewRequestId != requestId) return@setOnCompletionListener
                                            if (player === completed) player = null
                                            if (playingVoiceId == selectedVoice.id) playingVoiceId = null
                                            file.delete()
                                        }
                                        setOnErrorListener { failed, _, _ ->
                                            failed.release()
                                            if (previewRequestId != requestId) return@setOnErrorListener true
                                            if (player === failed) player = null
                                            if (playingVoiceId == selectedVoice.id) playingVoiceId = null
                                            file.delete()
                                            true
                                        }
                                        prepare()
                                        start()
                                    }
                                    if (previewRequestId != requestId) {
                                        nextPlayer.release()
                                        file.delete()
                                        return@launch
                                    }
                                    player = nextPlayer
                                    playingVoiceId = selectedVoice.id
                                } catch (_: Exception) {
                                    // ViewModel already exposes the error for the screen.
                                } finally {
                                    if (previewRequestId == requestId && loadingVoiceId == selectedVoice.id) loadingVoiceId = null
                                }
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun VoiceDropdown(selectedVoice: VoiceOption, onSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth()) {
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = Color.White,
            border = BorderStroke(1.dp, PanelStroke),
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Column(Modifier.weight(1f)) {
                    Text(selectedVoice.label, color = Ink, fontWeight = FontWeight.SemiBold)
                    Text(selectedVoice.description, color = Slate, style = MaterialTheme.typography.bodySmall)
                }
                Icon(Icons.Default.KeyboardArrowDown, null, tint = Slate)
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth(0.86f)
        ) {
            VoiceOptions.forEach { voice ->
                DropdownMenuItem(
                    text = {
                        Column {
                            Text(voice.label, fontWeight = FontWeight.SemiBold)
                            Text(voice.description, color = Slate, style = MaterialTheme.typography.bodySmall)
                        }
                    },
                    onClick = {
                        onSelected(voice.id)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
fun VoiceSampleButton(enabled: Boolean, isLoading: Boolean, isPlaying: Boolean, onToggle: () -> Unit) {
    FilledTonalButton(
        onClick = onToggle,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
        colors = ButtonDefaults.filledTonalButtonColors(
            containerColor = if (isPlaying) SoftIndigo else Color(0xFFF5F1E8),
            contentColor = MaterialTheme.colorScheme.primary
        )
    ) {
        Icon(if (isPlaying || isLoading) Icons.Default.Stop else Icons.Default.PlayArrow, null, modifier = Modifier.size(15.dp))
        Spacer(Modifier.width(5.dp))
        Text(
            when {
                isLoading -> "Cancel"
                isPlaying -> "Stop"
                else -> "Play"
            },
            fontWeight = FontWeight.Bold,
            maxLines = 1
        )
    }
}

@Composable
fun TeamRolePicker(selectedRole: String, onSelected: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            FilterChip(
                selected = selectedRole == "all",
                onClick = { onSelected("all") },
                label = { Text("All") },
                modifier = Modifier.weight(1f)
            )
            FilterChip(
                selected = selectedRole == "office",
                onClick = { onSelected("office") },
                label = { Text("Office") },
                modifier = Modifier.weight(1f)
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            listOf("sales", "service").forEach { item ->
                FilterChip(
                    selected = selectedRole == item,
                    onClick = { onSelected(item) },
                    label = { Text(prettyLabel(item)) },
                    modifier = Modifier.weight(1f)
                )
            }
        }
        FilterChip(
            selected = selectedRole == "emergency",
            onClick = { onSelected("emergency") },
            label = { Text("Emergency") }
        )
    }
}

private fun businessTypeLabel(value: String): String {
    return ContractorTypes.firstOrNull { it.value == value }?.label ?: prettyLabel(value)
}

private fun carrierLabel(value: String?): String {
    return CarrierOptions.firstOrNull { it.value == value }?.label ?: "Other"
}

private fun digitsOnly(value: String): String = value.filter(Char::isDigit)

private fun forwardingDialCode(carrier: String?, forwardingNumber: String): String {
    val digits = digitsOnly(forwardingNumber)
    if (digits.isBlank()) return ""
    return when (carrier) {
        "verizon" -> "*71$digits"
        "att" -> {
            val target = if (digits.length == 10) "1$digits" else digits
            "*004*$target#"
        }
        "tmobile" -> "**61*$digits#"
        "comcast" -> "*72$digits"
        "ringcentral", "google_voice" -> digits
        else -> "*72$digits"
    }
}

private fun forwardingInstruction(carrier: String?): String {
    return when (carrier) {
        "verizon" -> "Verizon missed-call forwarding uses *71 plus the CallRecover number."
        "att" -> "AT&T uses *004* to forward busy, no-answer, and unreachable calls."
        "tmobile" -> "T-Mobile usually accepts the GSM **61* no-answer forwarding code."
        "comcast" -> "Comcast / Xfinity Voice commonly uses *72 plus the forwarding number."
        "ringcentral" -> "RingCentral forwarding is usually configured in the admin call-handling portal."
        "google_voice" -> "Google Voice forwarding is usually configured in Voice settings."
        else -> "Other carriers vary. If this code fails, ask the carrier for conditional missed-call forwarding."
    }
}

private fun scriptsForBusiness(scripts: List<ScriptTemplate>, business: BusinessProfile?): List<ScriptTemplate> {
    val currentType = business?.contractorType
    val currentBusinessId = business?.id
    val scoped = scripts.filter { script ->
        script.businessId.isNullOrBlank() || script.businessId == currentBusinessId
    }.ifEmpty { scripts }
    if (!currentType.isNullOrBlank()) {
        val exact = scoped.filter { it.contractorType == currentType }
        if (exact.isNotEmpty()) return exact
    }
    val universal = scoped.filter { it.contractorType.isNullOrBlank() }
    return universal.ifEmpty { scoped }
}

private fun pickScriptForBusiness(scripts: List<ScriptTemplate>, business: BusinessProfile?, preferredId: String?): ScriptTemplate? {
    val visible = scriptsForBusiness(scripts, business)
    return visible.firstOrNull { it.id == preferredId } ?:
        visible.firstOrNull { it.contractorType == business?.contractorType && it.isDefault } ?:
        visible.firstOrNull { it.contractorType == business?.contractorType } ?:
        visible.firstOrNull { it.isDefault } ?:
        visible.firstOrNull()
}

private fun openNativeSms(context: Context, phone: String?, body: String? = null) {
    if (phone.isNullOrBlank()) {
        Toast.makeText(context, "No caller number available", Toast.LENGTH_SHORT).show()
        return
    }
    val intent = Intent(Intent.ACTION_SENDTO).apply {
        data = Uri.parse("smsto:$phone")
        if (!body.isNullOrBlank()) putExtra("sms_body", body)
    }
    runCatching { context.startActivity(intent) }
        .onFailure { Toast.makeText(context, "No messaging app available", Toast.LENGTH_SHORT).show() }
}

private fun bookingAwarePrompt(text: String, business: BusinessProfile?): String {
    if (business?.schedulingEnabled != false || text.isBlank()) return text
    return text
        .replace(Regex("\\s*If the caller wants to book, collect their preferred callback time and say the team will follow up\\. Do not offer booking links or appointment scheduling\\.?\\s*", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("\\s*If they want to book, collect their preferred callback time and say the team will follow up\\. Do not offer booking links or appointment scheduling\\.?\\s*", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("I can help you book[^.?!]*or get a callback scheduled\\.", RegexOption.IGNORE_CASE), "I can take your details and get a callback scheduled.")
        .replace(Regex("I can help you book[^.?!]*\\.", RegexOption.IGNORE_CASE), "I can take your details and have the team call you back.")
        .replace(Regex("\\s*If they want to book, offer:\\s*\\{book_consult\\}\\.?\\s*", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("\\s*If they want to book[^.]*\\{book_consult\\}[^.]*\\.?\\s*", RegexOption.IGNORE_CASE), " ")
        .replace(Regex("\\s*Offer to book[^.]*\\.?\\s*", RegexOption.IGNORE_CASE), " ")
        .replace("{book_consult}", "a callback")
        .replace(Regex("\\s+"), " ")
        .trim()
}

private fun transcriptSegments(transcript: String): List<TranscriptSegment> {
    val marker = Regex("(?i)\\b(AI|Assistant|Agent|User|Caller):")
    val matches = marker.findAll(transcript).toList()
    if (matches.isEmpty()) {
        return listOf(TranscriptSegment("Transcript", transcript.trim(), isAgent = true)).filter { it.text.isNotBlank() }
    }
    return matches.mapIndexedNotNull { index, match ->
        val nextStart = matches.getOrNull(index + 1)?.range?.first ?: transcript.length
        val label = match.groupValues[1].lowercase()
        val text = transcript.substring(match.range.last + 1, nextStart).trim()
        if (text.isBlank()) return@mapIndexedNotNull null
        val isAgent = label in setOf("ai", "assistant", "agent")
        TranscriptSegment(if (isAgent) "AI assistant" else "Caller", text, isAgent)
    }
}

private fun displaySummary(call: CallRecord): String? {
    val summary = call.aiSummary?.trim().orEmpty()
    if (summary.isBlank()) return null
    val callerDigits = call.callerNumber?.filter(Char::isDigit).orEmpty()
    if (callerDigits.length < 7) return summary
    val localDigits = callerDigits.takeLast(10)
    val phoneLike = Regex("\\+?1?\\s*\\(?${Regex.escape(localDigits.take(3))}\\)?[-.\\s]*${Regex.escape(localDigits.substring(3, 6))}[-.\\s]*${Regex.escape(localDigits.substring(6))}")
    return summary
        .replace(phoneLike, "the callback number")
        .replace(Regex("\\s+"), " ")
        .trim()
}

private fun CallRecord.isArchivedLead(): Boolean {
    return archivedAt != null
}

private fun isLeadNotification(note: NotificationItem): Boolean {
    val haystack = listOf(note.kind, note.title, note.body ?: "").joinToString(" ").lowercase()
    return note.callId != null ||
        "missed call" in haystack ||
        "missed-call" in haystack ||
        "lead" in haystack ||
        "caller" in haystack
}

private fun prettyLabel(value: String?): String {
    if (value.isNullOrBlank()) return ""
    when (value.trim().lowercase()) {
        "active" -> return "Active"
        "requesting_call" -> return "Requesting Call"
        "in_progress" -> return "In Progress"
    }
    val acronyms = setOf("ai", "sms", "vapi", "url", "hvac")
    return value
        .replace("_", " ")
        .replace("-", " ")
        .trim()
        .split(Regex("\\s+"))
        .joinToString(" ") { word ->
            val normalized = word.lowercase()
            if (normalized in acronyms) {
                normalized.uppercase()
            } else {
                normalized.replaceFirstChar { char -> char.uppercaseChar() }
            }
        }
}

private fun parseRoles(value: String?): Set<String> {
    val roles = value
        ?.split(",", "/", "|")
        ?.map { it.trim().lowercase() }
        ?.filter { it in TeamRoles }
        ?.toSet()
        ?: emptySet()
    return roles.ifEmpty { setOf("office") }
}

private fun normalizeRoutingRole(value: String?): String {
    val roles = parseRoles(value)
    val assignableRoles = TeamRoles.filter { it != "all" }
    if ("all" in roles || assignableRoles.all { it in roles }) return "all"
    return assignableRoles.firstOrNull { it in roles } ?: "office"
}

private fun roleDisplay(value: String): String {
    return if (normalizeRoutingRole(value) == "all") "All" else prettyLabel(normalizeRoutingRole(value))
}

private const val LockedSmsConsentText =
    "By checking this box and submitting, I agree to receive transactional SMS messages from Classroom Panda LLC dba CallRecover related to my service request, appointment scheduling, and lead follow-up at the mobile number provided. Reply STOP to opt out, HELP for help. Message frequency varies. Msg & data rates may apply. Consent is not a condition of purchase. See https://callrecover.net/privacy-policy and https://callrecover.net/terms."

@Composable
fun TeamPicker(
    team: List<TeamMember>,
    selectedId: String?,
    allowWholeBusiness: Boolean = false,
    onSelected: (String?) -> Unit
) {
    if (team.isEmpty() && !allowWholeBusiness) {
        Text("Add a team member first.", color = Slate)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (allowWholeBusiness) {
            FilterChip(
                selected = selectedId == null,
                onClick = { onSelected(null) },
                label = { Text("Whole business") },
                leadingIcon = { Icon(Icons.Default.Business, null, modifier = Modifier.size(16.dp)) }
            )
        }
        team.take(6).forEach { member ->
            FilterChip(
                selected = selectedId == member.id,
                onClick = { onSelected(member.id) },
                label = { Text(member.name, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                leadingIcon = { Icon(Icons.Default.Group, null, modifier = Modifier.size(16.dp)) }
            )
        }
    }
}

@Composable
fun AppointmentRow(appt: Appointment, team: List<TeamMember>, onCancel: () -> Unit) {
    val agent = team.firstOrNull { it.id == appt.teamMemberId }?.name ?: "Unassigned"
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Column(Modifier.weight(1f)) {
            Text("${prettyDate(appt.scheduledFor)} - $agent", fontWeight = FontWeight.SemiBold, color = Ink)
            Text(
                listOfNotNull(appt.customerName, appt.customerPhone, appt.service, appt.status).joinToString(" - "),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
        }
        if (appt.status != "cancelled") {
            TextButton(onClick = onCancel) { Text("Cancel") }
        }
    }
}

@Composable
fun ConfirmCancelAppointmentDialog(
    appointment: Appointment,
    team: List<TeamMember>,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    val agent = team.firstOrNull { it.id == appointment.teamMemberId }?.name ?: "Unassigned"
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Cancel appointment?") },
        text = {
            Text(
                "${prettyDate(appointment.scheduledFor)} - $agent will be marked cancelled and removed from active booking views.",
                color = Slate
            )
        },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF111827), contentColor = Color.White)
            ) {
                Text("Yes, cancel")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Keep appointment") }
        }
    )
}

private fun blackoutScopeName(blackout: ScheduleBlackout, team: List<TeamMember>): String {
    if (blackout.teamMemberId == null) return "Whole business"
    return team.firstOrNull { it.id == blackout.teamMemberId }?.name ?: "Agent"
}

@Composable
fun BlackoutRow(blackout: ScheduleBlackout, team: List<TeamMember>, onRemove: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Column(Modifier.weight(1f)) {
            Text(
                "${blackoutScopeName(blackout, team)} - ${prettyDate(blackout.startAt)} to ${prettyDate(blackout.endAt)}",
                fontWeight = FontWeight.SemiBold,
                color = Ink
            )
            Text(
                blackout.reason ?: "Unavailable",
                color = Slate,
                style = MaterialTheme.typography.bodySmall
            )
        }
        TextButton(onClick = onRemove) { Text("Remove") }
    }
}

@Composable
fun SettingsToggle(label: String, hint: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, fontWeight = FontWeight.SemiBold, color = Ink)
            Text(hint, color = Slate, style = MaterialTheme.typography.bodySmall)
        }
        Switch(checked = checked, onCheckedChange = onChange, colors = appSwitchColors())
    }
}

@Composable
fun appSwitchColors() = SwitchDefaults.colors(
    checkedThumbColor = Color.White,
    checkedTrackColor = ActiveGreen,
    checkedBorderColor = ActiveGreen,
    uncheckedThumbColor = InactiveGray,
    uncheckedTrackColor = InactiveSurface,
    uncheckedBorderColor = Color(0xFFC9C4BA)
)

@Composable
fun DateTimePickerField(value: String, onValueChange: (String) -> Unit, label: String) {
    val context = LocalContext.current
    val current = parseLocalDateTime(value) ?: LocalDateTime.now().plusHours(1)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SoftSky)
            .padding(14.dp)
    ) {
        Text(label, color = Slate, style = MaterialTheme.typography.bodySmall)
        Text(if (value.isBlank()) "Not selected" else prettyDate(value), fontWeight = FontWeight.SemiBold, color = Ink)
        Spacer(Modifier.height(8.dp))
        FilledTonalButton(
            onClick = {
                DatePickerDialog(
                    context,
                    { _, year, month, day ->
                        TimePickerDialog(
                            context,
                            { _, hour, minute ->
                                val selected = LocalDateTime.of(year, month + 1, day, hour, minute)
                                onValueChange(selected.atZone(ZoneId.systemDefault()).toInstant().toString())
                            },
                            current.hour,
                            current.minute,
                            false
                        ).show()
                    },
                    current.year,
                    current.monthValue - 1,
                    current.dayOfMonth
                ).show()
            },
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.CalendarMonth, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Pick date and time")
        }
    }
}

@Composable
fun DateOnlyPickerField(value: String, onValueChange: (String) -> Unit, label: String) {
    val context = LocalContext.current
    val current = runCatching { LocalDate.parse(value) }.getOrNull() ?: LocalDate.now()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(SoftSky)
            .padding(14.dp)
    ) {
        Text(label, color = Slate, style = MaterialTheme.typography.bodySmall)
        Text(
            if (value.isBlank()) "Not selected" else runCatching { LocalDate.parse(value).format(HolidayDateFormatter) }.getOrDefault(value),
            fontWeight = FontWeight.SemiBold,
            color = Ink
        )
        Spacer(Modifier.height(8.dp))
        FilledTonalButton(
            onClick = {
                DatePickerDialog(
                    context,
                    { _, year, month, day -> onValueChange(LocalDate.of(year, month + 1, day).toString()) },
                    current.year,
                    current.monthValue - 1,
                    current.dayOfMonth
                ).show()
            },
            shape = RoundedCornerShape(16.dp)
        ) {
            Icon(Icons.Default.CalendarMonth, null, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Pick date")
        }
    }
}

private fun dayBoundsIso(date: String): Pair<String, String> {
    val day = LocalDate.parse(date)
    val start = day.atStartOfDay(ZoneId.systemDefault()).toInstant().toString()
    val end = day.plusDays(1).atStartOfDay(ZoneId.systemDefault()).minusNanos(1).toInstant().toString()
    return start to end
}

@Composable
fun premiumFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = PanelStroke,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White,
    focusedLabelColor = MaterialTheme.colorScheme.primary,
    unfocusedLabelColor = Slate,
)

private val DisplayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d, h:mm a")
private val ChartDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("M/d")
private val HolidayDateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d")

private fun CallRecord.isRecoveredLead(): Boolean {
    return leadStatus != null && !leadStatus.equals("open", ignoreCase = true)
}

private fun priorityLeadComparator(): Comparator<CallRecord> {
    return compareByDescending<CallRecord> { it.priorityRank() }
        .thenByDescending { if (it.callbackRequested) 1 else 0 }
        .thenByDescending { it.createdAt ?: "" }
}

private fun CallRecord.priorityRank(): Int {
    val value = listOfNotNull(priority, urgency, leadStatus, status)
        .joinToString(" ")
        .lowercase()
    return when {
        "emergency" in value -> 6
        "critical" in value -> 5
        "urgent" in value || "high" in value -> 4
        "callback" in value || "requesting_call" in value || "requesting call" in value || callbackRequested -> 3
        "medium" in value || "scheduled" in value || "in_progress" in value || "in progress" in value || "active" in value -> 2
        "low" in value -> 1
        else -> 0
    }
}

private fun recoveredRevenueBuckets(calls: List<CallRecord>, avgJobValue: Int): List<Pair<String, Int>> {
    val zone = ZoneId.systemDefault()
    val today = LocalDate.now(zone)
    val days = (5 downTo 0).map { today.minusDays(it.toLong()) }
    val recovered = calls.filter { it.isRecoveredLead() }
    val countsByDay = recovered
        .mapNotNull { call ->
            call.createdAt?.let { value ->
                runCatching { Instant.parse(value).atZone(zone).toLocalDate() }.getOrNull()
            }
        }
        .groupingBy { it }
        .eachCount()
    val points = days.map { day ->
        day.format(ChartDateFormatter) to ((countsByDay[day] ?: 0) * avgJobValue)
    }
    if (points.any { it.second > 0 } || recovered.isEmpty()) return points
    return points.dropLast(1) + ("Now" to (recovered.size * avgJobValue))
}

private fun parseLocalDateTime(value: String): LocalDateTime? {
    if (value.isBlank()) return null
    return runCatching { Instant.parse(value).atZone(ZoneId.systemDefault()).toLocalDateTime() }.getOrNull()
}

fun prettyDate(value: String): String {
    return runCatching {
        Instant.parse(value).atZone(ZoneId.systemDefault()).format(DisplayDateFormatter)
    }.getOrElse { value.take(19).replace("T", " ") }
}

@Composable
fun PremiumTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    isPassword: Boolean = false,
) {
    var passwordVisible by remember { mutableStateOf(false) }
    val visualTransformation = when {
        !isPassword -> VisualTransformation.None
        passwordVisible -> VisualTransformation.None
        else -> PasswordVisualTransformation()
    }

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        visualTransformation = visualTransformation,
        trailingIcon = if (isPassword) {
            {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password",
                        tint = Slate
                    )
                }
            }
        } else {
            null
        },
        shape = RoundedCornerShape(18.dp),
        colors = premiumFieldColors(),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
fun PremiumIconButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    IconButton(
        onClick = onClick,
        modifier = Modifier
            .padding(horizontal = 3.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.9f))
    ) {
        content()
    }
}

@Composable
fun AppIconMark(markSize: Dp = 34.dp, iconSize: Dp = 18.dp, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .size(markSize)
            .shadow(12.dp, RoundedCornerShape(13.dp), ambientColor = Color(0x332A2114), spotColor = Color(0x44D6A84F))
            .clip(RoundedCornerShape(13.dp)),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawRect(Color(0xFF2A2720))
            val goldSlice = Path().apply {
                moveTo(size.width, 0f)
                lineTo(size.width, size.height)
                lineTo(0f, size.height)
                close()
            }
            drawPath(goldSlice, Color(0xEBD6A84F))
        }
        Icon(Icons.Default.Call, null, tint = Color.White, modifier = Modifier.size(iconSize))
    }
}

@Composable
fun premiumNavColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = MaterialTheme.colorScheme.primary,
    selectedTextColor = MaterialTheme.colorScheme.primary,
    unselectedIconColor = Slate,
    unselectedTextColor = Slate,
    indicatorColor = SoftIndigo,
)

@Composable
fun SectionHeader(title: String, subtitle: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Ink)
            Text(subtitle, color = Slate)
        }
    }
}

@Composable
fun AppCard(onClick: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val shape = RoundedCornerShape(28.dp)
    val colors = CardDefaults.cardColors(containerColor = Panel)
    val elevation = CardDefaults.cardElevation(defaultElevation = 10.dp)
    val border = BorderStroke(1.dp, PanelStroke)
    if (onClick == null) {
        Card(shape = shape, colors = colors, elevation = elevation, border = border, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp), content = content)
        }
    } else {
        Card(onClick = onClick, shape = shape, colors = colors, elevation = elevation, border = border, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(20.dp), content = content)
        }
    }
}

@Composable
fun LoginCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        shape = RoundedCornerShape(30.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.97f)),
        elevation = CardDefaults.cardElevation(defaultElevation = 14.dp),
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.96f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(horizontal = 22.dp, vertical = 24.dp), content = content)
    }
}

@Composable
fun ActionDialog(
    title: String,
    subtitle: String? = null,
    onDismiss: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = Panel),
            elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
            border = BorderStroke(1.dp, PanelStroke),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .heightIn(max = 640.dp)
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Ink)
                subtitle?.let {
                    Spacer(Modifier.height(4.dp))
                    Text(it, color = Slate)
                }
                Spacer(Modifier.height(16.dp))
                content()
                Spacer(Modifier.height(6.dp))
                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) {
                    Text("Close")
                }
            }
        }
    }
}

@Composable
fun EmptyCard(title: String, body: String) {
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(48.dp)
                    .background(SoftSky, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
                Text(body, color = Slate)
            }
        }
    }
}

@Composable
fun ErrorCard(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Text(message, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(14.dp))
    }
}

@Composable
fun WarningCard(messages: List<String>) {
    Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF6DF)), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text("Refreshing account data", color = Color(0xFF9A3412), fontWeight = FontWeight.SemiBold)
            Text("A few sections are still loading. The app will keep retrying automatically.", color = Color(0xFF9A3412), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun StatusChip(text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(statusChipColor(text))
            .padding(horizontal = 12.dp, vertical = 7.dp)
    ) {
        Box(
            Modifier
                .size(7.dp)
                .background(statusDotColor(text), CircleShape)
        )
        Spacer(Modifier.width(6.dp))
        Text(
            prettyLabel(text),
            color = statusTextColor(text),
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 1
        )
    }
}

private fun statusChipColor(text: String): Color {
    val normalized = text.lowercase()
    return when {
        "closed" in normalized || "resolved" in normalized || "completed" in normalized -> CompleteSurface
        "requesting_call" in normalized || "requesting call" in normalized -> SoftIndigo
        "in_progress" in normalized || "in progress" in normalized -> SoftSky
        "on" in normalized || "active" in normalized || "ready" in normalized || "confirmed" in normalized || "contacted" in normalized -> ActiveSurface
        "urgent" in normalized || "emergency" in normalized || "high" in normalized -> PrioritySurface
        "paused" in normalized || "off" in normalized || "inactive" in normalized || "disabled" in normalized -> InactiveSurface
        else -> SoftIndigo
    }
}

private fun statusDotColor(text: String): Color {
    val normalized = text.lowercase()
    return when {
        "closed" in normalized || "resolved" in normalized || "completed" in normalized -> CompleteInk
        "requesting_call" in normalized || "requesting call" in normalized -> Color(0xFF6D28D9)
        "in_progress" in normalized || "in progress" in normalized -> Color(0xFF1D4ED8)
        "on" in normalized || "active" in normalized || "ready" in normalized || "confirmed" in normalized || "contacted" in normalized -> ActiveGreen
        "urgent" in normalized || "emergency" in normalized || "high" in normalized -> PriorityRed
        "paused" in normalized || "off" in normalized || "inactive" in normalized || "disabled" in normalized -> InactiveGray
        else -> Color(0xFFD6A84F)
    }
}

@Composable
private fun statusTextColor(text: String): Color {
    val normalized = text.lowercase()
    return when {
        "closed" in normalized || "resolved" in normalized || "completed" in normalized -> CompleteInk
        "requesting_call" in normalized || "requesting call" in normalized -> MaterialTheme.colorScheme.primary
        "in_progress" in normalized || "in progress" in normalized -> Color(0xFF1D4ED8)
        "on" in normalized || "active" in normalized || "ready" in normalized || "confirmed" in normalized || "contacted" in normalized -> ActiveGreen
        "urgent" in normalized || "emergency" in normalized || "high" in normalized -> PriorityRed
        "paused" in normalized || "off" in normalized || "inactive" in normalized || "disabled" in normalized -> InactiveGray
        else -> MaterialTheme.colorScheme.primary
    }
}

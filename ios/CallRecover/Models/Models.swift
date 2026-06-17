import Foundation

struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int?
    let user: SupabaseUser?
}

struct AuthErrorResponse: Codable {
    let msg: String?
    let message: String?
    let error: String?
    let errorDescription: String?
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?
}

struct CallRecord: Codable, Identifiable {
    let id: String
    let businessId: String?
    let callerNumber: String?
    let callerName: String?
    let status: String?
    let leadStatus: String?
    let urgency: String?
    let priority: String?
    let callbackRequested: Bool?
    let createdAt: String?
    let transcript: String?
    let aiSummary: String?
    let aiSummaryShort: String?
    let serviceNeeded: String?
    let recordingUrl: String?

    var displayName: String { callerName?.isEmpty == false ? callerName! : (callerNumber ?? "Unknown caller") }
    var summary: String { aiSummaryShort ?? aiSummary ?? transcript ?? "No summary yet." }
    var isRecoveredLead: Bool { ["recovered", "scheduled", "closed"].contains(leadStatus ?? "") || callbackRequested == true }
}

struct SmsThread: Codable {
    let id: String
    let callerNumber: String?
    let lastMessageAt: String?
}

struct SmsMessage: Codable, Identifiable {
    let id: String
    let threadId: String
    let direction: String
    let body: String
    let createdAt: String?
}

struct ForwardingStatus: Codable {
    var id: String?
    var status: String = "not_started"
    var carrier: String?
    var forwardingNumber: String?
    var dialCode: String?
}

struct ForwardingStatusResponse: Codable {
    let status: ForwardingStatus?
}

struct ScriptTemplate: Codable, Identifiable {
    let id: String
    let businessId: String?
    let kind: String
    var label: String
    var body: String
    var isDefault: Bool?
    let contractorType: String?
}

struct ScriptTemplateUpdateBody: Codable {
    let label: String?
    let body: String?
    let isDefault: Bool?
}

struct AssistantNumber: Codable, Identifiable {
    let id: String
    let businessId: String?
    let phoneNumberId: String?
    let phoneNumber: String?
    let assistantId: String?
    var assistantName: String?
    var customPrompt: String?
    var customFirstMessage: String?
}

struct AssistantUpdateBody: Codable {
    let assistantName: String?
    let customPrompt: String?
    let customFirstMessage: String?
}

struct BusinessProfile: Codable, Identifiable {
    let id: String
    var businessName: String? = nil
    var contractorType: String? = nil
    var businessPhone: String? = nil
    var ownerPhone: String? = nil
    var carrier: String? = nil
    var twilioNumber: String? = nil
    var avgJobValue: Int? = 500
    var onboardingComplete: Bool? = false
    var notifySms: Bool? = true
    var notifyEmail: Bool? = false
    var notifyDashboard: Bool? = true
    var notifyEmailAddress: String? = nil
    var autoSendAiReplies: Bool? = true
    var schedulingEnabled: Bool? = false
    var schedulingProvider: String? = "internal"
    var website: String? = nil
    var websiteBlurb: String? = nil
    var address: String? = nil
    var bookingUrl: String? = nil
    var callbackFormUrl: String? = nil
    var smsConsentText: String? = nil
    var defaultHelloScript: String? = nil
    var calUrl: String? = nil
    var calendlyUrl: String? = nil
    var agentVoiceId: String? = nil
    var agentPromptOverride: String? = nil
}

struct BusinessUpdateBody: Codable {
    var businessName: String?
    var contractorType: String?
    var businessPhone: String?
    var ownerPhone: String?
    var carrier: String?
    var avgJobValue: Int?
    var notifySms: Bool?
    var notifyEmail: Bool?
    var notifyDashboard: Bool?
    var notifyEmailAddress: String?
    var autoSendAiReplies: Bool?
    var schedulingEnabled: Bool?
    var schedulingProvider: String?
    var website: String?
    var websiteBlurb: String?
    var address: String?
    var bookingUrl: String?
    var callbackFormUrl: String?
    var smsConsentText: String?
    var defaultHelloScript: String?
    var calUrl: String?
    var calendlyUrl: String?
    var agentVoiceId: String?
    var agentPromptOverride: String?
}

struct TeamMember: Codable, Identifiable {
    var id: String?
    var businessId: String?
    var name: String
    var phone: String?
    var email: String?
    var role: String = "office"
    var active: Bool = true
    var color: String? = nil
    var createdAt: String? = nil
}

struct TeamMemberBody: Codable {
    let businessId: String
    let name: String
    let phone: String?
    let email: String?
    let role: String
    let active: Bool
}

struct Appointment: Codable, Identifiable {
    let id: String
    let businessId: String?
    let teamMemberId: String?
    let callId: String?
    let scheduledFor: String
    let durationMinutes: Int?
    let customerName: String?
    let customerPhone: String?
    let service: String?
    let notes: String?
    let source: String?
    let provider: String?
    let status: String?
}

struct AppointmentBody: Codable {
    let businessId: String
    let teamMemberId: String?
    let callId: String?
    let scheduledFor: String
    let durationMinutes: Int
    let customerName: String?
    let customerPhone: String?
    let service: String?
    let notes: String?
    let source: String
    let provider: String
    let status: String
}

struct AppointmentStatusBody: Codable {
    let status: String
}

struct NotificationItem: Codable, Identifiable {
    let id: String
    let callId: String?
    let kind: String?
    let title: String
    let body: String?
    let read: Bool?
    let createdAt: String?
}

struct NotificationReadBody: Codable {
    let read: Bool = true
}

struct SendSmsBody: Codable {
    let callId: String
    let body: String
}

struct RecordingRequest: Codable {
    let callId: String
}

struct RecordingResponse: Codable {
    let url: String?
}

struct VoicePreviewRequest: Codable {
    let voiceId: String
    let text: String
}

struct VoicePreviewResponse: Codable {
    let audioBase64: String
}

struct CallLeadStatusBody: Codable {
    let leadStatus: String
    let status: String?
    let callbackRequested: Bool?
}

struct PushTokenBody: Codable {
    let platform: String
    let token: String
    let deviceId: String?
}

struct LabelValue: Identifiable, Hashable {
    let value: String
    let label: String
    var id: String { value }
}

struct VoiceOption: Identifiable, Hashable {
    let id: String
    let label: String
    let description: String
    let sample: String
}

enum StaticOptions {
    static let contractorTypes = [
        LabelValue(value: "roofing", label: "Roofing"),
        LabelValue(value: "plumbing", label: "Plumbing"),
        LabelValue(value: "hvac", label: "HVAC"),
        LabelValue(value: "electrical", label: "Electrical"),
        LabelValue(value: "information_technology", label: "Information Technology (IT)"),
        LabelValue(value: "landscaping", label: "Landscaping"),
        LabelValue(value: "pest_control", label: "Pest Control"),
        LabelValue(value: "restoration", label: "Restoration"),
        LabelValue(value: "general_contractor", label: "General Contractor"),
        LabelValue(value: "painting", label: "Painting"),
        LabelValue(value: "concrete", label: "Concrete"),
        LabelValue(value: "pool_services", label: "Pool Services"),
        LabelValue(value: "pressure_washing", label: "Pressure Washing"),
        LabelValue(value: "tree_services", label: "Tree Services"),
        LabelValue(value: "flooring", label: "Flooring"),
        LabelValue(value: "handyman", label: "Handyman"),
        LabelValue(value: "solar", label: "Solar"),
        LabelValue(value: "fencing", label: "Fencing")
    ]

    static let carriers = [
        LabelValue(value: "verizon", label: "Verizon"),
        LabelValue(value: "att", label: "AT&T"),
        LabelValue(value: "tmobile", label: "T-Mobile"),
        LabelValue(value: "comcast", label: "Comcast / Xfinity"),
        LabelValue(value: "ringcentral", label: "RingCentral"),
        LabelValue(value: "google_voice", label: "Google Voice"),
        LabelValue(value: "other", label: "Other")
    ]

    static let voices = [
        VoiceOption(id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", description: "Warm, professional", sample: "Thanks for calling. I can take the details and make sure the team follows up."),
        VoiceOption(id: "pFZP5JQG7iQjIQuC4Bku", label: "Lily", description: "Bright, friendly", sample: "Hi there. I will grab a few quick details and get this moving for you."),
        VoiceOption(id: "nPczCjzI2devNBz1zQrb", label: "Brian", description: "Calm, confident", sample: "Thanks for calling. Tell me what happened and I will route this to the right person."),
        VoiceOption(id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam", description: "Direct, upbeat", sample: "Thanks for reaching out. I will keep this quick and get you pointed in the right direction.")
    ]

    static let teamRoles = ["office", "sales", "service", "emergency"]
}

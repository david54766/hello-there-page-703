import AVFoundation
import Foundation
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    @Published var isSignedIn: Bool
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var business: BusinessProfile?
    @Published var calls: [CallRecord] = []
    @Published var selectedCall: CallRecord?
    @Published var messages: [SmsMessage] = []
    @Published var forwarding: ForwardingStatus?
    @Published var scripts: [ScriptTemplate] = []
    @Published var assistants: [AssistantNumber] = []
    @Published var teamMembers: [TeamMember] = []
    @Published var appointments: [Appointment] = []
    @Published var notifications: [NotificationItem] = []

    private let api: CallRecoverAPI
    private let session: SessionStore
    private var audioPlayer: AVAudioPlayer?

    init(api: CallRecoverAPI, session: SessionStore) {
        self.api = api
        self.session = session
        self.isSignedIn = session.isSignedIn
    }

    var recoveredCount: Int {
        calls.filter(\.isRecoveredLead).count
    }

    var estimatedRecoveredValue: Int {
        recoveredCount * (business?.avgJobValue ?? 500)
    }

    var unreadCount: Int {
        notifications.filter { $0.read != true }.count
    }

    var openLeadCount: Int {
        calls.filter { $0.leadStatus == nil || $0.leadStatus == "open" }.count
    }

    func signIn(email: String, password: String) async {
        await runLoading {
            try await api.signIn(email: email, password: password)
            isSignedIn = true
            try await loadHomeData()
        }
    }

    func signOut() {
        api.signOut()
        isSignedIn = false
        business = nil
        calls = []
        selectedCall = nil
        messages = []
        forwarding = nil
        scripts = []
        assistants = []
        teamMembers = []
        appointments = []
        notifications = []
    }

    func loadHome() async {
        guard isSignedIn else { return }
        await runLoading {
            try await loadHomeData()
        }
    }

    func selectCall(_ call: CallRecord) async {
        selectedCall = call
        messages = []
        guard let caller = call.callerNumber else { return }
        await runLoading {
            messages = try await api.smsMessages(callerNumber: caller)
        }
    }

    func updateLeadStatus(_ call: CallRecord, leadStatus: String) async {
        await runLoading {
            try await api.updateCallLeadStatus(call, leadStatus: leadStatus)
            try await loadHomeData()
        }
    }

    func sendSMS(callId: String, body: String) async {
        await runLoading {
            try await api.sendSMS(callId: callId, body: body)
            if let call = selectedCall {
                await selectCall(call)
            }
        }
    }

    func saveBusiness(_ updated: BusinessProfile) async {
        await runLoading {
            try await api.updateBusiness(updated)
            business = try await api.businessProfile()
        }
    }

    func saveForwarding(_ updated: ForwardingStatus) async {
        await runLoading {
            try await api.updateForwardingStatus(updated)
            forwarding = try await api.forwardingStatus()
        }
    }

    func saveTeamMember(_ member: TeamMember) async {
        guard let businessId = business?.id else { return }
        await runLoading {
            try await api.upsertTeamMember(member, businessId: businessId)
            teamMembers = try await api.teamMembers()
        }
    }

    func createAppointment(_ appointment: AppointmentBody) async {
        await runLoading {
            try await api.createAppointment(appointment)
            appointments = try await api.appointments()
        }
    }

    func updateScript(_ script: ScriptTemplate, label: String, body: String, isDefault: Bool) async {
        await runLoading {
            try await api.updateScript(script, label: label, body: body, isDefault: isDefault)
            scripts = try await api.scriptTemplates()
        }
    }

    func updateAssistant(_ assistant: AssistantNumber, name: String, firstMessage: String, prompt: String) async {
        await runLoading {
            try await api.updateAssistant(assistant, name: name, firstMessage: firstMessage, prompt: prompt)
            assistants = try await api.assistantNumbers()
        }
    }

    func playVoicePreview(_ option: VoiceOption) async {
        await runLoading(showSpinner: false) {
            let data = try await api.voicePreview(voiceId: option.id, text: option.sample)
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
        }
    }

    private func loadHomeData() async throws {
        business = try await api.businessProfile()
        calls = try await api.recentCalls()
            .sorted { priorityRank($0) > priorityRank($1) }
        forwarding = try await api.forwardingStatus()
        scripts = try await api.scriptTemplates()
        assistants = try await api.assistantNumbers()
        teamMembers = try await api.teamMembers()
        appointments = try await api.appointments()
        notifications = try await api.notifications()
    }

    private func priorityRank(_ call: CallRecord) -> Int {
        switch (call.priority ?? call.urgency ?? "").lowercased() {
        case "emergency": return 4
        case "high": return 3
        case "medium": return 2
        case "low": return 1
        default: return call.callbackRequested == true ? 2 : 0
        }
    }

    private func runLoading(showSpinner: Bool = true, _ work: () async throws -> Void) async {
        errorMessage = nil
        if showSpinner {
            isLoading = true
        }
        defer {
            if showSpinner {
                isLoading = false
            }
        }
        do {
            try await work()
        } catch {
            errorMessage = error.localizedDescription
            if error.localizedDescription.localizedCaseInsensitiveContains("token") {
                signOut()
            }
        }
    }
}


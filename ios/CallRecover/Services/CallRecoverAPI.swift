import Foundation

enum CallRecoverAPIError: LocalizedError {
    case missingAccessToken
    case invalidResponse
    case message(String)

    var errorDescription: String? {
        switch self {
        case .missingAccessToken:
            return "Missing access token."
        case .invalidResponse:
            return "Invalid server response."
        case .message(let value):
            return value
        }
    }
}

final class CallRecoverAPI {
    private let session: SessionStore
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init(session: SessionStore) {
        self.session = session
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    func signIn(email: String, password: String) async throws {
        let url = try makeURL(
            base: AppConfig.supabaseURL,
            path: "/auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "password")]
        )
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(PasswordGrant(email: email, password: password))

        let data = try await checkedData(for: request)
        let auth = try decoder.decode(AuthResponse.self, from: data)
        session.accessToken = auth.accessToken
        session.refreshToken = auth.refreshToken
    }

    func recentCalls() async throws -> [CallRecord] {
        try await supabaseGet(
            "/rest/v1/calls",
            query: [
                .init(name: "select", value: "id,business_id,caller_number,caller_name,status,lead_status,urgency,priority,callback_requested,created_at,ai_summary,ai_summary_short,service_needed,transcript,recording_url"),
                .init(name: "order", value: "created_at.desc"),
                .init(name: "limit", value: "25")
            ]
        )
    }

    func businessProfile() async throws -> BusinessProfile? {
        let rows: [BusinessProfile] = try await supabaseGet(
            "/rest/v1/businesses",
            query: [
                .init(name: "select", value: "id,business_name,contractor_type,business_phone,owner_phone,carrier,twilio_number,avg_job_value,onboarding_complete,notify_sms,notify_email,notify_dashboard,notify_email_address,auto_send_ai_replies,scheduling_enabled,scheduling_provider,website,website_blurb,address,booking_url,callback_form_url,sms_consent_text,default_hello_script,cal_url,calendly_url,agent_voice_id,agent_prompt_override"),
                .init(name: "limit", value: "1")
            ]
        )
        return rows.first
    }

    func updateBusiness(_ business: BusinessProfile) async throws {
        let body = BusinessUpdateBody(
            businessName: business.businessName,
            contractorType: business.contractorType,
            businessPhone: business.businessPhone,
            ownerPhone: business.ownerPhone,
            carrier: business.carrier,
            avgJobValue: business.avgJobValue,
            notifySms: business.notifySms,
            notifyEmail: business.notifyEmail,
            notifyDashboard: business.notifyDashboard,
            notifyEmailAddress: business.notifyEmailAddress,
            autoSendAiReplies: business.autoSendAiReplies,
            schedulingEnabled: business.schedulingEnabled,
            schedulingProvider: business.schedulingProvider,
            website: business.website,
            websiteBlurb: business.websiteBlurb,
            address: business.address,
            bookingUrl: business.bookingUrl,
            callbackFormUrl: business.callbackFormUrl,
            smsConsentText: business.smsConsentText,
            defaultHelloScript: business.defaultHelloScript,
            calUrl: business.calUrl,
            calendlyUrl: business.calendlyUrl,
            agentVoiceId: business.agentVoiceId,
            agentPromptOverride: business.agentPromptOverride
        )
        try await supabasePatch("/rest/v1/businesses", body: body, query: [.init(name: "id", value: "eq.\(business.id)")])
    }

    func smsMessages(callerNumber: String) async throws -> [SmsMessage] {
        let threads: [SmsThread] = try await supabaseGet(
            "/rest/v1/sms_threads",
            query: [
                .init(name: "select", value: "id,caller_number,last_message_at"),
                .init(name: "caller_number", value: "eq.\(callerNumber)"),
                .init(name: "limit", value: "1")
            ]
        )
        guard let thread = threads.first else { return [] }
        return try await supabaseGet(
            "/rest/v1/sms_messages",
            query: [
                .init(name: "select", value: "id,thread_id,direction,body,created_at"),
                .init(name: "thread_id", value: "eq.\(thread.id)"),
                .init(name: "order", value: "created_at.asc")
            ]
        )
    }

    func scriptTemplates() async throws -> [ScriptTemplate] {
        try await supabaseGet(
            "/rest/v1/script_templates",
            query: [
                .init(name: "select", value: "id,business_id,kind,label,body,is_default,contractor_type"),
                .init(name: "order", value: "kind.asc,label.asc")
            ]
        )
    }

    func updateScript(_ script: ScriptTemplate, label: String, body: String, isDefault: Bool) async throws {
        try await supabasePatch(
            "/rest/v1/script_templates",
            body: ScriptTemplateUpdateBody(label: label, body: body, isDefault: isDefault),
            query: [.init(name: "id", value: "eq.\(script.id)")]
        )
    }

    func assistantNumbers() async throws -> [AssistantNumber] {
        try await supabaseGet(
            "/rest/v1/vapi_number_assistants",
            query: [
                .init(name: "select", value: "id,business_id,phone_number_id,phone_number,assistant_id,assistant_name,custom_prompt,custom_first_message"),
                .init(name: "order", value: "created_at.desc")
            ]
        )
    }

    func updateAssistant(_ row: AssistantNumber, name: String, firstMessage: String, prompt: String) async throws {
        try await supabasePatch(
            "/rest/v1/vapi_number_assistants",
            body: AssistantUpdateBody(
                assistantName: name.isEmpty ? nil : name,
                customPrompt: prompt.isEmpty ? nil : prompt,
                customFirstMessage: firstMessage.isEmpty ? nil : firstMessage
            ),
            query: [.init(name: "id", value: "eq.\(row.id)")]
        )
    }

    func teamMembers() async throws -> [TeamMember] {
        try await supabaseGet(
            "/rest/v1/team_members",
            query: [
                .init(name: "select", value: "id,business_id,name,phone,email,role,active,color,created_at"),
                .init(name: "order", value: "created_at.asc")
            ]
        )
    }

    func upsertTeamMember(_ member: TeamMember, businessId: String) async throws {
        let body = TeamMemberBody(
            businessId: businessId,
            name: member.name,
            phone: member.phone,
            email: member.email,
            role: member.role,
            active: member.active
        )

        if let id = member.id {
            try await supabasePatch("/rest/v1/team_members", body: body, query: [.init(name: "id", value: "eq.\(id)")])
        } else {
            try await supabasePost("/rest/v1/team_members", body: body)
        }
    }

    func appointments() async throws -> [Appointment] {
        try await supabaseGet(
            "/rest/v1/appointments",
            query: [
                .init(name: "select", value: "id,business_id,team_member_id,call_id,scheduled_for,duration_minutes,customer_name,customer_phone,service,notes,source,provider,status"),
                .init(name: "order", value: "scheduled_for.asc"),
                .init(name: "limit", value: "50")
            ]
        )
    }

    func createAppointment(_ appointment: AppointmentBody) async throws {
        try await supabasePost("/rest/v1/appointments", body: appointment)
    }

    func cancelAppointment(id: String) async throws {
        try await supabasePatch("/rest/v1/appointments", body: AppointmentStatusBody(status: "cancelled"), query: [.init(name: "id", value: "eq.\(id)")])
    }

    func notifications() async throws -> [NotificationItem] {
        try await supabaseGet(
            "/rest/v1/notifications",
            query: [
                .init(name: "select", value: "id,call_id,kind,title,body,read,created_at"),
                .init(name: "order", value: "created_at.desc"),
                .init(name: "limit", value: "30")
            ]
        )
    }

    func markNotificationRead(id: String) async throws {
        try await supabasePatch("/rest/v1/notifications", body: NotificationReadBody(), query: [.init(name: "id", value: "eq.\(id)")])
    }

    func updateCallLeadStatus(_ call: CallRecord, leadStatus: String) async throws {
        let status = leadStatus == "closed" ? "resolved" : nil
        let callbackRequested = leadStatus == "scheduled" ? true : nil
        try await supabasePatch(
            "/rest/v1/calls",
            body: CallLeadStatusBody(leadStatus: leadStatus, status: status, callbackRequested: callbackRequested),
            query: [.init(name: "id", value: "eq.\(call.id)")]
        )
    }

    func sendSMS(callId: String, body: String) async throws {
        try await mobilePost("/api/mobile/send-sms", body: SendSmsBody(callId: callId, body: body))
    }

    func recordingURL(callId: String) async throws -> RecordingResponse {
        try await mobilePost("/api/mobile/recording-url", body: RecordingRequest(callId: callId))
    }

    func forwardingStatus() async throws -> ForwardingStatus? {
        let response: ForwardingStatusResponse = try await mobileGet("/api/mobile/forwarding-status")
        return response.status
    }

    func updateForwardingStatus(_ status: ForwardingStatus) async throws {
        try await mobilePost("/api/mobile/forwarding-status", body: status)
    }

    func registerPushToken(token: String, deviceId: String?) async throws {
        try await mobilePost("/api/mobile/push-token", body: PushTokenBody(platform: "ios", token: token, deviceId: deviceId))
    }

    func voicePreview(voiceId: String, text: String) async throws -> Data {
        let response: VoicePreviewResponse = try await mobilePost(
            "/api/mobile/voice-preview",
            body: VoicePreviewRequest(voiceId: voiceId, text: text)
        )
        guard let data = Data(base64Encoded: response.audioBase64) else {
            throw CallRecoverAPIError.invalidResponse
        }
        return data
    }

    func signOut() {
        session.clear()
    }

    private func supabaseGet<T: Decodable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.supabaseURL, path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addSupabaseAuthHeaders(to: &request)
        let data = try await checkedData(for: request)
        return try decoder.decode(T.self, from: data)
    }

    private func supabasePost<T: Encodable>(_ path: String, body: T) async throws {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.supabaseURL, path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        addSupabaseAuthHeaders(to: &request)
        request.addValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        _ = try await checkedData(for: request)
    }

    private func supabasePatch<T: Encodable>(_ path: String, body: T, query: [URLQueryItem]) async throws {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.supabaseURL, path: path, query: query)
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        addSupabaseAuthHeaders(to: &request)
        request.addValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        _ = try await checkedData(for: request)
    }

    private func mobileGet<T: Decodable>(_ path: String) async throws -> T {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.apiBaseURL, path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        addBearerHeader(to: &request)
        let data = try await checkedData(for: request)
        return try decoder.decode(T.self, from: data)
    }

    private func mobilePost<T: Encodable>(_ path: String, body: T) async throws {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.apiBaseURL, path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        addBearerHeader(to: &request)
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        _ = try await checkedData(for: request)
    }

    private func mobilePost<T: Encodable, R: Decodable>(_ path: String, body: T) async throws -> R {
        try await ensureFreshSession()
        let url = try makeURL(base: AppConfig.apiBaseURL, path: path)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        addBearerHeader(to: &request)
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        let data = try await checkedData(for: request)
        return try decoder.decode(R.self, from: data)
    }

    private func checkedData(for request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw CallRecoverAPIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = decodeErrorMessage(from: data)
            throw CallRecoverAPIError.message(message.isEmpty ? "Request failed: \(http.statusCode)" : message)
        }
        return data.isEmpty ? Data("{}".utf8) : data
    }

    private func decodeErrorMessage(from data: Data) -> String {
        guard !data.isEmpty else { return "" }
        if let authError = try? decoder.decode(AuthErrorResponse.self, from: data) {
            return authError.msg ?? authError.message ?? authError.errorDescription ?? authError.error ?? ""
        }
        return String(data: data, encoding: .utf8) ?? ""
    }

    private func ensureFreshSession() async throws {
        guard let token = session.accessToken else {
            throw CallRecoverAPIError.missingAccessToken
        }
        guard isJWTExpiring(token) else { return }
        guard let refreshToken = session.refreshToken else {
            throw CallRecoverAPIError.missingAccessToken
        }

        let url = try makeURL(
            base: AppConfig.supabaseURL,
            path: "/auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "refresh_token")]
        )
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(RefreshGrant(refreshToken: refreshToken))

        do {
            let data = try await checkedData(for: request)
            let auth = try decoder.decode(AuthResponse.self, from: data)
            session.accessToken = auth.accessToken
            session.refreshToken = auth.refreshToken ?? refreshToken
        } catch {
            session.clear()
            throw error
        }
    }

    private func isJWTExpiring(_ token: String) -> Bool {
        let parts = token.split(separator: ".")
        guard parts.count > 1 else { return true }
        var payload = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while payload.count % 4 != 0 {
            payload.append("=")
        }
        guard let data = Data(base64Encoded: payload),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = object["exp"] as? TimeInterval else {
            return true
        }
        return exp <= Date().addingTimeInterval(60).timeIntervalSince1970
    }

    private func addSupabaseAuthHeaders(to request: inout URLRequest) {
        request.addValue(AppConfig.supabaseAnonKey, forHTTPHeaderField: "apikey")
        addBearerHeader(to: &request)
    }

    private func addBearerHeader(to request: inout URLRequest) {
        if let token = session.accessToken {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }

    private func makeURL(base: URL, path: String, query: [URLQueryItem] = []) throws -> URL {
        let baseString = base.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let pathString = path.hasPrefix("/") ? path : "/\(path)"
        var components = URLComponents(string: "\(baseString)\(pathString)")
        if !query.isEmpty {
            components?.queryItems = query
        }
        guard let url = components?.url else {
            throw CallRecoverAPIError.invalidResponse
        }
        return url
    }
}

private struct PasswordGrant: Codable {
    let email: String
    let password: String
}

private struct RefreshGrant: Codable {
    let refreshToken: String
}

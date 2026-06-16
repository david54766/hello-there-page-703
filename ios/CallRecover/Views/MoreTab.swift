import SwiftUI

struct MoreTab: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var sheet: MoreSheet?

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SectionTitle("More", subtitle: "Setup, alerts, and account")

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    MoreAction(title: "Readiness", icon: "checkmark.circle.fill") { sheet = .readiness }
                    MoreAction(title: "Alerts", icon: "bell.fill") { sheet = .alerts }
                    MoreAction(title: "Business", icon: "building.2.fill") { sheet = .business }
                    MoreAction(title: "Agent", icon: "sparkles") { sheet = .agent }
                    MoreAction(title: "Scripts", icon: "doc.text.fill") { sheet = .scripts }
                    MoreAction(title: "Account", icon: "person.crop.circle.fill") { sheet = .account }
                }
                .padding(.horizontal, 20)

                ReadinessCard()
                    .padding(.horizontal, 20)

                GlassCard {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Notifications and AI")
                            .font(.title2.weight(.bold))
                        Toggle("SMS Alerts", isOn: businessBinding(\.notifySms, defaultValue: true))
                            .tint(CRTheme.violet)
                        Toggle("Email Alerts", isOn: businessBinding(\.notifyEmail, defaultValue: false))
                            .tint(CRTheme.violet)
                        Toggle("Dashboard Alerts", isOn: businessBinding(\.notifyDashboard, defaultValue: true))
                            .tint(CRTheme.violet)
                        Toggle("AI Text Replies", isOn: businessBinding(\.autoSendAiReplies, defaultValue: true))
                            .tint(CRTheme.violet)
                    }
                }
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 24)
        }
        .sheet(item: $sheet) { item in
            switch item {
            case .readiness:
                ReadinessSheet()
            case .alerts:
                AlertsSheet()
            case .business:
                BusinessSheet()
            case .agent:
                AgentSheet()
            case .scripts:
                ScriptsSheet()
            case .account:
                AccountSheet()
            }
        }
    }

    private func businessBinding(_ path: WritableKeyPath<BusinessProfile, Bool?>, defaultValue: Bool) -> Binding<Bool> {
        Binding(
            get: { vm.business?[keyPath: path] ?? defaultValue },
            set: { newValue in
                guard var business = vm.business else { return }
                business[keyPath: path] = newValue
                Task { await vm.saveBusiness(business) }
            }
        )
    }
}

enum MoreSheet: Identifiable {
    case readiness
    case alerts
    case business
    case agent
    case scripts
    case account

    var id: String { String(describing: self) }
}

struct MoreAction: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(CRTheme.violet)
                Text(title)
                    .font(.headline)
                    .foregroundStyle(CRTheme.ink)
                Spacer()
            }
            .padding(16)
            .background(Color.white.opacity(0.85), in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(CRTheme.panelStroke))
        }
    }
}

struct ReadinessCard: View {
    @EnvironmentObject private var vm: AppViewModel

    private var items: [(String, Bool)] {
        [
            ("Forwarding Active", ["user_confirmed", "test_detected"].contains(vm.forwarding?.status ?? "")),
            ("Business Profile", vm.business?.businessName?.isEmpty == false),
            ("AI Agent Connected", !vm.assistants.isEmpty),
            ("Script Library", !vm.scripts.isEmpty),
            ("Team Routing", !vm.teamMembers.isEmpty),
            ("Scheduling", vm.business?.schedulingEnabled == true),
            ("Alerts Configured", vm.business?.notifySms == true || vm.business?.notifyEmail == true || vm.business?.notifyDashboard == true)
        ]
    }

    var body: some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Setup readiness")
                        .font(.title2.weight(.bold))
                    Text("\(items.filter { $0.1 }.count) of \(items.count) essentials ready")
                        .foregroundStyle(CRTheme.slate)
                }
                Spacer()
                Text(items.allSatisfy { $0.1 } ? "Ready" : "In Progress")
                    .font(.headline)
                    .foregroundStyle(CRTheme.violet)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(CRTheme.softViolet, in: Capsule())
            }

            VStack(spacing: 14) {
                ForEach(items, id: \.0) { label, done in
                    HStack {
                        Image(systemName: done ? "checkmark.circle.fill" : "circle.fill")
                            .foregroundStyle(done ? CRTheme.teal : Color.gray.opacity(0.35))
                        Text(label)
                            .font(.headline)
                            .foregroundStyle(done ? CRTheme.ink : CRTheme.slate)
                        Spacer()
                        Text(done ? "Edit" : "Fix")
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(CRTheme.violet)
                    }
                }
            }
            .padding(.top, 16)
        }
    }
}

struct ReadinessSheet: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                ReadinessCard()
                    .padding(20)
            }
            .navigationTitle("Readiness")
        }
    }
}

struct AlertsSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if vm.notifications.isEmpty {
                        EmptyState(title: "No alerts yet", message: "New lead, SMS, emergency, and dashboard notifications will show here.")
                    } else {
                        ForEach(vm.notifications) { item in
                            GlassCard {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(item.title)
                                        .font(.headline)
                                    Text(item.body ?? "")
                                        .foregroundStyle(CRTheme.slate)
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
            .navigationTitle("Alerts")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }
}

struct BusinessSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var business = BusinessProfile(id: "")
    @State private var contractorType = "roofing"
    @State private var carrier = "verizon"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Business")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    TextInput(placeholder: "Business name", text: binding(\.businessName))
                    TextInput(placeholder: "Business phone", text: binding(\.businessPhone), keyboard: .phonePad)
                    TextInput(placeholder: "Owner phone", text: binding(\.ownerPhone), keyboard: .phonePad)
                    OptionMenu(title: "Business type", options: StaticOptions.contractorTypes, value: $contractorType)
                    OptionMenu(title: "Carrier", options: StaticOptions.carriers, value: $carrier)
                    TextInput(placeholder: "Website", text: binding(\.website), keyboard: .URL)
                    TextInput(placeholder: "Average job value", text: avgValueBinding, keyboard: .numberPad)

                    PrimaryButton(title: "Save business", systemImage: "checkmark.circle.fill") {
                        business.contractorType = contractorType
                        business.carrier = carrier
                        Task {
                            await vm.saveBusiness(business)
                            dismiss()
                        }
                    }
                }
                .padding(20)
            }
            .onAppear {
                business = vm.business ?? BusinessProfile(id: "")
                contractorType = business.contractorType ?? "roofing"
                carrier = business.carrier ?? "verizon"
            }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }

    private func binding(_ path: WritableKeyPath<BusinessProfile, String?>) -> Binding<String> {
        Binding(
            get: { business[keyPath: path] ?? "" },
            set: { business[keyPath: path] = $0 }
        )
    }

    private var avgValueBinding: Binding<String> {
        Binding(
            get: { String(business.avgJobValue ?? 500) },
            set: { business.avgJobValue = Int($0) ?? 500 }
        )
    }
}

struct AgentSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var voiceId = StaticOptions.voices.first?.id ?? ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("AI agent")
                        .font(.system(size: 34, weight: .bold, design: .rounded))

                    if let assistant = vm.assistants.first {
                        GlassCard {
                            Text(assistant.assistantName ?? "Assistant ready")
                                .font(.title2.weight(.bold))
                            Text(assistant.phoneNumber ?? "")
                                .foregroundStyle(CRTheme.slate)
                        }
                    }

                    Text("Voice")
                        .font(.title2.weight(.bold))
                    ForEach(StaticOptions.voices) { option in
                        Button {
                            voiceId = option.id
                            Task { await vm.playVoicePreview(option) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(option.label)
                                        .font(.headline)
                                    Text(option.description)
                                        .foregroundStyle(CRTheme.slate)
                                    Text("Sample: \(option.sample)")
                                        .font(.caption)
                                        .foregroundStyle(CRTheme.slate)
                                        .lineLimit(2)
                                }
                                Spacer()
                                Image(systemName: voiceId == option.id ? "checkmark.circle.fill" : "play.fill")
                                    .foregroundStyle(CRTheme.violet)
                            }
                            .padding(16)
                            .background(voiceId == option.id ? CRTheme.softViolet : Color.white, in: RoundedRectangle(cornerRadius: 20))
                            .overlay(RoundedRectangle(cornerRadius: 20).stroke(CRTheme.panelStroke))
                        }
                        .buttonStyle(.plain)
                    }

                    PrimaryButton(title: "Save voice", systemImage: "checkmark.circle.fill") {
                        guard var business = vm.business else { return }
                        business.agentVoiceId = voiceId
                        Task {
                            await vm.saveBusiness(business)
                            dismiss()
                        }
                    }
                }
                .padding(20)
            }
            .onAppear {
                voiceId = vm.business?.agentVoiceId ?? StaticOptions.voices.first?.id ?? ""
            }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }
}

struct ScriptsSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedType = "roofing"

    private var filtered: [ScriptTemplate] {
        let typed = vm.scripts.filter { $0.contractorType == selectedType }
        return typed.isEmpty ? vm.scripts : typed
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Scripts")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    OptionMenu(title: "Business type", options: StaticOptions.contractorTypes, value: $selectedType)

                    ForEach(filtered) { script in
                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text(script.label)
                                        .font(.headline)
                                    Spacer()
                                    Text(script.kind.titleCasedWords)
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(CRTheme.violet)
                                }
                                Text(script.body)
                                    .foregroundStyle(CRTheme.slate)
                                    .lineLimit(8)
                            }
                        }
                    }
                }
                .padding(20)
            }
            .onAppear {
                selectedType = vm.business?.contractorType ?? "roofing"
            }
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }
}

struct AccountSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 18) {
                GlassCard {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("CallRecover AI")
                            .font(.title2.weight(.bold))
                        Text("Native iPhone workspace for missed-call recovery.")
                            .foregroundStyle(CRTheme.slate)
                    }
                }

                PrimaryButton(title: "Sign out", systemImage: "rectangle.portrait.and.arrow.right") {
                    vm.signOut()
                    dismiss()
                }
                Spacer()
            }
            .padding(20)
            .navigationTitle("Account")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Close") { dismiss() } } }
        }
    }
}

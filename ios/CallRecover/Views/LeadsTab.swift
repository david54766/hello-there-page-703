import SwiftUI

struct LeadsTab: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var draftSMS = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    SectionTitle("Leads", subtitle: "\(vm.calls.count) recent")

                    if vm.calls.isEmpty {
                        EmptyState(
                            title: "No calls yet",
                            message: "New missed calls will appear here with transcript, recording, and SMS follow-up."
                        )
                        .padding(.horizontal, 20)
                    } else {
                        ForEach(vm.calls) { call in
                            Button {
                                Task { await vm.selectCall(call) }
                            } label: {
                                LeadRow(call: call)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 20)
                        }
                    }
                }
                .padding(.bottom, 24)
            }
        }
        .sheet(item: $vm.selectedCall) { call in
            LeadDetailSheet(call: call, draftSMS: $draftSMS)
                .presentationDetents([.large])
        }
    }
}

struct LeadRow: View {
    let call: CallRecord

    var body: some View {
        GlassCard {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(priorityColor.opacity(0.16))
                    Image(systemName: "phone.bubble.left.fill")
                        .foregroundStyle(priorityColor)
                        .font(.title2)
                }
                .frame(width: 58, height: 58)

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(call.displayName)
                            .font(.headline)
                            .foregroundStyle(CRTheme.ink)
                            .lineLimit(1)
                        Spacer()
                        Text((call.priority ?? call.urgency ?? "normal").titleCasedWords)
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(priorityColor.opacity(0.14), in: Capsule())
                            .foregroundStyle(priorityColor)
                    }

                    Text(call.summary)
                        .font(.subheadline)
                        .foregroundStyle(CRTheme.slate)
                        .lineLimit(3)

                    if let service = call.serviceNeeded, !service.isEmpty {
                        Text(service.titleCasedWords)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(CRTheme.violet)
                    }
                }
            }
        }
    }

    private var priorityColor: Color {
        switch (call.priority ?? call.urgency ?? "").lowercased() {
        case "emergency": return .red
        case "high": return .orange
        case "medium": return CRTheme.violet
        default: return CRTheme.teal
        }
    }
}

struct LeadDetailSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    let call: CallRecord
    @Binding var draftSMS: String

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(call.displayName)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    Text(call.callerNumber ?? "")
                        .font(.title3)
                        .foregroundStyle(CRTheme.slate)

                    GlassCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("AI summary")
                                .font(.headline)
                            Text(call.summary)
                                .foregroundStyle(CRTheme.slate)
                        }
                    }

                    if let transcript = call.transcript, !transcript.isEmpty {
                        GlassCard {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Transcript")
                                    .font(.headline)
                                Text(transcript)
                                    .foregroundStyle(CRTheme.slate)
                            }
                        }
                    }

                    GlassCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Messages")
                                .font(.headline)
                            if vm.messages.isEmpty {
                                Text("No SMS thread yet.")
                                    .foregroundStyle(CRTheme.slate)
                            } else {
                                ForEach(vm.messages) { message in
                                    Text(message.body)
                                        .padding(12)
                                        .frame(maxWidth: .infinity, alignment: message.direction == "outbound" ? .trailing : .leading)
                                        .background(message.direction == "outbound" ? CRTheme.softViolet : CRTheme.softSky, in: RoundedRectangle(cornerRadius: 16))
                                }
                            }
                            TextInput(placeholder: "Send SMS reply", text: $draftSMS)
                            PrimaryButton(title: "Send SMS", systemImage: "paperplane.fill") {
                                let body = draftSMS
                                draftSMS = ""
                                Task { await vm.sendSMS(callId: call.id, body: body) }
                            }
                        }
                    }

                    HStack {
                        SecondaryButton(title: "Open", systemImage: "tray.fill") {
                            Task { await vm.updateLeadStatus(call, leadStatus: "open") }
                        }
                        SecondaryButton(title: "Recovered", systemImage: "checkmark.circle.fill") {
                            Task { await vm.updateLeadStatus(call, leadStatus: "closed") }
                        }
                    }
                }
                .padding(20)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}


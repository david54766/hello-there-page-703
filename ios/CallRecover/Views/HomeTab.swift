import SwiftUI

struct HomeTab: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var showForwarding = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SectionTitle("Recovered calls", subtitle: vm.business?.businessName ?? "Business workspace")

                GlassCard {
                    HStack(alignment: .top, spacing: 16) {
                        ZStack {
                            Circle().fill(CRTheme.softViolet)
                            Image(systemName: "sparkles")
                                .foregroundStyle(CRTheme.violet)
                                .font(.title.weight(.bold))
                        }
                        .frame(width: 66, height: 66)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("AI call recovery")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(CRTheme.ink)
                            Text("Connect missed calls to the AI agent in one forwarding step.")
                                .font(.title3)
                                .foregroundStyle(CRTheme.slate)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }

                    PrimaryButton(title: "Forward calls", systemImage: "phone.arrow.up.right") {
                        showForwarding = true
                    }
                    .padding(.top, 18)
                }
                .padding(.horizontal, 20)

                GlassCard {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("\(vm.recoveredCount)")
                                .font(.system(size: 52, weight: .bold, design: .rounded))
                                .foregroundStyle(CRTheme.ink)
                            Text("recovered calls")
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(CRTheme.slate)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 5) {
                            Text("$\(vm.estimatedRecoveredValue)")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundStyle(CRTheme.ink)
                            Text("est. recovered revenue")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(CRTheme.slate)
                        }
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        Label("Estimated recovered revenue", systemImage: "chart.line.uptrend.xyaxis")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(CRTheme.ink)

                        HStack(alignment: .bottom, spacing: 14) {
                            ForEach(0..<6, id: \.self) { index in
                                VStack(spacing: 6) {
                                    Text("$\(index == 5 ? vm.estimatedRecoveredValue : 0)")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(CRTheme.slate)
                                    RoundedRectangle(cornerRadius: 10)
                                        .fill(CRTheme.accent)
                                        .frame(height: CGFloat(index == 5 && vm.estimatedRecoveredValue > 0 ? 110 : 42))
                                    Text(shortDay(offset: index - 5))
                                        .font(.caption)
                                        .foregroundStyle(CRTheme.slate)
                                }
                                .frame(maxWidth: .infinity)
                            }
                        }
                        .frame(height: 150)
                    }
                    .padding(.top, 16)
                }
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 24)
        }
        .sheet(isPresented: $showForwarding) {
            ForwardingSheet()
                .presentationDetents([.medium, .large])
        }
    }

    private func shortDay(offset: Int) -> String {
        let date = Calendar.current.date(byAdding: .day, value: offset, to: Date()) ?? Date()
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d"
        return formatter.string(from: date)
    }
}

struct ForwardingSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var carrier = "verizon"
    @State private var forwardingNumber = ""
    @State private var confirmed = false

    private var dialCode: String {
        if let current = vm.forwarding?.dialCode, !current.isEmpty {
            return current
        }
        let number = forwardingNumber.isEmpty ? (vm.forwarding?.forwardingNumber ?? "") : forwardingNumber
        switch carrier {
        case "att", "tmobile": return "**004*\(number)#"
        case "verizon": return "*71\(number)"
        default: return "**004*\(number)#"
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Forward calls")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(CRTheme.ink)
                    Text("Use the code below to route missed calls to CallRecover.")
                        .font(.title3)
                        .foregroundStyle(CRTheme.slate)
                    Text("Carrier notice: your provider may charge additional fees or use plan minutes for call forwarding. Check your carrier's terms if you are unsure.")
                        .font(.footnote)
                        .foregroundStyle(CRTheme.slate)

                    OptionMenu(title: "Carrier", options: StaticOptions.carriers, value: $carrier)

                    TextInput(placeholder: "Forwarding number", text: $forwardingNumber, keyboard: .phonePad)

                    GlassCard {
                        VStack(alignment: .leading, spacing: 12) {
                            FieldLabel(text: "Forwarding code")
                            Text(dialCode.isEmpty ? "Add forwarding number" : dialCode)
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundStyle(CRTheme.ink)
                                .textSelection(.enabled)
                            PrimaryButton(title: "Copy code", systemImage: "doc.on.doc.fill") {
                                UIPasteboard.general.string = dialCode
                            }
                        }
                    }

                    Toggle("Forwarding Active", isOn: $confirmed)
                        .font(.headline)
                        .tint(CRTheme.violet)

                    PrimaryButton(title: "Save forwarding", systemImage: "checkmark.circle.fill") {
                        let status = ForwardingStatus(
                            id: vm.forwarding?.id,
                status: confirmed ? "user_confirmed" : "not_started",
                            carrier: carrier,
                            forwardingNumber: forwardingNumber.isEmpty ? vm.forwarding?.forwardingNumber : forwardingNumber,
                            dialCode: dialCode
                        )
                        Task {
                            await vm.saveForwarding(status)
                            dismiss()
                        }
                    }
                }
                .padding(20)
            }
            .onAppear {
                carrier = vm.forwarding?.carrier ?? vm.business?.carrier ?? "verizon"
                forwardingNumber = vm.forwarding?.forwardingNumber ?? vm.business?.twilioNumber ?? ""
                confirmed = ["user_confirmed", "test_detected"].contains(vm.forwarding?.status ?? "")
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

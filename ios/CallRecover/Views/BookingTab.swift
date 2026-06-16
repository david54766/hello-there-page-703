import SwiftUI

struct BookingTab: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var showAdd = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SectionTitle("Appointments", subtitle: "\(vm.appointments.count) scheduled")

                GlassCard {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(vm.business?.schedulingEnabled == true ? "Booking is active" : "Booking is paused")
                                .font(.title2.weight(.bold))
                                .foregroundStyle(CRTheme.ink)
                            Text("Use this tab to set and manage appointments.")
                                .font(.title3)
                                .foregroundStyle(CRTheme.slate)
                        }
                        Spacer()
                        Text(vm.business?.schedulingEnabled == true ? "Active" : "Paused")
                            .font(.headline)
                            .foregroundStyle(vm.business?.schedulingEnabled == true ? CRTheme.teal : CRTheme.slate)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(CRTheme.softViolet, in: Capsule())
                    }

                    HStack(spacing: 12) {
                        MetricTile(value: "\(upcomingCount)", label: "upcoming", tint: CRTheme.softViolet)
                        MetricTile(value: "\(todayCount)", label: "today", tint: CRTheme.softTeal)
                        MetricTile(value: "\(vm.appointments.count)", label: "booked", tint: CRTheme.softSky)
                    }
                    .padding(.top, 16)
                }
                .padding(.horizontal, 20)

                GlassCard {
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Scheduled appointments")
                                .font(.title2.weight(.bold))
                            Text("Current bookings for recovered leads and manual follow-up.")
                                .font(.title3)
                                .foregroundStyle(CRTheme.slate)
                        }
                        Spacer()
                        Button {
                            showAdd = true
                        } label: {
                            Label("Add", systemImage: "plus")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 12)
                                .background(CRTheme.violet, in: Capsule())
                        }
                    }

                    if vm.appointments.isEmpty {
                        Text("No appointments scheduled yet.")
                            .font(.title3)
                            .foregroundStyle(CRTheme.slate)
                            .padding(.top, 8)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(vm.appointments) { appointment in
                                AppointmentRow(appointment: appointment)
                            }
                        }
                        .padding(.top, 12)
                    }
                }
                .padding(.horizontal, 20)

                GlassCard {
                    Toggle(isOn: Binding(
                        get: { vm.business?.schedulingEnabled == true },
                        set: { newValue in
                            guard var business = vm.business else { return }
                            business.schedulingEnabled = newValue
                            Task { await vm.saveBusiness(business) }
                        }
                    )) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Booking availability")
                                .font(.title2.weight(.bold))
                            Text("Control whether CallRecover can set appointments.")
                                .foregroundStyle(CRTheme.slate)
                        }
                    }
                    .tint(CRTheme.violet)
                }
                .padding(.horizontal, 20)
            }
            .padding(.bottom, 24)
        }
        .sheet(isPresented: $showAdd) {
            AddAppointmentSheet()
                .presentationDetents([.large])
        }
    }

    private var upcomingCount: Int {
        vm.appointments.filter { $0.status != "cancelled" }.count
    }

    private var todayCount: Int {
        vm.appointments.filter {
            guard let date = ISO8601DateFormatter().date(from: $0.scheduledFor) else { return false }
            return Calendar.current.isDateInToday(date)
        }.count
    }
}

struct AppointmentRow: View {
    let appointment: Appointment

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(CRTheme.softTeal)
                Image(systemName: "calendar")
                    .foregroundStyle(CRTheme.teal)
                    .font(.headline)
            }
            .frame(width: 48, height: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text(appointment.customerName ?? "Customer")
                    .font(.headline)
                Text(appointment.service ?? "Service appointment")
                    .foregroundStyle(CRTheme.slate)
                Text(formatDate(appointment.scheduledFor))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(CRTheme.violet)
            }
            Spacer()
        }
        .padding(12)
        .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 18))
    }

    private func formatDate(_ raw: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: raw) else { return raw }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

struct AddAppointmentSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var scheduledFor = Date().addingTimeInterval(3600)
    @State private var customerName = ""
    @State private var customerPhone = ""
    @State private var service = ""
    @State private var notes = ""
    @State private var duration = "60"
    @State private var teamMemberId = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Add appointment")
                        .font(.system(size: 34, weight: .bold, design: .rounded))

                    DatePicker("Appointment time", selection: $scheduledFor)
                        .datePickerStyle(.graphical)
                        .tint(CRTheme.violet)
                        .padding()
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 22))

                    if !vm.teamMembers.isEmpty {
                        OptionMenu(
                            title: "Team member",
                            options: vm.teamMembers.compactMap { member in
                                guard let id = member.id else { return nil }
                                return LabelValue(value: id, label: member.name)
                            },
                            value: $teamMemberId
                        )
                    }

                    TextInput(placeholder: "Customer name", text: $customerName)
                    TextInput(placeholder: "Customer phone", text: $customerPhone, keyboard: .phonePad)
                    TextInput(placeholder: "Service", text: $service)
                    TextInput(placeholder: "Duration minutes", text: $duration, keyboard: .numberPad)
                    TextInput(placeholder: "Notes", text: $notes)

                    PrimaryButton(title: "Save appointment", systemImage: "checkmark.circle.fill") {
                        guard let businessId = vm.business?.id else { return }
                        let body = AppointmentBody(
                            businessId: businessId,
                            teamMemberId: teamMemberId.isEmpty ? nil : teamMemberId,
                            callId: nil,
                            scheduledFor: ISO8601DateFormatter().string(from: scheduledFor),
                            durationMinutes: Int(duration) ?? 60,
                            customerName: customerName,
                            customerPhone: customerPhone,
                            service: service,
                            notes: notes,
                            source: "manual",
                            provider: "internal",
                            status: "booked"
                        )
                        Task {
                            await vm.createAppointment(body)
                            dismiss()
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


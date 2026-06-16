import SwiftUI

struct TeamTab: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var showAdd = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SectionTitle("Team routing", subtitle: "\(vm.teamMembers.filter { $0.active }.count) active")

                GlassCard {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Assigned team")
                                .font(.title2.weight(.bold))
                            Text("People who receive recovered lead routing.")
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
                }
                .padding(.horizontal, 20)

                if vm.teamMembers.isEmpty {
                    EmptyState(title: "No team members yet", message: "Add office, sales, service, or emergency contacts for lead routing.")
                        .padding(.horizontal, 20)
                } else {
                    ForEach(vm.teamMembers) { member in
                        TeamMemberRow(member: member)
                            .padding(.horizontal, 20)
                    }
                }
            }
            .padding(.bottom, 24)
        }
        .sheet(isPresented: $showAdd) {
            AddTeamMemberSheet()
                .presentationDetents([.large])
        }
    }
}

struct TeamMemberRow: View {
    let member: TeamMember

    var body: some View {
        GlassCard {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(CRTheme.softViolet)
                    Image(systemName: "person.fill")
                        .foregroundStyle(CRTheme.violet)
                        .font(.title2)
                }
                .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: 5) {
                    Text(member.name)
                        .font(.headline)
                    Text(member.role.titleCasedWords)
                        .foregroundStyle(CRTheme.slate)
                    if let phone = member.phone, !phone.isEmpty {
                        Text(phone)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(CRTheme.violet)
                    }
                }

                Spacer()

                Text(member.active ? "Active" : "Off")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(member.active ? CRTheme.softTeal : Color.gray.opacity(0.12), in: Capsule())
            }
        }
    }
}

struct AddTeamMemberSheet: View {
    @EnvironmentObject private var vm: AppViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var role = "office"
    @State private var active = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Add team member")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    Text("Assign who receives recovered lead routing.")
                        .font(.title3)
                        .foregroundStyle(CRTheme.slate)

                    TextInput(placeholder: "Name", text: $name)
                    TextInput(placeholder: "Phone", text: $phone, keyboard: .phonePad)
                    TextInput(placeholder: "Email", text: $email, keyboard: .emailAddress)

                    OptionMenu(
                        title: "Role",
                        options: StaticOptions.teamRoles.map { LabelValue(value: $0, label: $0.titleCasedWords) },
                        value: $role
                    )

                    Toggle("Receives leads", isOn: $active)
                        .font(.headline)
                        .tint(CRTheme.violet)

                    PrimaryButton(title: "Save team member", systemImage: "checkmark.circle.fill") {
                        let member = TeamMember(
                            id: nil,
                            businessId: vm.business?.id,
                            name: name,
                            phone: phone.isEmpty ? nil : phone,
                            email: email.isEmpty ? nil : email,
                            role: role,
                            active: active
                        )
                        Task {
                            await vm.saveTeamMember(member)
                            dismiss()
                        }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
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


import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var vm: AppViewModel
    @State private var email = ""
    @State private var password = ""

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 6
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 36)

            VStack(spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 22)
                        .fill(CRTheme.accent)
                    Image(systemName: "phone.fill")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(.white)
                }
                .frame(width: 76, height: 76)

                Text("CallRecover AI")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .foregroundStyle(CRTheme.ink)
                Text("AI tool for recovering missed leads")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(CRTheme.slate)
            }
            .padding(.top, 20)

            Spacer()

            GlassCard {
                VStack(alignment: .leading, spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Sign in")
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundStyle(CRTheme.ink)
                        Text("Access your CallRecover AI workspace.")
                            .font(.title3)
                            .foregroundStyle(CRTheme.slate)
                    }

                    TextInput(placeholder: "Email", text: $email, keyboard: .emailAddress)

                    SecureField("Password", text: $password)
                        .padding(16)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(CRTheme.panelStroke))

                    Button {
                        Task { await vm.signIn(email: email, password: password) }
                    } label: {
                        Text("Sign in")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(canSubmit ? CRTheme.violet : Color.gray.opacity(0.25), in: RoundedRectangle(cornerRadius: 20))
                    }
                    .disabled(!canSubmit)
                }
            }
            .padding(.horizontal, 22)

            Spacer()
            Spacer(minLength: 44)
        }
    }
}


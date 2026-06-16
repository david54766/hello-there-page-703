import SwiftUI

struct AppHeader: View {
    @EnvironmentObject private var vm: AppViewModel

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(CRTheme.accent)
                Image(systemName: "phone.fill")
                    .foregroundStyle(.white)
                    .font(.system(size: 24, weight: .bold))
            }
            .frame(width: 54, height: 54)

            VStack(alignment: .leading, spacing: 2) {
                Text("CallRecover AI")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(CRTheme.ink)
                Text("AI missed-call recovery")
                    .font(.subheadline)
                    .foregroundStyle(CRTheme.slate)
            }

            Spacer()

            Button {
                vm.signOut()
            } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(CRTheme.slate)
                    .frame(width: 54, height: 54)
                    .background(Color.white.opacity(0.9), in: Circle())
            }
            .accessibilityLabel("Sign out")
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 8)
    }
}

struct GlassCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 28)
                    .fill(CRTheme.panel.opacity(0.96))
                    .shadow(color: Color.black.opacity(0.10), radius: 14, x: 0, y: 8)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 28)
                    .stroke(CRTheme.panelStroke, lineWidth: 1)
            )
    }
}

struct PrimaryButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage)
                Text(title)
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(CRTheme.violet, in: RoundedRectangle(cornerRadius: 20))
        }
    }
}

struct SecondaryButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage)
                Text(title)
            }
            .font(.headline)
            .foregroundStyle(CRTheme.violet)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(CRTheme.softViolet, in: RoundedRectangle(cornerRadius: 20))
        }
    }
}

struct MetricTile: View {
    let value: String
    let label: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(value)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(CRTheme.ink)
                .lineLimit(1)
            Text(label)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CRTheme.slate)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(tint.opacity(0.95), in: RoundedRectangle(cornerRadius: 22))
    }
}

struct EmptyState: View {
    let title: String
    let message: String

    var body: some View {
        GlassCard {
            HStack(spacing: 16) {
                ZStack {
                    Circle().fill(CRTheme.softSky)
                    Image(systemName: "sparkles")
                        .foregroundStyle(CRTheme.violet)
                        .font(.title2.weight(.bold))
                }
                .frame(width: 58, height: 58)

                VStack(alignment: .leading, spacing: 6) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(CRTheme.ink)
                    Text(message)
                        .foregroundStyle(CRTheme.slate)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
}

struct SectionTitle: View {
    let title: String
    let subtitle: String?

    init(_ title: String, subtitle: String? = nil) {
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(CRTheme.ink)
            if let subtitle {
                Text(subtitle)
                    .font(.title3)
                    .foregroundStyle(CRTheme.slate)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 20)
    }
}

struct FieldLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(CRTheme.slate)
    }
}

struct TextInput: View {
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        TextField(placeholder, text: $text)
            .keyboardType(keyboard)
            .textInputAutocapitalization(.never)
            .padding(16)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(CRTheme.panelStroke))
    }
}

struct OptionMenu: View {
    let title: String
    let options: [LabelValue]
    @Binding var value: String

    var selectedLabel: String {
        options.first { $0.value == value }?.label ?? title
    }

    var body: some View {
        Menu {
            ForEach(options) { option in
                Button(option.label) {
                    value = option.value
                }
            }
        } label: {
            HStack {
                Text(selectedLabel)
                    .foregroundStyle(CRTheme.ink)
                Spacer()
                Image(systemName: "chevron.down")
                    .foregroundStyle(CRTheme.slate)
            }
            .font(.headline)
            .padding(16)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(CRTheme.panelStroke))
        }
    }
}

extension String {
    var titleCasedWords: String {
        replacingOccurrences(of: "_", with: " ")
            .split(separator: " ")
            .map { String($0.prefix(1)).uppercased() + String($0.dropFirst()) }
            .joined(separator: " ")
    }
}

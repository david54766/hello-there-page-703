import SwiftUI

enum MainTab: String, CaseIterable {
    case home = "Home"
    case leads = "Leads"
    case booking = "Booking"
    case team = "Team"
    case more = "More"

    var icon: String {
        switch self {
        case .home: return "sparkles"
        case .leads: return "tray.fill"
        case .booking: return "calendar"
        case .team: return "person.2.fill"
        case .more: return "ellipsis"
        }
    }
}

struct MainView: View {
    @State private var tab: MainTab = .home

    var body: some View {
        VStack(spacing: 0) {
            AppHeader()

            TabView(selection: $tab) {
                HomeTab()
                    .tag(MainTab.home)
                LeadsTab()
                    .tag(MainTab.leads)
                BookingTab()
                    .tag(MainTab.booking)
                TeamTab()
                    .tag(MainTab.team)
                MoreTab()
                    .tag(MainTab.more)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            HStack {
                ForEach(MainTab.allCases, id: \.self) { item in
                    Button {
                        tab = item
                    } label: {
                        VStack(spacing: 5) {
                            Image(systemName: item.icon)
                                .font(.system(size: 22, weight: .semibold))
                            Text(item.rawValue)
                                .font(.caption.weight(.bold))
                        }
                        .foregroundStyle(tab == item ? CRTheme.violet : CRTheme.slate)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(tab == item ? Color.white.opacity(0.75) : Color.clear, in: Capsule())
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.top, 8)
            .padding(.bottom, 12)
            .background(CRTheme.softViolet.opacity(0.8))
        }
    }
}


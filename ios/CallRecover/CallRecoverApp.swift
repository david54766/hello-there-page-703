import SwiftUI

@main
struct CallRecoverApp: App {
    @StateObject private var viewModel = AppViewModel(
        api: CallRecoverAPI(session: .shared),
        session: .shared
    )

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(viewModel)
        }
    }
}


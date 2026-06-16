import SwiftUI

struct RootView: View {
    @EnvironmentObject private var vm: AppViewModel

    var body: some View {
        ZStack {
            CRTheme.background.ignoresSafeArea()

            if vm.isSignedIn {
                MainView()
                    .task { await vm.loadHome() }
            } else {
                LoginView()
            }

            if vm.isLoading {
                ProgressView()
                    .tint(CRTheme.violet)
                    .scaleEffect(1.2)
                    .padding(24)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22))
            }
        }
        .alert("CallRecover", isPresented: Binding(
            get: { vm.errorMessage != nil },
            set: { if !$0 { vm.errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { vm.errorMessage = nil }
        } message: {
            Text(vm.errorMessage ?? "")
        }
    }
}


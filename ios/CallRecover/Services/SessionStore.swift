import Foundation
import Security

final class SessionStore {
    static let shared = SessionStore()

    private let service = "ai.easyfill.callrecover.session"

    var accessToken: String? {
        get { read("accessToken") }
        set { write(newValue, account: "accessToken") }
    }

    var refreshToken: String? {
        get { read("refreshToken") }
        set { write(newValue, account: "refreshToken") }
    }

    var isSignedIn: Bool { accessToken != nil }

    func clear() {
        write(nil, account: "accessToken")
        write(nil, account: "refreshToken")
    }

    private func read(_ account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private func write(_ value: String?, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]

        SecItemDelete(query as CFDictionary)

        guard let value, let data = value.data(using: .utf8) else {
            return
        }

        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(item as CFDictionary, nil)
    }
}


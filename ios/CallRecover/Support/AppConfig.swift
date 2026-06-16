import Foundation

enum AppConfig {
    static let supabaseURL = requiredURL("SUPABASE_URL")
    static let apiBaseURL = requiredURL("API_BASE_URL")
    static let supabaseAnonKey = requiredString("SUPABASE_ANON_KEY")

    private static func requiredString(_ key: String) -> String {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String,
              !value.isEmpty,
              !value.contains("YOUR_"),
              !value.contains("$(") else {
            fatalError("Missing required config value: \(key)")
        }
        return value
    }

    private static func requiredURL(_ key: String) -> URL {
        guard let url = URL(string: requiredString(key)) else {
            fatalError("Invalid URL config value: \(key)")
        }
        return url
    }
}


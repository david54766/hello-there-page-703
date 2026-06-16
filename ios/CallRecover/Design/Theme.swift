import SwiftUI

enum CRTheme {
    static let ink = Color(red: 0.06, green: 0.09, blue: 0.16)
    static let slate = Color(red: 0.40, green: 0.45, blue: 0.52)
    static let panel = Color.white
    static let panelStroke = Color(red: 0.86, green: 0.90, blue: 0.96)
    static let violet = Color(red: 0.31, green: 0.27, blue: 0.90)
    static let cyan = Color(red: 0.06, green: 0.65, blue: 0.91)
    static let teal = Color(red: 0.08, green: 0.72, blue: 0.66)
    static let softViolet = Color(red: 0.94, green: 0.92, blue: 1.00)
    static let softSky = Color(red: 0.87, green: 0.96, blue: 1.00)
    static let softTeal = Color(red: 0.87, green: 1.00, blue: 0.97)

    static let background = LinearGradient(
        colors: [
            Color(red: 0.97, green: 0.99, blue: 1.00),
            Color(red: 0.93, green: 0.97, blue: 1.00),
            Color(red: 0.97, green: 0.94, blue: 1.00)
        ],
        startPoint: .top,
        endPoint: .bottom
    )

    static let accent = LinearGradient(
        colors: [violet, cyan, teal],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}


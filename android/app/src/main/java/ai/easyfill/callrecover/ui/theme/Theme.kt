package ai.easyfill.callrecover.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.material3.Typography

private val CallRecoverColors = lightColorScheme(
    primary = Color(0xFFD6A84F),
    secondary = Color(0xFF171717),
    tertiary = Color(0xFF7A6A42),
    background = Color(0xFFFBFAF6),
    surface = Color.White,
    onPrimary = Color(0xFF171717),
    onBackground = Color(0xFF171717),
    onSurface = Color(0xFF171717),
    onSurfaceVariant = Color(0xFF6F6A60),
    error = Color(0xFFB42318),
    errorContainer = Color(0xFFFFE4E4),
    onErrorContainer = Color(0xFF7A271A)
)

private val CallRecoverTypography = Typography()

@Composable
fun CallRecoverTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = CallRecoverColors,
        typography = CallRecoverTypography,
        content = content
    )
}

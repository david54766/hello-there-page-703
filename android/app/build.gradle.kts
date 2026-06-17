import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use(::load)
}

val signingProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use(::load)
}

val hasReleaseSigning = listOf("storeFile", "storePassword", "keyAlias", "keyPassword")
    .all { signingProperties.getProperty(it).isNullOrBlank().not() }

val appVersionCode = 47
val appVersionName = "0.6.3"

val defaultSupabaseUrl = "https://czvsgemkmvkyfypearuj.supabase.co"
val defaultSupabaseAnonKey = "sb_publishable_VfmxsBcKdQpT1xcj0BIIAw_i-ecttmv"
val defaultApiBaseUrl = "https://callrecover.net"

fun localString(name: String, fallback: String = ""): String {
    return (localProperties.getProperty(name) ?: fallback).replace("\\", "\\\\").replace("\"", "\\\"")
}

fun googleDriveApkDir() = listOf(
    file("G:/My Drive/CallRecover APKs"),
    file("${System.getProperty("user.home")}/My Drive/CallRecover APKs"),
    file("${System.getProperty("user.home")}/Google Drive/CallRecover APKs"),
).firstOrNull { candidate -> candidate.parentFile?.exists() == true || candidate.exists() }

android {
    namespace = "ai.easyfill.callrecover"
    compileSdk = 36

    defaultConfig {
        applicationId = "ai.easyfill.callrecover"
        minSdk = 26
        targetSdk = 36
        versionCode = appVersionCode
        versionName = appVersionName

        buildConfigField("String", "SUPABASE_URL", "\"${localString("SUPABASE_URL", defaultSupabaseUrl)}\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"${localString("SUPABASE_ANON_KEY", defaultSupabaseAnonKey)}\"")
        buildConfigField("String", "API_BASE_URL", "\"${localString("API_BASE_URL", defaultApiBaseUrl)}\"")
    }

    signingConfigs {
        create("release") {
            if (hasReleaseSigning) {
                storeFile = rootProject.file(signingProperties.getProperty("storeFile"))
                storePassword = signingProperties.getProperty("storePassword")
                keyAlias = signingProperties.getProperty("keyAlias")
                keyPassword = signingProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        getByName("release") {
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "x86_64")
            isUniversalApk = true
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.05.01"))
    implementation(platform("com.google.firebase:firebase-bom:34.14.0"))

    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.security:security-crypto:1.1.0")

    implementation("io.ktor:ktor-client-android:3.5.0")
    implementation("io.ktor:ktor-client-content-negotiation:3.5.0")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.5.0")
    implementation("io.ktor:ktor-client-logging:3.5.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    implementation("com.google.firebase:firebase-messaging")
}

tasks.register("copyDebugApkToDrive") {
    group = "distribution"
    description = "Copies the universal debug APK to Google Drive when Drive is mounted."

    doLast {
        val targetDir = googleDriveApkDir()
        if (targetDir == null) {
            logger.lifecycle("Google Drive not mounted; skipping APK copy.")
            return@doLast
        }

        val source = layout.buildDirectory.file("outputs/apk/debug/app-universal-debug.apk").get().asFile
        if (!source.exists()) {
            logger.lifecycle("Universal debug APK not found; skipping Drive copy.")
            return@doLast
        }

        targetDir.mkdirs()
        source.copyTo(targetDir.resolve("CallRecover-testable-v$appVersionName.apk"), overwrite = true)
        source.copyTo(targetDir.resolve("CallRecover-testable-latest.apk"), overwrite = true)
        logger.lifecycle("Copied debug APKs to ${targetDir.absolutePath}")
    }
}

tasks.register("copyReleaseBundleToDrive") {
    group = "distribution"
    description = "Copies the release App Bundle to Google Drive when Drive is mounted."

    doLast {
        if (!rootProject.file("local.properties").exists() || !hasReleaseSigning) {
            logger.lifecycle("Local or release signing properties missing; skipping release bundle copy to Drive.")
            return@doLast
        }

        val targetDir = googleDriveApkDir()
        if (targetDir == null) {
            logger.lifecycle("Google Drive not mounted; skipping release bundle copy.")
            return@doLast
        }

        val source = layout.buildDirectory.file("outputs/bundle/release/app-release.aab").get().asFile
        if (!source.exists()) {
            logger.lifecycle("Release App Bundle not found; skipping Drive copy.")
            return@doLast
        }

        targetDir.mkdirs()
        source.copyTo(targetDir.resolve("CallRecover-release-v$appVersionName.aab"), overwrite = true)
        source.copyTo(targetDir.resolve("CallRecover-release-latest.aab"), overwrite = true)
        logger.lifecycle("Copied release bundles to ${targetDir.absolutePath}")
    }
}

tasks.matching { it.name == "assembleDebug" }.configureEach {
    finalizedBy("copyDebugApkToDrive")
}

tasks.matching { it.name == "bundleRelease" }.configureEach {
    finalizedBy("copyReleaseBundleToDrive")
}

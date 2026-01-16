package expo.modules.visionaesthetics

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.net.Uri
import android.graphics.BitmapFactory
import java.io.File
import kotlin.math.abs
import kotlin.math.min

class ExpoVisionAestheticsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoVisionAesthetics")

    // Check if aesthetics API is available (always false on Android for now)
    Function("isAestheticsAvailable") {
      false
    }

    // Score a single image - fallback implementation
    AsyncFunction("scoreImage") { imageUri: String ->
      scoreImageFallback(imageUri)
    }

    // Score multiple images
    AsyncFunction("scoreImageBatch") { imageUris: List<String> ->
      imageUris.map { uri -> scoreImageFallback(uri) }
    }

    // Detect faces - basic stub (would need ML Kit for real implementation)
    AsyncFunction("detectFaces") { imageUri: String ->
      mapOf(
        "faceCount" to 0,
        "faces" to emptyList<Map<String, Any>>()
      )
    }
  }

  private fun scoreImageFallback(uri: String): Map<String, Any> {
    return try {
      // Clean URI
      val cleanUri = uri.replace("file://", "")
      val file = File(cleanUri)
      
      if (!file.exists()) {
        return mapOf(
          "score" to 0.0,
          "isUtility" to false,
          "available" to false,
          "fallback" to true,
          "error" to "File not found"
        )
      }

      // Load image to get dimensions
      val options = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
      }
      BitmapFactory.decodeFile(cleanUri, options)
      
      val width = options.outWidth
      val height = options.outHeight

      if (width <= 0 || height <= 0) {
        return mapOf(
          "score" to 0.0,
          "isUtility" to false,
          "available" to false,
          "fallback" to true,
          "error" to "Could not decode image dimensions"
        )
      }

      // Basic quality heuristic: higher resolution = better
      val megapixels = (width.toDouble() * height.toDouble()) / 1_000_000.0
      val resolutionScore = min(1.0, megapixels / 12.0) // 12MP = max score

      // Aspect ratio preference (avoid very wide or very tall)
      val aspectRatio = width.toDouble() / height.toDouble()
      val aspectScore = 1.0 - abs(aspectRatio - 1.0) * 0.3

      val finalScore = (resolutionScore * 0.6 + aspectScore * 0.4) * 2 - 1 // Scale to -1 to 1

      mapOf(
        "score" to finalScore,
        "isUtility" to false,
        "available" to false,
        "fallback" to true
      )
    } catch (e: Exception) {
      mapOf(
        "score" to 0.0,
        "isUtility" to false,
        "available" to false,
        "fallback" to true,
        "error" to (e.message ?: "Unknown error")
      )
    }
  }
}

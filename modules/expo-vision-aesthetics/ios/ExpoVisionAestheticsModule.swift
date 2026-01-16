import ExpoModulesCore
import Vision
import UIKit

public class ExpoVisionAestheticsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoVisionAesthetics")
    
    // Check if iOS 18+ aesthetics API is available
    Function("isAestheticsAvailable") { () -> Bool in
      if #available(iOS 18.0, *) {
        return true
      }
      return false
    }
    
    // Score a single image for aesthetic quality
    AsyncFunction("scoreImage") { (imageUri: String) -> [String: Any] in
      guard let image = self.loadImage(from: imageUri) else {
        throw Exception(name: "ImageLoadError", description: "Failed to load image from URI")
      }
      
      // iOS 18+ aesthetic scoring
      if #available(iOS 18.0, *) {
        return try await self.scoreWithVisionAPI(image: image)
      } else {
        // Fallback for older iOS
        return self.fallbackScore(image: image)
      }
    }
    
    // Score multiple images in parallel batches
    AsyncFunction("scoreImageBatch") { (imageUris: [String]) -> [[String: Any]] in
      var results: [[String: Any]] = []
      
      // Process in parallel using TaskGroup
      await withTaskGroup(of: (Int, [String: Any]).self) { group in
        for (index, uri) in imageUris.enumerated() {
          group.addTask {
            do {
              guard let image = self.loadImage(from: uri) else {
                return (index, ["error": "Failed to load image", "score": 0.0])
              }
              
              if #available(iOS 18.0, *) {
                let result = try await self.scoreWithVisionAPI(image: image)
                return (index, result)
              } else {
                return (index, self.fallbackScore(image: image))
              }
            } catch {
              return (index, ["error": error.localizedDescription, "score": 0.0])
            }
          }
        }
        
        // Collect results
        for await (index, result) in group {
          while results.count <= index {
            results.append([:])
          }
          results[index] = result
        }
      }
      
      return results
    }
    
    // Detect faces in an image
    AsyncFunction("detectFaces") { (imageUri: String) -> [String: Any] in
      guard let image = self.loadImage(from: imageUri) else {
        throw Exception(name: "ImageLoadError", description: "Failed to load image from URI")
      }
      
      return try await self.detectFacesInImage(image: image)
    }
  }
  
  // MARK: - Private Methods
  
  private func loadImage(from uri: String) -> CGImage? {
    // Handle file:// URIs
    let cleanUri = uri.replacingOccurrences(of: "file://", with: "")
    
    // Try URL(string:) first for proper URLs, otherwise use file path
    let url: URL
    if let parsedUrl = URL(string: uri), parsedUrl.scheme != nil {
      url = parsedUrl
    } else {
      url = URL(fileURLWithPath: cleanUri)
    }
    
    guard let data = try? Data(contentsOf: url),
          let uiImage = UIImage(data: data),
          let cgImage = uiImage.cgImage else {
      return nil
    }
    
    return cgImage
  }
  
  @available(iOS 18.0, *)
  private func scoreWithVisionAPI(image: CGImage) async throws -> [String: Any] {
    // Create the aesthetics scoring request
    var request = CalculateImageAestheticsScoresRequest()
    
    // Perform the request on the CGImage with orientation parameter
    // Using .up as default orientation for photos
    let observation = try await request.perform(on: image, orientation: .up)
    
    // Extract scores from observation
    return [
      "score": observation.overallScore,          // -1 to 1
      "isUtility": observation.isUtility,         // Is it a utility photo (screenshot, doc)?
      "available": true
    ]
  }
  
  private func fallbackScore(image: CGImage) -> [String: Any] {
    // Simple fallback scoring based on image properties
    let width = image.width
    let height = image.height
    
    // Basic quality heuristic: higher resolution = better
    let megapixels = Double(width * height) / 1_000_000.0
    let resolutionScore = min(1.0, megapixels / 12.0) // 12MP = max score
    
    // Aspect ratio preference (avoid very wide or very tall)
    let aspectRatio = Double(width) / Double(height)
    let aspectScore = 1.0 - abs(aspectRatio - 1.0) * 0.3
    
    let finalScore = (resolutionScore * 0.6 + aspectScore * 0.4) * 2 - 1 // Scale to -1 to 1
    
    return [
      "score": finalScore,
      "isUtility": false,
      "available": false,
      "fallback": true
    ]
  }
  
  private func detectFacesInImage(image: CGImage) async throws -> [String: Any] {
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    
    try handler.perform([request])
    
    guard let results = request.results else {
      return ["faceCount": 0, "faces": []]
    }
    
    var faces: [[String: Any]] = []
    for face in results {
      faces.append([
        "x": face.boundingBox.origin.x,
        "y": face.boundingBox.origin.y,
        "width": face.boundingBox.width,
        "height": face.boundingBox.height,
        "confidence": face.confidence
      ])
    }
    
    return [
      "faceCount": results.count,
      "faces": faces
    ]
  }
}

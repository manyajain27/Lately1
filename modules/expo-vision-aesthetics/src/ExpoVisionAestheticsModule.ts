import { NativeModule, requireNativeModule } from 'expo';

import { ExpoVisionAestheticsModuleEvents } from './ExpoVisionAesthetics.types';

export interface AestheticScore {
  score: number;        // -1 to 1 where higher is more aesthetic
  isUtility?: boolean;  // Is it a utility photo (screenshot, doc)?
  available: boolean;   // Was iOS 18 API available?
  fallback?: boolean;   // Used fallback scoring?
  error?: string;
}

export interface FaceDetectionResult {
  faceCount: number;
  faces: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
}

declare class ExpoVisionAestheticsModule extends NativeModule<ExpoVisionAestheticsModuleEvents> {
  isAestheticsAvailable(): boolean;
  scoreImage(imageUri: string): Promise<AestheticScore>;
  scoreImageBatch(imageUris: string[]): Promise<AestheticScore[]>;
  detectFaces(imageUri: string): Promise<FaceDetectionResult>;
}

export default requireNativeModule<ExpoVisionAestheticsModule>('ExpoVisionAesthetics');

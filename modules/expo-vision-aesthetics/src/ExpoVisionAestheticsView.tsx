import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoVisionAestheticsViewProps } from './ExpoVisionAesthetics.types';

const NativeView: React.ComponentType<ExpoVisionAestheticsViewProps> =
  requireNativeView('ExpoVisionAesthetics');

export default function ExpoVisionAestheticsView(props: ExpoVisionAestheticsViewProps) {
  return <NativeView {...props} />;
}

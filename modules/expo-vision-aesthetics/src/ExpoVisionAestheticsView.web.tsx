import * as React from 'react';

import { ExpoVisionAestheticsViewProps } from './ExpoVisionAesthetics.types';

export default function ExpoVisionAestheticsView(props: ExpoVisionAestheticsViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}

import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './ExpoVisionAesthetics.types';

type ExpoVisionAestheticsModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class ExpoVisionAestheticsModule extends NativeModule<ExpoVisionAestheticsModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(ExpoVisionAestheticsModule, 'ExpoVisionAestheticsModule');

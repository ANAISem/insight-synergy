import { featureToggles } from '../config/featureToggles';

export class FeatureToggle {
  static isEnabled(featureName: keyof typeof featureToggles): boolean {
    return featureToggles[featureName];
  }
} 
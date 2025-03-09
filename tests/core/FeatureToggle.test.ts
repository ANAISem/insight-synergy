import { FeatureToggle } from '../../src/core/FeatureToggle';
import { featureToggles } from '../../src/config/featureToggles';

// Mock des featureToggles-Moduls
jest.mock('../../src/config/featureToggles', () => ({
  featureToggles: {
    useAdvancedML: true,
    enableExperimentalAnalysis: false,
    useNewAPIIntegration: false,
    testFeature: true
  }
}));

describe('FeatureToggle', () => {
  it('should return true for enabled features', () => {
    expect(FeatureToggle.isEnabled('useAdvancedML')).toBe(true);
    expect(FeatureToggle.isEnabled('testFeature')).toBe(true);
  });

  it('should return false for disabled features', () => {
    expect(FeatureToggle.isEnabled('enableExperimentalAnalysis')).toBe(false);
    expect(FeatureToggle.isEnabled('useNewAPIIntegration')).toBe(false);
  });

  it('should reflect changes in feature toggle config', () => {
    // Simuliere eine Änderung der Feature-Toggle-Konfiguration
    const mockedFeatureToggles = featureToggles as any;
    const originalValue = mockedFeatureToggles.useAdvancedML;
    
    try {
      // Feature umschalten
      mockedFeatureToggles.useAdvancedML = false;
      expect(FeatureToggle.isEnabled('useAdvancedML')).toBe(false);
      
      mockedFeatureToggles.useAdvancedML = true;
      expect(FeatureToggle.isEnabled('useAdvancedML')).toBe(true);
    } finally {
      // Ursprünglichen Wert wiederherstellen
      mockedFeatureToggles.useAdvancedML = originalValue;
    }
  });
}); 
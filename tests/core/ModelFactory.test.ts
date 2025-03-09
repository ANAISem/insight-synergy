import { ModelFactory } from '../../src/core/ModelFactory';

// Mock der AdvancedMLEngine
jest.mock('../../src/core/AdvancedMLEngine', () => {
  return {
    AdvancedMLEngine: jest.fn().mockImplementation((modelType) => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      predict: jest.fn().mockResolvedValue({
        accuracy: 0.9,
        precision: 0.85,
        recall: 0.88,
        f1Score: 0.87
      }),
      dispose: jest.fn(),
      modelType,
    }))
  };
});

describe('ModelFactory', () => {
  beforeEach(() => {
    // Reset the singleton instance between tests
    jest.resetModules();
  });

  it('should be a singleton', () => {
    const instance1 = ModelFactory.getInstance();
    const instance2 = ModelFactory.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should load a model on demand', async () => {
    const factory = ModelFactory.getInstance();
    const model = await factory.getModel('LSTM');
    
    expect(model).toBeDefined();
    expect(model.predict).toBeDefined();
  });

  it('should return cached model if already loaded', async () => {
    const factory = ModelFactory.getInstance();
    const model1 = await factory.getModel('CNN');
    const model2 = await factory.getModel('CNN');
    
    expect(model1).toBe(model2);
  });

  // Dieser Test prüft die Speicherbereinigung, die normalerweise nach einem Timeout stattfindet
  // Wir forcieren den Cleanup manuell für den Test
  it('should clean up unused models', async () => {
    const factory = ModelFactory.getInstance() as any; // Cast to any to access private methods
    const model = await factory.getModel('MLP');
    
    expect(factory.modelCache.has('MLP')).toBe(true);
    
    // Manuelles Auslösen des Cleanups
    factory.cleanupCache();
    
    // Cache sollte noch nicht geleert sein, da das Modell gerade erst geladen wurde
    expect(factory.modelCache.has('MLP')).toBe(true);
    
    // Manipuliere das lastAccessed Datum, um einen Timeout zu simulieren
    factory.modelCache.get('MLP').lastAccessed = Date.now() - (factory.cacheTimeout * 2);
    
    // Cleanup erneut auslösen
    factory.cleanupCache();
    
    // Jetzt sollte das Modell aus dem Cache entfernt worden sein
    expect(factory.modelCache.has('MLP')).toBe(false);
  });
}); 
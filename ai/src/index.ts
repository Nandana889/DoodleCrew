try {
  process.loadEnvFile?.();
} catch {
  try {
    process.loadEnvFile?.('./ai/.env');
  } catch {
    // Optional .env
  }
}

export * from './types/index.js';
export * from './security/sanitizer.js';
export * from './extraction/attributeExtractor.js';
export * from './vision/visionAnalyzer.js';
export * from './matching/matchingEngine.js';
export * from './explanation/explanationGenerator.js';
export * from './service.js';

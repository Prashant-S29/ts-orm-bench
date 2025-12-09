export const BENCHMARK_CONFIG = {
  warmupIterations: 500,
  measurementIterations: 10000,
  memoryMonitoringInterval: 100, // ms

  // Test configuration per scenario type
  scenarios: {
    simple: {
      warmup: 500,
      iterations: 10000,
    },
    complex: {
      warmup: 100,
      iterations: 1000,
    },
    heavy: {
      warmup: 50,
      iterations: 500,
    },
  },
};

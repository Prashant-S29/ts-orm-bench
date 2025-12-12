'use client';

import { useState, useEffect } from 'react';
import { BenchmarkSummary, ComparisonData } from '@/types/benchmark';
import { loadDashboardData, loadComparisonData } from '@/lib/data-loader';

export function useBenchmarkData() {
  const [dashboardData, setDashboardData] = useState<BenchmarkSummary | null>(
    null,
  );
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [dashboard, comparison] = await Promise.all([
          loadDashboardData(),
          loadComparisonData(),
        ]);

        if (!dashboard || !comparison) {
          throw new Error('Failed to load benchmark data');
        }

        setDashboardData(dashboard);
        setComparisonData(comparison);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return { dashboardData, comparisonData, isLoading, error };
}

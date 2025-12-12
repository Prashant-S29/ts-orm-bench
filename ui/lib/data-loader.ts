// Utility functions to load benchmark data

import { BenchmarkSummary, ComparisonData } from '@/types/benchmark';

export async function loadDashboardData(): Promise<BenchmarkSummary | null> {
  try {
    const response = await fetch('/data/dashboard.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return null;
  }
}

export async function loadComparisonData(): Promise<ComparisonData | null> {
  try {
    const response = await fetch('/data/latest-all-orms.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error loading comparison data:', error);
    return null;
  }
}

export async function loadCRUDOnlyData(): Promise<ComparisonData | null> {
  try {
    const response = await fetch('/data/crud-only.json');
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error loading CRUD data:', error);
    return null;
  }
}
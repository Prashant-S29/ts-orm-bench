'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { ORMSelector } from '@/components/filters/orm-selector';
import { BenchSelector } from '@/components/filters/bench-selector';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { ScenarioGrid } from '@/components/dashboard/scenario-grid';
import { ChartsSection } from '@/components/dashboard/charts-section';
import { ComparisonTable } from '@/components/tables/comparison-table';
import { useBenchmarkData } from '@/hooks/use-benchmark-data';
import { useFilters } from '@/hooks/use-filters';
import { BenchCategory } from '@/types/benchmark';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { Hero } from '@/components/sections';
import { SummaryChart } from '@/components/charts/summary-chart';

const benchCategories: BenchCategory[] = [
  {
    id: 'crud',
    name: 'CRUD Operations',
    description: 'Basic Create, Read, Update, Delete operations',
    available: true,
  },
  {
    id: 'complex',
    name: 'Complex Queries',
    description: 'Joins, aggregations, subqueries',
    available: false,
  },
  {
    id: 'transactions',
    name: 'Transactions',
    description: 'Transaction performance and rollback scenarios',
    available: false,
  },
  {
    id: 'relations',
    name: 'Relations',
    description: 'Nested queries and eager loading',
    available: false,
  },
  {
    id: 'batch',
    name: 'Batch Operations',
    description: 'Bulk inserts, updates, and deletes',
    available: false,
  },
];

export default function Home() {
  const { dashboardData, comparisonData, isLoading, error } =
    useBenchmarkData();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const {
    selectedORMs,
    setSelectedORMs,
    selectedCategory,
    setSelectedCategory,
    filteredScenarios,
  } = useFilters(comparisonData?.orms || [], comparisonData?.scenarios || []);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <Loader2 className='h-12 w-12 animate-spin mx-auto text-primary' />
          <p className='mt-4 text-muted-foreground'>
            Loading benchmark data...
          </p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData || !comparisonData) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <p className='text-destructive text-lg font-semibold'>
            Error loading data
          </p>
          <p className='text-muted-foreground mt-2'>
            {error || 'Failed to load benchmark data'}
          </p>
        </div>
      </div>
    );
  }

  const currentScenario = selectedScenario
    ? filteredScenarios.find((s) => s.scenarioId === selectedScenario)
    : null;

  return (
    <div className='w-full min-h-screen flex flex-col justify-center items-center gap-15 pt-20'>
      <Hero />

      <SummaryChart
        data={comparisonData}
        selectedCategory={selectedCategory}
        categories={benchCategories}
        onCategoryChange={setSelectedCategory}
      />
    </div>
  );
}

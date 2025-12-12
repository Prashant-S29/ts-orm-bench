'use client';

import React from 'react';
import { LatencyChart } from '@/components/charts/latency-chart';
import { ThroughputChart } from '@/components/charts/throughput-chart';
import { MemoryChart } from '@/components/charts/memory-chart';
import { LatencyDistributionChart } from '@/components/charts/latency-distribution-chart';
import { ORMResult } from '@/types/benchmark';

interface ChartsSectionProps {
  results: ORMResult[];
  scenarioName: string;
}

export function ChartsSection({ results, scenarioName }: ChartsSectionProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <LatencyChart results={results} title={`${scenarioName} - Latency`} />
        <ThroughputChart
          results={results}
          title={`${scenarioName} - Throughput`}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <MemoryChart
          results={results}
          title={`${scenarioName} - Memory Usage`}
        />
        <div className='flex items-center justify-center border rounded-lg p-8 text-muted-foreground'>
          Additional metrics coming soon
        </div>
      </div>

      <LatencyDistributionChart
        results={results}
        title={`${scenarioName} - Latency Distribution`}
      />
    </div>
  );
}

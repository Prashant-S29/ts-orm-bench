'use client';

import React from 'react';
import { StatsCard } from '@/components/summary/stats-card';
import { BenchmarkSummary } from '@/types/benchmark';
import {
  formatDate,
  formatLatency,
  formatThroughput,
} from '@/lib/format-utils';

interface OverviewStatsProps {
  summary: BenchmarkSummary;
}

export function OverviewStats({ summary }: OverviewStatsProps) {
  const { latency, throughput } = summary.latestResults.topPerformers;

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      <StatsCard
        title='Total Test Runs'
        value={summary.summary.totalRuns.toString()}
        description={`Last run: ${formatDate(summary.summary.lastRunDate)}`}
      />

      <StatsCard
        title='ORMs Tested'
        value={summary.summary.totalORMs.toString()}
        description={`Across ${summary.summary.totalScenarios} scenarios`}
      />

      <StatsCard
        title='Best Latency'
        value={formatLatency(latency.value)}
        description={`${latency.ormName} (median)`}
        badge={{
          text: latency.ormName.toUpperCase(),
          variant: 'default',
        }}
      />

      <StatsCard
        title='Best Throughput'
        value={formatThroughput(throughput.value)}
        description={`${throughput.ormName}`}
        badge={{
          text: throughput.ormName.toUpperCase(),
          variant: 'secondary',
        }}
      />
    </div>
  );
}

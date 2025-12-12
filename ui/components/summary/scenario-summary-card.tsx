'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScenarioComparison } from '@/types/benchmark';
import { formatLatency, formatThroughput } from '@/lib/format-utils';

interface ScenarioSummaryCardProps {
  scenario: ScenarioComparison;
}

export function ScenarioSummaryCard({ scenario }: ScenarioSummaryCardProps) {
  const winner = scenario.results.find(
    (r) => r.ormId === scenario.winner.ormId,
  );
  const winnerLatency = winner?.metrics.latency.median || 0;
  const winnerThroughput = winner?.metrics.throughput.rps || 0;

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg'>{scenario.scenarioName}</CardTitle>
          <Badge variant='outline' className='capitalize'>
            {scenario.category}
          </Badge>
        </div>
        <CardDescription>
          Winner: {winner?.ormName} v{winner?.ormVersion}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <p className='text-muted-foreground'>Latency</p>
            <p className='text-lg font-semibold'>
              {formatLatency(winnerLatency)}
            </p>
          </div>
          <div>
            <p className='text-muted-foreground'>Throughput</p>
            <p className='text-lg font-semibold'>
              {formatThroughput(winnerThroughput)}
            </p>
          </div>
        </div>
        <p className='text-xs text-muted-foreground mt-3'>
          Compared {scenario.results.length} ORM
          {scenario.results.length > 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}

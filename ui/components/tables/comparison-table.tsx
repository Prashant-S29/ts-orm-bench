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
import { ORMResult } from '@/types/benchmark';
import {
  formatLatency,
  formatThroughput,
  formatMemory,
  calculateAverage,
} from '@/lib/format-utils';
import { Trophy } from 'lucide-react';

interface ComparisonTableProps {
  results: ORMResult[];
  scenarioName: string;
}

export function ComparisonTable({
  results,
  scenarioName,
}: ComparisonTableProps) {
  // Find winners
  const latencyWinner = results.reduce((prev, curr) =>
    curr.metrics.latency.median < prev.metrics.latency.median ? curr : prev,
  );

  const throughputWinner = results.reduce((prev, curr) =>
    curr.metrics.throughput.rps > prev.metrics.throughput.rps ? curr : prev,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Comparison - {scenarioName}</CardTitle>
        <CardDescription>
          Performance metrics across all selected ORMs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b'>
                <th className='text-left py-3 px-4 font-medium'>ORM</th>
                <th className='text-right py-3 px-4 font-medium'>
                  Latency (P50)
                </th>
                <th className='text-right py-3 px-4 font-medium'>
                  Latency (P95)
                </th>
                <th className='text-right py-3 px-4 font-medium'>
                  Latency (P99)
                </th>
                <th className='text-right py-3 px-4 font-medium'>Throughput</th>
                <th className='text-right py-3 px-4 font-medium'>Avg Memory</th>
                <th className='text-right py-3 px-4 font-medium'>Errors</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => {
                const avgMemory = calculateAverage(
                  result.metrics.memory.heapUsed,
                );
                const isLatencyWinner = result.ormId === latencyWinner.ormId;
                const isThroughputWinner =
                  result.ormId === throughputWinner.ormId;

                return (
                  <tr key={result.ormId} className='border-b hover:bg-muted/50'>
                    <td className='py-3 px-4'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium capitalize'>
                          {result.ormName}
                        </span>
                        <Badge variant='outline' className='text-xs'>
                          v{result.ormVersion}
                        </Badge>
                      </div>
                    </td>
                    <td className='text-right py-3 px-4'>
                      <div className='flex items-center justify-end gap-1'>
                        {isLatencyWinner && (
                          <Trophy className='h-3 w-3 text-yellow-500' />
                        )}
                        <span
                          className={
                            isLatencyWinner
                              ? 'font-semibold text-green-600'
                              : ''
                          }
                        >
                          {formatLatency(result.metrics.latency.median)}
                        </span>
                      </div>
                    </td>
                    <td className='text-right py-3 px-4'>
                      {formatLatency(result.metrics.latency.p95)}
                    </td>
                    <td className='text-right py-3 px-4'>
                      {formatLatency(result.metrics.latency.p99)}
                    </td>
                    <td className='text-right py-3 px-4'>
                      <div className='flex items-center justify-end gap-1'>
                        {isThroughputWinner && (
                          <Trophy className='h-3 w-3 text-yellow-500' />
                        )}
                        <span
                          className={
                            isThroughputWinner
                              ? 'font-semibold text-green-600'
                              : ''
                          }
                        >
                          {formatThroughput(result.metrics.throughput.rps)}
                        </span>
                      </div>
                    </td>
                    <td className='text-right py-3 px-4'>
                      {avgMemory > 0 ? formatMemory(avgMemory) : 'N/A'}
                    </td>
                    <td className='text-right py-3 px-4'>
                      {result.metrics.errors.count > 0 ? (
                        <Badge variant='destructive'>
                          {result.metrics.errors.count}
                        </Badge>
                      ) : (
                        <span className='text-green-600'>0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

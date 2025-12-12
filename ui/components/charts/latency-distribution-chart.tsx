'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ORMResult } from '@/types/benchmark';
import { prepareLatencyDistributionData } from '@/lib/chart-utils';
import { formatLatency } from '@/lib/format-utils';

interface LatencyDistributionChartProps {
  results: ORMResult[];
  title?: string;
  description?: string;
}

export function LatencyDistributionChart({
  results,
  title,
  description,
}: LatencyDistributionChartProps) {
  const chartData = prepareLatencyDistributionData(results);

  const chartConfig = {
    p50: {
      label: 'P50 (Median)',
      color: 'hsl(var(--chart-1))',
    },
    p95: {
      label: 'P95',
      color: 'hsl(var(--chart-2))',
    },
    p99: {
      label: 'P99',
      color: 'hsl(var(--chart-3))',
    },
    p999: {
      label: 'P99.9',
      color: 'hsl(var(--chart-4))',
    },
  } satisfies ChartConfig;

  return (
    <Card className='col-span-2'>
      <CardHeader>
        <CardTitle>{title || 'Latency Distribution'}</CardTitle>
        <CardDescription>
          {description ||
            'Latency percentiles across selected ORMs (lower is better)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='name'
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}ms`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatLatency(value as number)}
                />
              }
            />
            <Legend />
            <Bar dataKey='p50' fill='var(--color-p50)' radius={4} />
            <Bar dataKey='p95' fill='var(--color-p95)' radius={4} />
            <Bar dataKey='p99' fill='var(--color-p99)' radius={4} />
            <Bar dataKey='p999' fill='var(--color-p999)' radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

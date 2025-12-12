'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
import { prepareLatencyChartData } from '@/lib/chart-utils';
import { formatLatency } from '@/lib/format-utils';

interface LatencyChartProps {
  results: ORMResult[];
  title?: string;
  description?: string;
}

export function LatencyChart({
  results,
  title,
  description,
}: LatencyChartProps) {
  const chartData = prepareLatencyChartData(results, 'median');

  const chartConfig = {
    value: {
      label: 'Latency (ms)',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Latency Comparison'}</CardTitle>
        <CardDescription>
          {description ||
            'Median latency across selected ORMs (lower is better)'}
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
              tickFormatter={(value) => value.split(' ')[0]}
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
            <Bar dataKey='value' fill='var(--color-value)' radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

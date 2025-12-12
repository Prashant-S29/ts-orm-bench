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
import { prepareMemoryChartData } from '@/lib/chart-utils';
import { formatMemory } from '@/lib/format-utils';

interface MemoryChartProps {
  results: ORMResult[];
  title?: string;
  description?: string;
}

export function MemoryChart({ results, title, description }: MemoryChartProps) {
  const chartData = prepareMemoryChartData(results);

  const chartConfig = {
    value: {
      label: 'Memory (MB)',
      color: 'hsl(var(--chart-3))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Memory Usage Comparison'}</CardTitle>
        <CardDescription>
          {description ||
            'Average heap memory usage across selected ORMs (lower is better)'}
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
              tickFormatter={(value) => `${value.toFixed(0)} MB`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => `${(value as number).toFixed(2)} MB`}
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

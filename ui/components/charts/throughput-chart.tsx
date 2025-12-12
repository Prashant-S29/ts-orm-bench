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
import { prepareThroughputChartData } from '@/lib/chart-utils';
import { formatThroughput } from '@/lib/format-utils';

interface ThroughputChartProps {
  results: ORMResult[];
  title?: string;
  description?: string;
}

export function ThroughputChart({
  results,
  title,
  description,
}: ThroughputChartProps) {
  const chartData = prepareThroughputChartData(results);

  const chartConfig = {
    value: {
      label: 'Throughput (req/s)',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || 'Throughput Comparison'}</CardTitle>
        <CardDescription>
          {description ||
            'Requests per second across selected ORMs (higher is better)'}
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
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatThroughput(value as number)}
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

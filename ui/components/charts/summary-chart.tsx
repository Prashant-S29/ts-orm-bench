'use client';

import React, { useState, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ComparisonData, BenchCategory } from '@/types/benchmark';
import { formatLatency } from '@/lib/format-utils';
import { ChevronDown, Eye, Construction } from 'lucide-react';

interface SummaryChartProps {
  data: ComparisonData;
  selectedCategory: string;
  categories: BenchCategory[];
  onCategoryChange: (categoryId: string) => void;
}

type LatencyMetricKey = 'median' | 'p95' | 'p99' | 'p999' | 'mean';

// Define separate types for different metric options
type LatencyMetricOption = {
  value: string;
  label: string;
  type: 'latency';
  key: LatencyMetricKey;
  criteria: string;
};

type NonLatencyMetricOption = {
  value: string;
  label: string;
  type: 'throughput' | 'memory';
  criteria: string;
};

type MetricOption = LatencyMetricOption | NonLatencyMetricOption;

const metricOptions: MetricOption[] = [
  // Latency metrics
  {
    value: 'latency-median',
    label: 'Latency: P50 (Median)',
    type: 'latency',
    key: 'median',
    criteria: 'lower is better',
  },
  {
    value: 'latency-p95',
    label: 'Latency: P95',
    type: 'latency',
    key: 'p95',
    criteria: 'lower is better',
  },
  {
    value: 'latency-p99',
    label: 'Latency: P99',
    type: 'latency',
    key: 'p99',
    criteria: 'lower is better',
  },
  {
    value: 'latency-p999',
    label: 'Latency: P99.9',
    type: 'latency',
    key: 'p999',
    criteria: 'lower is better',
  },
  {
    value: 'latency-mean',
    label: 'Latency: Mean',
    type: 'latency',
    key: 'mean',
    criteria: 'lower is better',
  },
  // Throughput metric
  {
    value: 'throughput',
    label: 'Throughput (RPS)',
    type: 'throughput',
    criteria: 'higher is better',
  },
  // Memory metric
  {
    value: 'memory',
    label: 'Memory Usage (Avg Heap)',
    type: 'memory',
    criteria: 'lower is better',
  },
];

const ORM_COLORS: Record<string, string> = {
  'drizzle-v1.0.0-beta.2': 'hsl(142, 76%, 36%)',
  'prisma-v7.1.0': 'hsl(210, 100%, 50%)',
  'typeorm-v0.3.0': 'hsl(24, 100%, 50%)',
  'mikro-v5.0.0': 'hsl(280, 100%, 50%)',
  'sequelize-v6.0.0': 'hsl(200, 82%, 45%)',
};

// Define bench categories mapping
const BENCH_CATEGORIES = [
  { id: 'crud', label: 'CRUD Bench' },
  { id: 'complex-queries', label: 'Complex Queries Bench' },
  { id: 'transactions', label: 'Transactions Bench' },
  { id: 'relations', label: 'Relations Bench' },
  { id: 'batch-operations', label: 'Batch Operations' },
];

export function SummaryChart({
  data,
  selectedCategory,
  categories,
  onCategoryChange,
}: SummaryChartProps) {
  const [selectedMetric, setSelectedMetric] =
    useState<string>('latency-median');
  const [visibleORMs, setVisibleORMs] = useState<Set<string>>(
    new Set(data.orms.map((orm) => orm.ormId)),
  );

  const toggleORM = (ormId: string) => {
    const newVisible = new Set(visibleORMs);

    if (newVisible.has(ormId) && newVisible.size === 1) {
      return;
    }

    if (newVisible.has(ormId)) {
      newVisible.delete(ormId);
    } else {
      newVisible.add(ormId);
    }
    setVisibleORMs(newVisible);
  };

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const isAvailable = currentCategory?.available ?? false;
  const selectedMetricOption = metricOptions.find(
    (m) => m.value === selectedMetric,
  );

  const chartData = useMemo(() => {
    if (!isAvailable) return [];

    const filteredScenarios = data.scenarios.filter(
      (scenario) => scenario.category === selectedCategory,
    );

    const metricOpt = metricOptions.find((m) => m.value === selectedMetric);
    if (!metricOpt) return [];

    return filteredScenarios.map((scenario) => {
      const dataPoint: Record<string, string | number> = {
        scenario: scenario.scenarioName,
        scenarioId: scenario.scenarioId,
      };

      scenario.results.forEach((result) => {
        if (visibleORMs.has(result.ormId)) {
          let value: number;

          if (metricOpt.type === 'latency') {
            value = result.metrics.latency[metricOpt.key];
          } else if (metricOpt.type === 'throughput') {
            value = result.metrics.throughput.rps;
          } else if (metricOpt.type === 'memory') {
            const heapUsed = result.metrics.memory.heapUsed;
            value =
              heapUsed.length > 0
                ? heapUsed.reduce((sum, val) => sum + val, 0) /
                  heapUsed.length /
                  (1024 * 1024) // Convert to MB
                : 0;
          } else {
            value = 0;
          }

          dataPoint[result.ormId] = value;
        }
      });

      return dataPoint;
    });
  }, [data, selectedCategory, selectedMetric, visibleORMs, isAvailable]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};

    data.orms.forEach((orm) => {
      config[orm.ormId] = {
        label: `${orm.name} v${orm.version}`,
        color: ORM_COLORS[orm.ormId],
      };
    });

    return config;
  }, [data.orms]);

  const visibleCount = visibleORMs.size;

  return (
    <div className='container mx-auto flex flex-col gap-3'>
      <TooltipProvider>
        <div className='flex items-center gap-5'>
          {BENCH_CATEGORIES.map((bench) => {
            const category = categories.find((c) => c.id === bench.id);
            const isDisabled = !category?.available;
            const isSelected = selectedCategory === bench.id;

            const button = (
              <Button
                key={bench.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                size='sm'
                disabled={isDisabled}
                onClick={() => !isDisabled && onCategoryChange(bench.id)}
              >
                {bench.label}
              </Button>
            );

            if (isDisabled) {
              return (
                <Tooltip key={bench.id}>
                  <TooltipTrigger asChild>
                    <span className='h-8 text-sm text-muted-foreground cursor-not-allowed inline-flex items-center px-3'>
                      {bench.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className='bg-secondary text-primary'>
                    <p>Coming Soon</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </TooltipProvider>

      <Card>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>
                {isAvailable
                  ? `${
                      selectedMetricOption?.label || 'Performance'
                    } comparison across all scenarios in ${
                      currentCategory?.name || selectedCategory.toUpperCase()
                    } benchmark. [ ${selectedMetricOption?.criteria} ]`
                  : 'Select a test bench to view performance comparison'}
              </CardDescription>
            </div>

            <div className='flex items-center gap-2'>
              {isAvailable && (
                <>
                  {/* Metric Selector */}
                  <Select
                    value={selectedMetric}
                    onValueChange={(value) => setSelectedMetric(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {metricOptions.map((option, index) => {
                        // Add section headers
                        const showLatencyHeader = index === 0;
                        const showThroughputHeader =
                          option.type === 'throughput' && index > 0;
                        const showMemoryHeader =
                          option.type === 'memory' && index > 0;

                        return (
                          <React.Fragment key={option.value}>
                            {showLatencyHeader && (
                              <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground'>
                                Latency Metrics
                              </div>
                            )}
                            {showThroughputHeader && (
                              <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1'>
                                Throughput
                              </div>
                            )}
                            {showMemoryHeader && (
                              <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-1'>
                                Memory
                              </div>
                            )}
                            <SelectItem
                              value={option.value}
                              className={
                                option.type === 'latency' ? 'pl-6' : ''
                              }
                            >
                              {option.type === 'latency'
                                ? option.label.replace('Latency: ', '')
                                : option.label}
                            </SelectItem>
                          </React.Fragment>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {/* ORM Visibility Toggle */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant='outline' className='gap-2'>
                        <div className='flex items-center '>
                          {data.orms.map((orm) => {
                            if (!visibleORMs.has(orm.ormId)) return null;
                            return (
                              <div
                                key={orm.ormId}
                                className='h-2.5 w-2.5 rounded-full border -ml-1'
                                style={{
                                  backgroundColor:
                                    ORM_COLORS[orm.ormId] || 'hsl(0, 0%, 50%)',
                                }}
                              />
                            );
                          })}
                        </div>
                        ORM(s)
                        <Badge variant='secondary' className='tabular-nums'>
                          {visibleCount}/{data.orms.length}
                        </Badge>
                        <ChevronDown className='h-4 w-4 opacity-50' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-62.5'>
                      <DropdownMenuLabel>Toggle ORMs</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      {data.orms.map((orm) => {
                        const isChecked = visibleORMs.has(orm.ormId);
                        const isLastSelected = isChecked && visibleCount === 1;

                        return (
                          <DropdownMenuCheckboxItem
                            key={orm.ormId}
                            checked={isChecked}
                            onCheckedChange={() => toggleORM(orm.ormId)}
                            disabled={isLastSelected}
                          >
                            <div className='flex items-center gap-2'>
                              <div
                                className='h-3 w-3 rounded-full'
                                style={{
                                  backgroundColor:
                                    ORM_COLORS[orm.ormId] || 'hsl(0, 0%, 50%)',
                                }}
                              />
                              <span className='capitalize'>{orm.name}</span>
                              <Badge
                                variant='outline'
                                className='ml-auto text-xs'
                              >
                                v{orm.version}
                              </Badge>
                            </div>
                          </DropdownMenuCheckboxItem>
                        );
                      })}

                      <DropdownMenuSeparator />
                      <div className='px-2 py-1.5 text-xs text-muted-foreground'>
                        At least one ORM must be selected
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!isAvailable ? (
            <div className='flex items-center justify-center h-100 text-muted-foreground'>
              <div className='text-center'>
                <Construction className='h-16 w-16 mx-auto mb-4 opacity-50' />
                <p className='text-xl font-semibold mb-2'>Coming Soon</p>
                <p className='text-sm'>
                  {currentCategory?.name || 'This test bench'} is currently
                  under development
                </p>
                <p className='text-xs mt-3 text-muted-foreground/70'>
                  {currentCategory?.description}
                </p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className='h-100 w-full'>
              <AreaChart
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <defs>
                  {data.orms.map((orm) => (
                    <linearGradient
                      key={`gradient-${orm.ormId}`}
                      id={`fill-${orm.ormId}`}
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop
                        offset='5%'
                        stopColor={ORM_COLORS[orm.ormId]}
                        stopOpacity={0.5}
                      />
                      <stop
                        offset='90%'
                        stopColor={ORM_COLORS[orm.ormId]}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey='scenario'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const words = value.split(' ');
                    return words[0];
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    if (selectedMetricOption?.type === 'latency') {
                      return `${value.toFixed(1)}ms`;
                    } else if (selectedMetricOption?.type === 'throughput') {
                      return `${value.toFixed(0)}`;
                    } else if (selectedMetricOption?.type === 'memory') {
                      return `${value.toFixed(0)}MB`;
                    }
                    return value.toString();
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.scenario;
                        }
                        return value;
                      }}
                      formatter={(value, name) => {
                        const ormId = name as string;
                        const orm = data.orms.find((o) => o.ormId === ormId);
                        const label = orm
                          ? `${orm.name} v${orm.version}`
                          : name;

                        let formattedValue: string;
                        if (selectedMetricOption?.type === 'latency') {
                          formattedValue = formatLatency(value as number);
                        } else if (
                          selectedMetricOption?.type === 'throughput'
                        ) {
                          formattedValue = `${(value as number).toFixed(
                            2,
                          )} req/s`;
                        } else if (selectedMetricOption?.type === 'memory') {
                          formattedValue = `${(value as number).toFixed(2)} MB`;
                        } else {
                          formattedValue = (value as number).toFixed(2);
                        }

                        return (
                          <>
                            <div
                              className='h-2.5 w-2.5 shrink-0 rounded-[2px]'
                              style={{
                                backgroundColor:
                                  ORM_COLORS[ormId] || 'hsl(0, 0%, 50%)',
                              }}
                            />
                            {label}
                            <div className='ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground'>
                              {formattedValue}
                            </div>
                          </>
                        );
                      }}
                    />
                  }
                  cursor={false}
                />
                <ChartLegend content={<ChartLegendContent />} />

                {data.orms.map((orm) => {
                  if (!visibleORMs.has(orm.ormId)) return null;

                  return (
                    <Area
                      key={orm.ormId}
                      dataKey={orm.ormId}
                      type='monotone'
                      fill={`url(#fill-${orm.ormId})`}
                      stroke={ORM_COLORS[orm.ormId]}
                      strokeWidth={2}
                      stackId={undefined}
                    />
                  );
                })}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

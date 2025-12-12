'use client';

import React from 'react';
import { ScenarioSummaryCard } from '@/components/summary/scenario-summary-card';
import { ScenarioComparison } from '@/types/benchmark';

interface ScenarioGridProps {
  scenarios: ScenarioComparison[];
}

export function ScenarioGrid({ scenarios }: ScenarioGridProps) {
  if (scenarios.length === 0) {
    return (
      <div className='text-center py-12'>
        <p className='text-muted-foreground'>
          No scenarios available for the selected filters
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {scenarios.map((scenario) => (
        <ScenarioSummaryCard key={scenario.scenarioId} scenario={scenario} />
      ))}
    </div>
  );
}

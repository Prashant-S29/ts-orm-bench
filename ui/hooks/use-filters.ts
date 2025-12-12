'use client';

import { useState, useMemo } from 'react';
import { ORMInfo, ScenarioComparison } from '@/types/benchmark';

export function useFilters(
  availableORMs: ORMInfo[],
  allScenarios: ScenarioComparison[],
) {
  const [selectedORMs, setSelectedORMs] = useState<string[]>(
    availableORMs.map((orm) => orm.ormId),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('crud');

  const filteredScenarios = useMemo(() => {
    return allScenarios
      .filter((scenario) => scenario.category === selectedCategory)
      .map((scenario) => ({
        ...scenario,
        results: scenario.results.filter((result) =>
          selectedORMs.includes(result.ormId),
        ),
      }))
      .filter((scenario) => scenario.results.length > 0);
  }, [allScenarios, selectedORMs, selectedCategory]);

  return {
    selectedORMs,
    setSelectedORMs,
    selectedCategory,
    setSelectedCategory,
    filteredScenarios,
  };
}

'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ORMInfo } from '@/types/benchmark';

interface ORMSelectorProps {
  availableORMs: ORMInfo[];
  selectedORMs: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function ORMSelector({
  availableORMs,
  selectedORMs,
  onSelectionChange,
}: ORMSelectorProps) {
  const handleToggle = (ormId: string) => {
    // Prevent deselecting if it's the last one
    if (selectedORMs.includes(ormId) && selectedORMs.length === 1) {
      return; // Do nothing, must keep at least one selected
    }

    const newSelection = selectedORMs.includes(ormId)
      ? selectedORMs.filter((id) => id !== ormId)
      : [...selectedORMs, ormId];

    onSelectionChange(newSelection);
  };

  // const handleSelectAll = () => {
  //   // If all are selected, select only the first one (not none)
  //   if (selectedORMs.length === availableORMs.length) {
  //     onSelectionChange([availableORMs[0].ormId]);
  //   } else {
  //     onSelectionChange(availableORMs.map((orm) => orm.ormId));
  //   }
  // };

  // Group ORMs by name
  const groupedORMs = availableORMs.reduce((acc, orm) => {
    if (!acc[orm.name]) {
      acc[orm.name] = [];
    }
    acc[orm.name].push(orm);
    return acc;
  }, {} as Record<string, ORMInfo[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select ORMs</CardTitle>
        <CardDescription>Choose which ORM versions to compare</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {Object.entries(groupedORMs).map(([ormName, versions]) => (
          <div key={ormName} className='space-y-2'>
            <h4 className='font-semibold text-sm capitalize'>{ormName}</h4>
            <div className='space-y-2 pl-4'>
              {versions.map((orm) => {
                const isChecked = selectedORMs.includes(orm.ormId);
                const isLastSelected = isChecked && selectedORMs.length === 1;

                return (
                  <div key={orm.ormId} className='flex items-center space-x-2'>
                    <Checkbox
                      id={orm.ormId}
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(orm.ormId)}
                      disabled={isLastSelected}
                    />
                    <label
                      htmlFor={orm.ormId}
                      className={`text-sm leading-none ${
                        isLastSelected
                          ? 'cursor-not-allowed opacity-50'
                          : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      }`}
                    >
                      v{orm.version}
                      {isLastSelected && (
                        <span className='ml-2 text-xs text-muted-foreground'>
                          (Required)
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className='pt-2 border-t text-xs text-muted-foreground'>
          At least one ORM must be selected
        </div>
      </CardContent>
    </Card>
  );
}

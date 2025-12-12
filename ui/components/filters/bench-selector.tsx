'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BenchCategory } from '@/types/benchmark';

interface BenchSelectorProps {
  categories: BenchCategory[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function BenchSelector({
  categories,
  selectedCategory,
  onCategoryChange,
}: BenchSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Test Bench</CardTitle>
        <CardDescription>Choose which test category to analyze</CardDescription>
      </CardHeader>
      <CardContent>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select a test bench' />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem
                key={category.id}
                value={category.id}
                disabled={!category.available}
              >
                {category.name} {!category.available && '(Coming Soon)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categories.find((c) => c.id === selectedCategory)?.description && (
          <p className='text-sm text-muted-foreground mt-2'>
            {categories.find((c) => c.id === selectedCategory)?.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

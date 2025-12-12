'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  badge,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {badge && (
          <Badge variant={badge.variant || 'default'}>{badge.text}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {description && (
          <p className='text-xs text-muted-foreground mt-1'>{description}</p>
        )}
        {trend && (
          <div
            className={`flex items-center text-xs mt-2 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUp className='h-3 w-3 mr-1' />
            ) : (
              <ArrowDown className='h-3 w-3 mr-1' />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

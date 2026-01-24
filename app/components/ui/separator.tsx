import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/utils';

interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({
  orientation = 'horizontal',
  className,
  ...props
}: SeparatorProps) {
  return (
    <View
      className={cn(
        'bg-gray-200',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'w-[1px] h-full',
        className
      )}
      {...props}
    />
  );
}

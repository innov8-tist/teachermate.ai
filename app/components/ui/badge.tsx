import React from 'react';
import { Text, View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'flex-row items-center justify-center rounded-full px-3 py-1',
  {
    variants: {
      variant: {
        default: 'bg-[#4FD1C5]',
        secondary: 'bg-gray-100',
        destructive: 'bg-red-500',
        outline: 'border border-gray-300',
        success: 'bg-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-gray-900',
      destructive: 'text-white',
      outline: 'text-gray-700',
      success: 'text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export function Badge({
  children,
  variant,
  className,
  textClassName,
  ...props
}: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {typeof children === 'string' ? (
        <Text className={cn(badgeTextVariants({ variant }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

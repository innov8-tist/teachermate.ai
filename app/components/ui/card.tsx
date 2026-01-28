import React from 'react';
import { View, type ViewProps, Text, type TextProps } from 'react-native';
import { cn } from '@/lib/utils';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

interface CardTextProps extends Omit<TextProps, 'style'> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={cn('bg-white rounded-2xl p-5 border border-gray-100', className)}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={cn('mb-4', className)} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, className, ...props }: CardTextProps) {
  return typeof children === 'string' ? (
    <Text className={cn('text-xl font-semibold text-gray-900', className)} {...props}>
      {children}
    </Text>
  ) : (
    <View className={cn('', className)}>
      {children}
    </View>
  );
}

export function CardDescription({ children, className, ...props }: CardTextProps) {
  return typeof children === 'string' ? (
    <Text className={cn('text-sm text-gray-500 mt-1', className)} {...props}>
      {children}
    </Text>
  ) : (
    <View className={cn('mt-1', className)}>
      {children}
    </View>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <View className={cn('', className)} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <View className={cn('flex-row items-center mt-4', className)} {...props}>
      {children}
    </View>
  );
}

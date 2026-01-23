import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View
      className={`bg-white rounded-3xl p-6 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 15,
        borderWidth: 1,
        borderColor: '#e5e7eb',
      }}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <View className={`flex-row items-center mb-6 ${className}`}>
      {children}
    </View>
  );
}

export function CardTitle({ children, className = '' }: CardProps) {
  return (
    <View className="flex-row items-center">
      <View className="w-1 h-8 bg-black rounded-full mr-3" />
      <View className={className}>
        {children}
      </View>
    </View>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return <View className={className}>{children}</View>;
}

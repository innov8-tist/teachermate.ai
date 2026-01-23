import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const sizeStyles = {
    sm: 'py-2 px-4',
    md: 'py-4 px-6',
    lg: 'py-5 px-8',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        className={`bg-black rounded-2xl ${sizeStyles[size]} items-center justify-center ${className}`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className={`text-white font-black tracking-wide ${textSizeStyles[size]}`}>
            {children}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  const variantStyles = {
    default: 'bg-black',
    outline: 'bg-white border-2 border-black',
    ghost: 'bg-transparent',
  };

  const textVariantStyles = {
    default: 'text-white',
    outline: 'text-black',
    ghost: 'text-black',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`${variantStyles[variant]} rounded-2xl ${sizeStyles[size]} items-center justify-center ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'default' ? '#fff' : '#3b82f6'} />
      ) : (
        <Text className={`${textVariantStyles[variant]} font-bold ${textSizeStyles[size]}`}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

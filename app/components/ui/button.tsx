import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, type TouchableOpacityProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-xl active:opacity-90',
  {
    variants: {
      variant: {
        default: 'bg-[#4FD1C5] shadow-lg shadow-[#4FD1C5]/30',
        destructive: 'bg-red-500 shadow-lg shadow-red-500/30',
        outline: 'border-2 border-[#4FD1C5] bg-transparent',
        secondary: 'bg-gray-100',
        ghost: 'bg-transparent',
        link: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-10 px-4 py-2',
        lg: 'h-14 px-8 py-4',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-semibold text-center', {
  variants: {
    variant: {
      default: 'text-white',
      destructive: 'text-white',
      outline: 'text-[#4FD1C5]',
      secondary: 'text-gray-900',
      ghost: 'text-gray-900',
      link: 'text-[#4FD1C5] underline',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface ButtonProps
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

export function Button({
  children,
  variant,
  size,
  loading = false,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#4FD1C5' : '#fff'} />
      ) : typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }), textClassName)}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

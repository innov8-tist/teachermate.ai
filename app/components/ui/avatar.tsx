import React from 'react';
import { View, Text, Image, type ViewProps, type ImageProps } from 'react-native';
import { cn } from '@/lib/utils';

interface AvatarProps extends ViewProps {
  className?: string;
}

export function Avatar({ className, children, ...props }: AvatarProps) {
  return (
    <View
      className={cn(
        'relative flex h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

interface AvatarImageProps extends ImageProps {
  className?: string;
}

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <Image
      className={cn('h-full w-full', className)}
      {...props}
    />
  );
}

interface AvatarFallbackProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
}

export function AvatarFallback({
  children,
  className,
  ...props
}: AvatarFallbackProps) {
  return (
    <View
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-[#B8E6E1]',
        className
      )}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className="text-lg font-semibold text-gray-900">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

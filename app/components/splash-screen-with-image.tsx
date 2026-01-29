import React, { useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SplashScreenProps {
  onFinish: () => void;
}

/**
 * Alternative Splash Screen with Custom Logo Image
 * 
 * To use this version:
 * 1. Add your logo image to app/assets/images/logo.png
 * 2. Replace the import in index.tsx:
 *    import { SplashScreen } from '@/components/splash-screen-with-image';
 */
export function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Logo animation
    logoScale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });
    logoOpacity.value = withTiming(1, { duration: 600 });

    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Text animation (delayed)
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 600 });
      textTranslateY.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
    }, 400);

    // Finish after 2.5 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value * pulseScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View className="flex-1 bg-white items-center justify-center">
      {/* Logo Container with Image */}
      <Animated.View style={logoAnimatedStyle} className="items-center mb-8">
        <View className="w-32 h-32 bg-gray-100 rounded-full items-center justify-center shadow-2xl overflow-hidden">
          {/* Replace with your logo image */}
          <Image
            source={require('@/assets/images/icon.png')}
            className="w-24 h-24"
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* App Name & Tagline */}
      <Animated.View style={textAnimatedStyle} className="items-center px-8">
        <Text className="text-4xl font-bold text-black mb-3 tracking-tight">
          Teachermate AI
        </Text>
        <Text className="text-lg text-gray-600 text-center font-medium">
          Smart Evaluation, Simplified
        </Text>
      </Animated.View>

      {/* Loading Indicator */}
      <View className="absolute bottom-20">
        <View className="flex-row gap-2">
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
      </View>
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        false
      );
    }, delay);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-2.5 h-2.5 bg-black rounded-full"
    />
  );
}

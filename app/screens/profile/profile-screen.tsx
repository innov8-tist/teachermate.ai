import React from 'react';
import { View, Text } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const ProfileScreen: React.FC = () => {
  return (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>
      <Card>
        <CardContent className="items-center py-8">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarFallback>
              <Text className="text-4xl">👤</Text>
            </AvatarFallback>
          </Avatar>
          <Text className="text-xl font-bold text-gray-900 mb-1">Teacher Name</Text>
          <Badge variant="secondary" className="mb-6">
            <Text>Active</Text>
          </Badge>
          <Separator className="mb-6" />
          <Text className="text-sm text-gray-500 text-center">Profile page coming soon...</Text>
        </CardContent>
      </Card>
    </View>
  );
};

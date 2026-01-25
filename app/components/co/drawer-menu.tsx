import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DrawerMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToMyCOs: () => void;
  onNavigateToStudentSheet: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isVisible,
  onClose,
  onNavigateToMyCOs,
  onNavigateToStudentSheet,
}) => {
  if (!isVisible) return null;

  return (
    <>
      <TouchableOpacity
        className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 z-10"
        activeOpacity={1}
        onPress={onClose}
      />
      <View className="absolute top-0 left-0 bottom-0 w-72 bg-white z-20">
        <View className="bg-[#4FD1C5] py-10 px-5 border-b border-gray-100">
          <Text className="text-xl font-bold text-white">CO Mapper</Text>
        </View>
        <View className="flex-1 pt-2">
          <TouchableOpacity style={styles.drawerItem} onPress={onNavigateToMyCOs}>
            <Text style={styles.drawerItemIcon}>📋</Text>
            <Text style={styles.drawerItemText}>My CO's</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center py-4 px-5 border-b border-gray-50"
            onPress={onNavigateToStudentSheet}
          >
            <Text className="text-2xl mr-4 w-8">📷</Text>
            <Text className="text-base font-medium text-gray-900 flex-1">
              Student Answer Sheet
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  drawerItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    flex: 1,
  },
});

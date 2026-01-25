import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { COCreationScreen } from './co-creation-screen';
import { MyCOsScreen } from './my-cos-screen';
import { CODetailsScreen } from './co-details-screen';
import { StudentSheetScreen } from './student-sheet-screen';

type COSubScreen = 'myCOs' | 'creation' | 'studentSheet' | 'coDetails';

interface COMapperContainerProps {
  onMenuPress: () => void;
  initialSubScreen?: COSubScreen;
  onSubScreenChange?: (subScreen: COSubScreen) => void;
}

export const COMapperContainer: React.FC<COMapperContainerProps> = ({
  onMenuPress,
  initialSubScreen = 'myCOs',
  onSubScreenChange,
}) => {
  const [subScreen, setSubScreen] = useState<COSubScreen>(initialSubScreen);
  const [selectedCOId, setSelectedCOId] = useState<number | null>(null);

  useEffect(() => {
    setSubScreen(initialSubScreen);
  }, [initialSubScreen]);

  const handleSubScreenChange = (newSubScreen: COSubScreen) => {
    setSubScreen(newSubScreen);
    onSubScreenChange?.(newSubScreen);
  };

  const handleCOClick = (coId: number) => {
    setSelectedCOId(coId);
    handleSubScreenChange('coDetails');
  };

  const renderSubScreen = () => {
    switch (subScreen) {
      case 'myCOs':
        return (
          <MyCOsScreen
            onCOClick={handleCOClick}
          />
        );
      case 'creation':
        return <COCreationScreen onSuccess={() => handleSubScreenChange('myCOs')} />;
      case 'coDetails':
        return (
          <CODetailsScreen
            coId={selectedCOId!}
            onBack={() => handleSubScreenChange('myCOs')}
          />
        );
      case 'studentSheet':
        return <StudentSheetScreen />;
      default:
        return (
          <MyCOsScreen
            onCOClick={handleCOClick}
          />
        );
    }
  };

  return <View className="flex-1">{renderSubScreen()}</View>;
};

export { COSubScreen };

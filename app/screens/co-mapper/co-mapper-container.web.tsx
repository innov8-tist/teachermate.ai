import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { COCreationScreen } from './co-creation-screen';
import { MyCOsScreen } from './my-cos-screen';
import { CODetailsScreen } from './co-details-screen';
import { CompletedStudentsScreen } from './completed-students-screen.web';

type COSubScreen = 'myCOs' | 'creation' | 'coDetails' | 'completedStudents';

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
  const [selectedCOName, setSelectedCOName] = useState<string>('');

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

  const handleViewCompletedStudents = (coId: number, coName: string) => {
    setSelectedCOId(coId);
    setSelectedCOName(coName);
    handleSubScreenChange('completedStudents');
  };

  const renderSubScreen = () => {
    switch (subScreen) {
      case 'myCOs':
        return (
          <MyCOsScreen
            onCOClick={handleCOClick}
            onViewCompletedStudents={handleViewCompletedStudents}
          />
        );
      case 'creation':
        return <COCreationScreen onSuccess={() => handleSubScreenChange('myCOs')} />;
      case 'coDetails':
        return (
          <CODetailsScreen
            coId={selectedCOId!}
            onBack={() => handleSubScreenChange('myCOs')}
            onViewCompletedStudents={handleViewCompletedStudents}
          />
        );
      case 'completedStudents':
        return (
          <CompletedStudentsScreen
            subjectId={selectedCOId!}
            subjectName={selectedCOName}
            onBack={() => handleSubScreenChange('myCOs')}
          />
        );
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

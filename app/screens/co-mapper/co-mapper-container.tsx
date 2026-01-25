import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { COCreationScreen } from './co-creation-screen';
import { MyCOsScreen } from './my-cos-screen';
import { CODetailsScreen } from './co-details-screen';
import { StudentSheetScreen } from './student-sheet-screen';
import { CompletedStudentsScreen } from './completed-students-screen';

type COSubScreen = 'myCOs' | 'creation' | 'studentSheet' | 'coDetails' | 'completedStudents';

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
        return <StudentSheetScreen onViewCompletedStudents={handleViewCompletedStudents} />;
      case 'completedStudents':
        return (
          <CompletedStudentsScreen
            subjectId={selectedCOId!}
            subjectName={selectedCOName}
            onBack={() => handleSubScreenChange('studentSheet')}
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

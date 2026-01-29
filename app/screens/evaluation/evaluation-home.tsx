import React from 'react';
import { EvaluationContainer } from './evaluation-container';

interface EvaluationHomeProps {
  onViewDetails: (evaluationId: number) => void;
}

export const EvaluationHome: React.FC<EvaluationHomeProps> = ({ onViewDetails }) => {
  return <EvaluationContainer onViewDetails={onViewDetails} />;
};
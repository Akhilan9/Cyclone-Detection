import React from 'react';

interface StageBadgeProps {
  stage?: string | null;
  className?: string;
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, className = '' }) => {
  if (!stage) return <span className={`badge badge-d ${className}`}>Unknown</span>;

  let badgeClass = 'badge-d';
  if (stage.includes('Super')) {
    badgeClass = 'badge-sucs';
  } else if (stage.includes('Extremely Severe')) {
    badgeClass = 'badge-escs';
  } else if (stage.includes('Very Severe')) {
    badgeClass = 'badge-vscs';
  } else if (stage.includes('Severe')) {
    badgeClass = 'badge-scs';
  } else if (stage.includes('Cyclonic Storm')) {
    badgeClass = 'badge-cs';
  } else if (stage.includes('Deep Depression')) {
    badgeClass = 'badge-dd';
  }

  return <span className={`badge ${badgeClass} ${className}`}>{stage}</span>;
};

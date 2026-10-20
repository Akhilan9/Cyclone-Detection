import React from 'react';

interface StageBadgeProps {
  stage?: string | null;
  className?: string;
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, className = '' }) => {
  if (!stage) return <span className={`badge badge-d ${className}`}>Unknown</span>;

  let badgeClass = 'badge-d';
  const s = stage.toLowerCase();

  if (s.includes('super') || s.includes('cat 5') || s.includes('category 5')) {
    badgeClass = 'badge-sucs';
  } else if (s.includes('extremely') || s.includes('cat 4') || s.includes('category 4')) {
    badgeClass = 'badge-escs';
  } else if (s.includes('very severe') || s.includes('cat 3') || s.includes('category 3') || s.includes('major hurricane')) {
    badgeClass = 'badge-vscs';
  } else if (s.includes('severe') || s.includes('cat 2') || s.includes('category 2') || s.includes('typhoon')) {
    badgeClass = 'badge-scs';
  } else if (s.includes('cyclonic storm') || s.includes('cat 1') || s.includes('category 1') || s.includes('tropical storm')) {
    badgeClass = 'badge-cs';
  } else if (s.includes('deep depression')) {
    badgeClass = 'badge-dd';
  }

  return <span className={`badge ${badgeClass} ${className}`}>{stage}</span>;
};

import React, { useState } from 'react';
import { Navbar, NavTab } from './components/layout/Navbar';
import { IntelligenceDashboard } from './pages/IntelligenceDashboard';
import { CycloneComparatorPage } from './pages/CycloneComparatorPage';
import { CustomInferencePage } from './pages/CustomInferencePage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <IntelligenceDashboard />;
      case 'comparator':
        return <CycloneComparatorPage />;
      case 'custom_inference':
        return <CustomInferencePage />;
      case 'evaluation':
        return <EvaluationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'sources':
        return <DataSourcesPage />;
      default:
        return <IntelligenceDashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
      <main className="app-main-container">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;


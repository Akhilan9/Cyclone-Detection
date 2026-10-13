import React, { useState } from 'react';
import { Navbar, NavTab } from './components/layout/Navbar';
import { IntelligenceDashboard } from './pages/IntelligenceDashboard';
import { EvaluationPage } from './pages/EvaluationPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <IntelligenceDashboard />;
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
      <main
        style={{
          flex: 1,
          padding: '24px 28px',
          maxWidth: '1480px',
          margin: '0 auto',
          width: '100%',
          overflowY: 'auto',
        }}
      >
        {renderContent()}
      </main>
    </div>
  );
};

export default App;


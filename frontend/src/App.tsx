import React, { useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { MapPage } from './pages/MapPage';
import { IntensityPage } from './pages/IntensityPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ReportsPage } from './pages/ReportsPage';
import { DataSourcesPage } from './pages/DataSourcesPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedCycloneIdForAnalysis, setSelectedCycloneIdForAnalysis] = useState<string | undefined>(undefined);

  const handleNavigateToAnalysis = (cycloneId?: string) => {
    if (cycloneId) setSelectedCycloneIdForAnalysis(cycloneId);
    setCurrentTab('analysis');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <OverviewPage
            onNavigateToAnalysis={handleNavigateToAnalysis}
            onNavigateToMap={() => setCurrentTab('map')}
          />
        );
      case 'analysis':
        return (
          <AnalysisPage
            initialCycloneId={selectedCycloneIdForAnalysis}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        );
      case 'map':
        return <MapPage />;
      case 'intensity':
        return <IntensityPage />;
      case 'evaluation':
        return <EvaluationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'sources':
        return <DataSourcesPage />;
      default:
        return <OverviewPage onNavigateToAnalysis={handleNavigateToAnalysis} onNavigateToMap={() => setCurrentTab('map')} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <main
          style={{
            flex: 1,
            padding: '24px 32px',
            maxWidth: '1440px',
            margin: '0 auto',
            width: '100%',
            overflowY: 'auto',
          }}
        >
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/common';
import {
  Dashboard,
  NewProject,
  Hypotheses,
  Experiments,
  Sessions,
  Agent,
  Memos,
  PRD,
  Metrics,
  Documents,
  Settings,
} from './pages';
import { useInitialize } from './hooks/useInitialize';
import { Loader2, AlertCircle, WifiOff } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">データを読み込んでいます...</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">読み込みエラー</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm text-yellow-800">
        <WifiOff className="w-4 h-4" />
        <span>オフラインモード: データはブラウザに保存されます</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { initialized, loading, error, serverAvailable } = useInitialize();

  if (loading) {
    return <LoadingScreen />;
  }

  if (error && !initialized) {
    return <ErrorScreen message={error} />;
  }

  return (
    <BrowserRouter>
      {!serverAvailable && initialized && <OfflineBanner />}
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects/new" element={<NewProject />} />
          <Route path="/hypotheses" element={<Hypotheses />} />
          <Route path="/experiments" element={<Experiments />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/memos" element={<Memos />} />
          <Route path="/prd" element={<PRD />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

function App() {
  return <AppContent />;
}

export default App;

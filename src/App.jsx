import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PipelineProvider, usePipelines } from './context/PipelineContext';
import { WorkflowProvider } from './context/WorkflowContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HistoricalDataUpload from './pages/HistoricalDataUpload';
import AiRiskPrediction from './pages/AiRiskPrediction';
import PipelineRiskDetails from './pages/PipelineRiskDetails';
import MaintenanceRecommendations from './pages/MaintenanceRecommendations';
import WorkOrders from './pages/WorkOrders';
import Inspections from './pages/Inspections';
import MaintenanceHistory from './pages/MaintenanceHistory';
import UpdatePipelineRegistry from './pages/UpdatePipelineRegistry';

// Layout wrapper for authenticated pages
function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 transition-all">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[11px] text-slate-500">
          <span>AI Pipeline Risk Assessment System · Municipal Water Infrastructure</span>
          <span className="hidden sm:inline">Municipal Water Infrastructure Surveillance Division</span>
        </footer>
      </div>
    </div>
  );
}

// Protected Route Guard with Loading State
function ProtectedRoute({ children }) {
  const { isAuthenticated, authLoading } = usePipelines();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  return (
    <PipelineProvider>
      <WorkflowProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Application Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pipeline-data" element={<ProtectedRoute><HistoricalDataUpload /></ProtectedRoute>} />
            <Route path="/ai-risk-prediction" element={<ProtectedRoute><AiRiskPrediction /></ProtectedRoute>} />
            <Route path="/pipeline/:id" element={<ProtectedRoute><PipelineRiskDetails /></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><MaintenanceRecommendations /></ProtectedRoute>} />
            <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
            <Route path="/inspections" element={<ProtectedRoute><Inspections /></ProtectedRoute>} />
            <Route path="/maintenance-history" element={<ProtectedRoute><MaintenanceHistory /></ProtectedRoute>} />
            <Route path="/update-pipeline" element={<ProtectedRoute><UpdatePipelineRegistry /></ProtectedRoute>} />

            {/* Root and Fallback redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkflowProvider>
    </PipelineProvider>
  );
}

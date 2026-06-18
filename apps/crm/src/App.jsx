import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/Layout';
import Clientes from '@/pages/Clientes';
import Eventos from '@/pages/Eventos';
import Leads from '@/pages/Leads';
import Dashboard from '@/pages/Dashboard';

const CrmRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Eventos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <CrmRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App

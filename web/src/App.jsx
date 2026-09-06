import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CookieBanner from './components/CookieBanner.jsx';
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import DeparturePage from './pages/DeparturePage.jsx';
import RoutesPage from './pages/RoutesPage.jsx';
import RoutePage from './pages/RoutePage.jsx';
import ProposalsPage from './pages/ProposalsPage.jsx';
import ProposalDetailPage from './pages/ProposalDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TripsPage from './pages/TripsPage.jsx';
import TripHubPage from './pages/TripHubPage.jsx';
import OperatorPage from './pages/OperatorPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import AgentPage from './pages/AgentPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/departures/:id" element={<DeparturePage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/:slug" element={<RoutePage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/proposals/:id" element={<ProposalDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account/trips" element={<TripsPage />} />
          <Route path="/account/trips/:id" element={<TripHubPage />} />
          <Route path="/operator" element={<OperatorPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/en/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}

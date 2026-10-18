import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AdsProvider } from "./campaigns/adsStore";
import { StoreProvider } from "./lib/store";
import { Analytics } from "./pages/Analytics";
import { CampaignWizard } from "./pages/campaigns/CampaignWizard";
import { CampaignsPage } from "./pages/campaigns/CampaignsPage";
import { Dashboard } from "./pages/Dashboard";
import { SmartlinkPublic } from "./pages/SmartlinkPublic";
import { Smartlinks } from "./pages/Smartlinks";

function Layout() {
  return (
    <div className="shell">
      <div className="bg-blobs" aria-hidden="true">
        <span /><span /><span />
      </div>
      <nav className="nav">
        <Link to="/dashboard" className="brand">
          <span className="brand__mark" aria-hidden="true" />TrackScale
        </Link>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/smartlinks">Smartlinks</NavLink>
        <NavLink to="/campaigns" end={false}>Campanhas</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
      </nav>
      <main className="page page--wide">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider>
      <AdsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/s/:slug" element={<SmartlinkPublic />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/smartlinks" element={<Smartlinks />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/new" element={<CampaignWizard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={<h1>Página não encontrada</h1>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AdsProvider>
    </StoreProvider>
  );
}

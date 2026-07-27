import { Navigate, Route, Routes } from 'react-router-dom';
import { FirProvider } from './FirContext';
import { FirList } from './pages/FirList';
import { FirNew } from './pages/FirNew';
import { FirDetail } from './pages/FirDetail';
import { PublishedFirList } from './pages/PublishedFirList';
import { PublishedFirReader } from './pages/PublishedFirReader';

/** FIR is retrospective explainability over tech-log evidence: pages read the
 * tech-log state (defects, cards, labor, personnel) to derive SYSTEM timelines.
 * That state comes from the single TechLogProvider hoisted above <Router> in App.tsx — this file
 * used to mount its own, so navigating /fir <-> /tech-log unmounted and re-hydrated the whole
 * store, which is how a just-signed record could be lost (TL-26). */
export default function FirRoutes({
  userRole,
  additionalRoles = [],
}: {
  userRole?: string;
  additionalRoles?: string[];
}) {
  return (
      <FirProvider>
        <Routes>
          <Route path="/" element={<FirList userRole={userRole} additionalRoles={additionalRoles} />} />
          <Route path="new" element={<FirNew />} />
          {/* Published reader is open to all employees (roles-only). Declared before
              the :id route so "published" isn't captured as a FIR id. */}
          <Route path="published" element={<PublishedFirList />} />
          <Route path="published/:id" element={<PublishedFirReader />} />
          <Route path=":id" element={<FirDetail userRole={userRole} additionalRoles={additionalRoles} />} />
          <Route path="*" element={<Navigate to="/fir" replace />} />
        </Routes>
      </FirProvider>
  );
}

// `/people` — the register lives at the top level, not under `/trips`, because a person is not a
// property of a trip. Same provider as the trips module: the register is loaded from storage on
// mount and written on every change, so the two routes always read the same list.

import { Route, Routes } from 'react-router-dom';
import { TripsProvider } from './TripsContext';
import PeoplePage from './pages/PeoplePage';
import PersonPage from './pages/PersonPage';

export default function PeopleRoutes({ userRole, additionalRoles = [] }: { userRole: string; additionalRoles?: string[] }) {
  return (
    <TripsProvider userRole={userRole} additionalRoles={additionalRoles}>
      <Routes>
        <Route path="/" element={<PeoplePage />} />
        <Route path=":id" element={<PersonPage />} />
      </Routes>
    </TripsProvider>
  );
}

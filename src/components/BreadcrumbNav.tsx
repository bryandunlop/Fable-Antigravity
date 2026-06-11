import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { matchEntry, entriesForRoles, DOMAIN_LABELS } from '../navigation/navConfig';

interface BreadcrumbNavProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function BreadcrumbNav({ userRole, additionalRoles = [] }: BreadcrumbNavProps) {
  const location = useLocation();

  if (location.pathname === '/') return null;
  const entry =
    matchEntry(location.pathname, entriesForRoles(userRole, additionalRoles)) ??
    matchEntry(location.pathname);
  if (!entry) return null;

  const onDetailPage = location.pathname !== entry.path && Boolean(entry.detailLabel);

  return (
    <nav className="flex items-center flex-wrap gap-x-1 gap-y-2 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1.5">
        <Home className="w-4 h-4" />
        Home
      </Link>
      <ChevronRight className="w-4 h-4 flex-shrink-0" />
      <span>{DOMAIN_LABELS[entry.domain]}</span>
      <ChevronRight className="w-4 h-4 flex-shrink-0" />
      {onDetailPage ? (
        <>
          <Link to={entry.path} className="hover:text-foreground transition-colors">
            {entry.label}
          </Link>
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
          <span className="text-foreground font-medium">{entry.detailLabel}</span>
        </>
      ) : (
        <span className="text-foreground font-medium">{entry.label}</span>
      )}
    </nav>
  );
}

import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { matchEntry, entriesForRoles, DOMAIN_LABELS } from '../navigation/navConfig';

interface BreadcrumbNavProps {
  userRole: string;
  additionalRoles?: string[];
}

export default function BreadcrumbNav({ userRole, additionalRoles = [] }: BreadcrumbNavProps) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/') return null;
  // Role scoping only disambiguates same-path label variants — it must never
  // win with a less specific (shorter-prefix) match than the global lookup.
  const global = matchEntry(pathname);
  const scoped = matchEntry(pathname, entriesForRoles(userRole, additionalRoles));
  const entry = scoped?.path === global?.path ? scoped : global;
  if (!entry) return null;

  const onSubPath = pathname !== entry.path;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-x-1 gap-y-2 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1.5">
        <Home className="w-4 h-4" aria-hidden="true" />
        Home
      </Link>
      <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{DOMAIN_LABELS[entry.domain]}</span>
      <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {onSubPath ? (
        <>
          <Link to={entry.path} className="hover:text-foreground transition-colors">
            {entry.label}
          </Link>
          {entry.detailLabel && (
            <>
              <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span aria-current="page" className="text-foreground font-medium">{entry.detailLabel}</span>
            </>
          )}
        </>
      ) : (
        <span aria-current="page" className="text-foreground font-medium">{entry.label}</span>
      )}
    </nav>
  );
}

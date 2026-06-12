import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        No page exists at{' '}
        <code className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded break-all">{location.pathname}</code>
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

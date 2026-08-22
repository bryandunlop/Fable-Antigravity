import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User, Shield, Briefcase, Wrench, Users } from 'lucide-react';

import { SYSTEM_USERS, ROLE_CATEGORIES, ADDITIONAL_ROLES } from '../lib/mockUsers';

interface LoginScreenProps {
  onLogin: (role: string, additionalRoles: string[]) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [role, setRole] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role) {
      const user = SYSTEM_USERS.find(u => u.roles.includes(role));
      const additionalRoles = user ? user.roles.filter(r => r !== role) : [];
      onLogin(role, additionalRoles);
    }
  };



  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-gfo-midnight p-4">
      {/* Brand circle motif — opaque, bleeding off the edges, non-overlapping */}
      <div aria-hidden="true" className="absolute -left-40 -bottom-48 h-[28rem] w-[28rem] rounded-full bg-gfo-daylight" />
      <div aria-hidden="true" className="absolute -right-28 -top-32 h-72 w-72 rounded-full bg-gfo-sunrise" />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Global Flight Operations</CardTitle>
          <CardDescription>Sign in to access your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="role" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Your Role</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="h-14 text-base bg-muted/50 border-border hover:bg-muted transition-colors rounded-xl">
                  <SelectValue placeholder="Choose your role to access the system" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 max-h-[500px]">
                  {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase bg-muted/30">
                        {category}
                      </div>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value} className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-gfo-daylight"></div>
                            <span className="font-medium">{role.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                  
                  <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase bg-muted/30">
                    Additional & Special Roles
                  </div>
                  {ADDITIONAL_ROLES.map(role => (
                    <SelectItem key={role.id} value={role.id} className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 bg-muted-foreground/50 rounded-full"></div>
                        <span className="font-medium">{role.label}</span>
                      </div>
                    </SelectItem>
                  ))}

                  <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase bg-muted/30">
                    System Views
                  </div>
                  {/* 'Maintenance Workflow (AviaSync)' persona removed — duplicate eTechLog; canonical surface is the Tech Log module. See docs/CANONICAL_MAINTENANCE_SURFACE.md */}
                  <SelectItem value="passenger" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-gfo-daylight rounded-full"></div>
                      <span className="font-medium">Passenger (Mobile App)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lobby-display" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-gfo-daylight rounded-full"></div>
                      <span className="font-medium">Lobby Display</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>



            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all" size="lg">
              Access Dashboard
            </Button>
          </form>
        </CardContent>
        <div className="px-6 pb-6 text-center text-xs text-muted-foreground/60 w-full space-y-4">
          <p className="text-sm text-muted-foreground">
            Select your role to access the Flight Operations Management System
          </p>
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground/70">
              {/* The quiet door to /ops — the Work Ledger window (design §7). */}
              Created by{' '}
              <Link to="/ops" className="font-medium text-foreground transition-colors hover:text-gfo-sunrise-deep dark:hover:text-gfo-sunrise">
                Bryan Dunlop
              </Link>
              {/* And the quiet door to /worklog. Same posture as /ops: personal
                  project plumbing, not product, so it lives on the login screen
                  rather than anywhere in the authenticated app.

                  It is here because "no link anywhere" turned out to have a
                  cost. Anything that lands on / — a home-screen icon made
                  before the scoped manifest existed, an SSO round trip that
                  drops the path — bounces to this screen, and from here the
                  only way back to the log was to retype the URL. */}
              <span aria-hidden className="mx-1.5 opacity-40">·</span>
              <Link
                to="/worklog"
                className="font-medium text-foreground transition-colors hover:text-gfo-sunrise-deep dark:hover:text-gfo-sunrise"
              >
                Hours
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

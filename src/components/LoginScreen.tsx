import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plane, User, Shield, Briefcase, Wrench, Users } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Plane className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>Flight Operations</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="role" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Select Your Role</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="h-14 text-base bg-muted/50 border-input hover:bg-muted transition-colors rounded-xl">
                  <SelectValue placeholder="Choose your role to access the system" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50 shadow-2xl max-h-[500px]">
                  {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase bg-muted/30">
                        {category}
                      </div>
                      {roles.map(role => (
                        <SelectItem key={role.value} value={role.value} className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                              category === 'Flight Operations' ? 'bg-blue-500 shadow-blue-500/50' :
                              category === 'Cabin' ? 'bg-cyan-500 shadow-cyan-500/50' :
                              category === 'Maintenance' ? 'bg-orange-500 shadow-orange-500/50' :
                              category === 'Safety' ? 'bg-red-500 shadow-red-500/50' :
                              'bg-purple-500 shadow-purple-500/50'
                            }`}></div>
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
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
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
                      <div className="w-2.5 h-2.5 bg-sky-500 rounded-full"></div>
                      <span className="font-medium">Passenger (Mobile App)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lobby-display" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full"></div>
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
              Created by <span className="font-medium text-foreground">Bryan Dunlop</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plane } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (role: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [role, setRole] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role) {
      onLogin(role);
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
                <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                  <SelectItem value="pilot" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                      <span className="font-medium">Pilot</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="inflight" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                      <span className="font-medium">Flight Attendant</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                      <span className="font-medium">Maintenance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance-workflow" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
                      <span className="font-medium">Maintenance Workflow (AviaSync)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduling" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                      <span className="font-medium">Scheduling</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="safety" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                      <span className="font-medium">Safety</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="document-manager" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                      <span className="font-medium">Document Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dms-manager" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-amber-600 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.6)]"></div>
                      <span className="font-medium">DMS Manager</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin-assistant" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.6)]"></div>
                      <span className="font-medium">Administrative Assistant</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lead" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                      <span className="font-medium">Lead Team</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-gray-500 rounded-full shadow-[0_0_8px_rgba(107,114,128,0.6)]"></div>
                      <span className="font-medium">Administrator</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="passenger" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-sky-500 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                      <span className="font-medium">Passenger (Mobile App)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lobby-display" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                      <span className="font-medium">Lobby Display</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tax" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                      <span className="font-medium">Tax Analyst</span>
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

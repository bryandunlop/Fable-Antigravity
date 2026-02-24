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
            <div className="space-y-2">
              <Label htmlFor="role">Select Your Role</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose your role to access the system" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilot">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Pilot
                    </div>
                  </SelectItem>
                  <SelectItem value="inflight">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Inflight Crew
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Maintenance
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance-workflow">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      Maintenance Workflow (AviaSync)
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduling">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Scheduling
                    </div>
                  </SelectItem>
                  <SelectItem value="safety">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      Safety
                    </div>
                  </SelectItem>
                  <SelectItem value="document-manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Document Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="dms-manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
                      DMS Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="admin-assistant">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                      Administrative Assistant
                    </div>
                  </SelectItem>
                  <SelectItem value="lead">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      Lead Team
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      Administrator
                    </div>
                  </SelectItem>
                  <SelectItem value="passenger">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                      Passenger (Mobile App)
                    </div>
                  </SelectItem>
                  <SelectItem value="lobby-display">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      Lobby Display
                    </div>
                  </SelectItem>
                  <SelectItem value="tax">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      Tax Analyst
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-12 btn-aviation-primary"
              disabled={!role}
            >
              Access System
            </Button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Select your role to access the Flight Operations Management System
            </p>
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground/70">
                Created by <span className="font-medium text-muted-foreground">Bryan Dunlop</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

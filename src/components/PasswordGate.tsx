import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lock } from 'lucide-react';

const UNLOCK_KEY = 'mygfo_demo_unlocked';
const DEMO_PASSWORD = 'mygfo';

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(UNLOCK_KEY) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEMO_PASSWORD) {
      localStorage.setItem(UNLOCK_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-gfo-midnight p-4">
      {/* Brand circle motif — opaque, bleeding off the edges, non-overlapping */}
      <div aria-hidden="true" className="absolute -left-40 -bottom-48 h-[28rem] w-[28rem] rounded-full bg-gfo-daylight" />
      <div aria-hidden="true" className="absolute -right-28 -top-32 h-72 w-72 rounded-full bg-gfo-sunrise" />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary rounded-full">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle>Global Flight Operations</CardTitle>
          <CardDescription>Enter the demo password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                placeholder="Password"
                className="h-14 text-base bg-muted/50 border-input rounded-xl"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">Incorrect password. Try again.</p>
              )}
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-bold rounded-xl shadow-lg transition-all" size="lg">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

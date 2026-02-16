import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, Plane, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';

const SESSION_TYPES = {
  'quick-turn': { name: 'Quick Turn', duration: '30 min', description: 'Essential cleaning between flights' },
  'overnight': { name: 'Overnight Clean', duration: '2 hrs', description: 'Comprehensive cleaning including exterior' },
  'deep-clean': { name: 'Deep Clean', duration: '4 hrs', description: 'Detailed cleaning of all areas' },
  'detailing': { name: 'Full Detailing', duration: '8 hrs', description: 'Complete detailing and restoration' }
};

const MOCK_AIRCRAFT = [
  { id: 'ac1', tailNumber: 'N650GX', type: 'Gulfstream G650', status: 'Available' },
  { id: 'ac2', tailNumber: 'N650ER', type: 'Gulfstream G650ER', status: 'Available' },
  { id: 'ac3', tailNumber: 'N650EX', type: 'Gulfstream G650', status: 'Available' },
  { id: 'ac4', tailNumber: 'N650GS', type: 'Gulfstream G650', status: 'Available' }
];

export default function NewCleaningWorkflow() {
  const navigate = useNavigate();
  const [currentUser] = useState('Sarah Johnson'); // Would come from auth
  const [selectedAircraft, setSelectedAircraft] = useState('');
  const [sessionType, setSessionType] = useState<keyof typeof SESSION_TYPES | ''>('');
  const [scheduledTime, setScheduledTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAircraft || !sessionType) {
      toast.error('Please select aircraft and session type');
      return;
    }

    // In production, this would create a new workflow in the database
    const workflowId = Math.random().toString(36).substring(7);
    
    toast.success('Cleaning workflow initiated!', {
      description: `Workflow created for ${MOCK_AIRCRAFT.find(a => a.id === selectedAircraft)?.tailNumber}`
    });

    // Navigate to the workflow page
    navigate(`/aircraft-cleaning/workflow/${workflowId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/aircraft-cleaning')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-500" />
              New Cleaning Workflow
            </h1>
            <p className="text-muted-foreground mt-1">
              Initiate a new aircraft cleaning session
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
            <CardDescription>Select the aircraft and type of cleaning to perform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Aircraft Selection */}
              <div className="space-y-2">
                <Label>Aircraft</Label>
                <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aircraft" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_AIRCRAFT.map(aircraft => (
                      <SelectItem key={aircraft.id} value={aircraft.id}>
                        <div className="flex items-center gap-2">
                          <Plane className="w-4 h-4" />
                          {aircraft.tailNumber} - {aircraft.type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Type */}
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select value={sessionType} onValueChange={(value) => setSessionType(value as keyof typeof SESSION_TYPES)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SESSION_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{type.name}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {type.duration}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Time (Optional) */}
              <div className="space-y-2">
                <Label>Scheduled Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to start immediately
                </p>
              </div>

              {/* Session Info Preview */}
              {sessionType && selectedAircraft && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <p className="font-medium text-blue-900">Session Summary</p>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>
                      <span className="font-medium">Aircraft:</span>{' '}
                      {MOCK_AIRCRAFT.find(a => a.id === selectedAircraft)?.tailNumber}
                    </p>
                    <p>
                      <span className="font-medium">Type:</span>{' '}
                      {SESSION_TYPES[sessionType].name}
                    </p>
                    <p>
                      <span className="font-medium">Estimated Duration:</span>{' '}
                      {SESSION_TYPES[sessionType].duration}
                    </p>
                    <p>
                      <span className="font-medium">Initiated By:</span>{' '}
                      {currentUser}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/aircraft-cleaning')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!selectedAircraft || !sessionType}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start Workflow
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

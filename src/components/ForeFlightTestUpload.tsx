import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Plane,
  MapPin,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useForeFlightConfig, useForeFlightFlightPlans } from './hooks/useForeFlight';
import { createRealForeFlightClient } from '../utils/foreflight/realClient';
import { toast } from 'sonner';

export default function ForeFlightTestUpload() {
  const { config } = useForeFlightConfig();
  const { flightPlans, fetchFlightPlans, loading: loadingFlightPlans } = useForeFlightFlightPlans();
  
  const [departurePdf, setDeparturePdf] = useState<File | null>(null);
  const [destinationPdf, setDestinationPdf] = useState<File | null>(null);
  const [selectedFlightPlan, setSelectedFlightPlan] = useState<string>('');
  const [customFlightId, setCustomFlightId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  const isConfigured = config.apiKey && config.accountUuid;

  const handleLoadFlightPlans = async () => {
    await fetchFlightPlans({
      limit: 20
    });
  };

  const handleFileSelect = (type: 'departure' | 'destination', file: File | null) => {
    if (file && file.type !== 'application/pdf') {
      toast.error('Invalid file type', {
        description: 'Please select a PDF file'
      });
      return;
    }

    if (type === 'departure') {
      setDeparturePdf(file);
    } else {
      setDestinationPdf(file);
    }
  };

  const handleTestUpload = async () => {
    if (!isConfigured) {
      toast.error('Not configured', {
        description: 'Please configure ForeFlight credentials first'
      });
      return;
    }

    const flightId = selectedFlightPlan || customFlightId;
    
    if (!flightId) {
      toast.error('Missing flight plan ID', {
        description: 'Select a flight plan or enter a custom ID'
      });
      return;
    }

    if (!departurePdf && !destinationPdf) {
      toast.error('No files selected', {
        description: 'Please select at least one PDF to upload'
      });
      return;
    }

    setUploading(true);
    setUploadResults([]);
    const results: any[] = [];

    try {
      const client = createRealForeFlightClient(config.apiKey, config.accountUuid);

      // Upload departure evaluation
      if (departurePdf) {
        console.log('[Test Upload] Uploading departure evaluation:', departurePdf.name);
        
        const departureResult = await client.uploadFile(departurePdf, {
          flightObjectId: flightId,
          category: 'Airport',
          displayName: `Departure Airport Evaluation - ${departurePdf.name}`
        });

        results.push({
          type: 'Departure',
          fileName: departurePdf.name,
          success: departureResult.success,
          data: departureResult.data,
          error: departureResult.error
        });

        if (departureResult.success) {
          toast.success('Departure evaluation uploaded!', {
            description: `File: ${departurePdf.name}`
          });
        } else {
          toast.error('Departure upload failed', {
            description: departureResult.error?.message
          });
        }
      }

      // Upload destination evaluation
      if (destinationPdf) {
        console.log('[Test Upload] Uploading destination evaluation:', destinationPdf.name);
        
        const destinationResult = await client.uploadFile(destinationPdf, {
          flightObjectId: flightId,
          category: 'Airport',
          displayName: `Destination Airport Evaluation - ${destinationPdf.name}`
        });

        results.push({
          type: 'Destination',
          fileName: destinationPdf.name,
          success: destinationResult.success,
          data: destinationResult.data,
          error: destinationResult.error
        });

        if (destinationResult.success) {
          toast.success('Destination evaluation uploaded!', {
            description: `File: ${destinationPdf.name}`
          });
        } else {
          toast.error('Destination upload failed', {
            description: destinationResult.error?.message
          });
        }
      }

      setUploadResults(results);

      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        toast.success(`Upload complete!`, {
          description: `${successCount} file(s) uploaded successfully`
        });
      }

    } catch (error) {
      console.error('[Test Upload] Upload failed:', error);
      toast.error('Upload failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="flex items-center gap-3">
          <Upload className="w-8 h-8 text-blue-600" />
          ForeFlight Test Upload
        </h1>
        <p className="text-gray-600 mt-2">
          Test uploading airport evaluation PDFs to ForeFlight API
        </p>
      </div>

      {/* Configuration Status */}
      <Alert variant={isConfigured ? 'default' : 'destructive'}>
        {isConfigured ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>
              ForeFlight API configured and ready. Using account: {config.accountUuid?.substring(0, 8)}...
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              ForeFlight API not configured. Please configure credentials in ForeFlight Settings first.
            </AlertDescription>
          </>
        )}
      </Alert>

      {/* Flight Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Step 1: Select Flight Plan
          </CardTitle>
          <CardDescription>
            Choose an existing flight plan or enter a custom flight object ID
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleLoadFlightPlans}
              disabled={loadingFlightPlans || !isConfigured}
              className="flex-shrink-0"
            >
              {loadingFlightPlans ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Load Flight Plans
            </Button>
            {flightPlans.length > 0 && (
              <Badge variant="secondary">
                {flightPlans.length} plans loaded
              </Badge>
            )}
          </div>

          {flightPlans.length > 0 && (
            <div className="space-y-2">
              <Label>Select Flight Plan</Label>
              <Select value={selectedFlightPlan} onValueChange={setSelectedFlightPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a flight plan..." />
                </SelectTrigger>
                <SelectContent>
                  {flightPlans.map((plan) => (
                    <SelectItem key={plan.objectId} value={plan.objectId}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {plan.departure} → {plan.destination} ({plan.tailNumber})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Or Enter Custom Flight Object ID</Label>
            <Input
              value={customFlightId}
              onChange={(e) => setCustomFlightId(e.target.value)}
              placeholder="e.g., 50bdd532-af9e-4a04-8732-a393f1bc73cd"
              disabled={!!selectedFlightPlan}
            />
            <p className="text-sm text-gray-500">
              {selectedFlightPlan 
                ? 'Using selected flight plan' 
                : 'Enter the flight object ID from ForeFlight'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Step 2: Select PDF Files
          </CardTitle>
          <CardDescription>
            Upload departure and/or destination airport evaluation PDFs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Departure PDF */}
          <div className="space-y-2">
            <Label htmlFor="departure-pdf" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Departure Airport Evaluation
            </Label>
            <Input
              id="departure-pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileSelect('departure', e.target.files?.[0] || null)}
            />
            {departurePdf && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {departurePdf.name} ({(departurePdf.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Destination PDF */}
          <div className="space-y-2">
            <Label htmlFor="destination-pdf" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              Destination Airport Evaluation
            </Label>
            <Input
              id="destination-pdf"
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileSelect('destination', e.target.files?.[0] || null)}
            />
            {destinationPdf && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {destinationPdf.name} ({(destinationPdf.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Step 3: Upload to ForeFlight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleTestUpload}
            disabled={uploading || !isConfigured || (!selectedFlightPlan && !customFlightId) || (!departurePdf && !destinationPdf)}
            size="lg"
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading to ForeFlight...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload to ForeFlight API
              </>
            )}
          </Button>

          {!isConfigured && (
            <p className="text-sm text-red-600 mt-2">
              Configure ForeFlight credentials first
            </p>
          )}
          {isConfigured && (!selectedFlightPlan && !customFlightId) && (
            <p className="text-sm text-orange-600 mt-2">
              Select or enter a flight plan ID
            </p>
          )}
          {isConfigured && (selectedFlightPlan || customFlightId) && (!departurePdf && !destinationPdf) && (
            <p className="text-sm text-orange-600 mt-2">
              Select at least one PDF file
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {uploadResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadResults.map((result, index) => (
              <Alert 
                key={index} 
                variant={result.success ? 'default' : 'destructive'}
                className={result.success ? 'border-green-200 bg-green-50' : ''}
              >
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  <div>
                    <div className="font-medium mb-1">
                      {result.type} Evaluation - {result.fileName}
                    </div>
                    {result.success ? (
                      <div className="text-sm space-y-1">
                        <div className="text-green-700">✓ Upload successful</div>
                        {result.data?.objectId && (
                          <div className="text-gray-600">
                            Object ID: {result.data.objectId}
                          </div>
                        )}
                        {result.data?.displayName && (
                          <div className="text-gray-600">
                            Name: {result.data.displayName}
                          </div>
                        )}
                        {result.data?.category && (
                          <Badge variant="secondary" className="mt-1">
                            Category: {result.data.category}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">
                        Error: {result.error?.message || 'Unknown error'}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Developer Info */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="font-medium">💡 Testing Tips:</div>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Make sure you have a valid ForeFlight API key and account UUID configured</li>
              <li>You can create a test flight plan in ForeFlight, or use an existing one</li>
              <li>The uploaded files will be categorized as "Airport" in ForeFlight</li>
              <li>Check the browser console (F12) for detailed API request/response logs</li>
              <li>If upload fails, verify your API credentials have file upload permissions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

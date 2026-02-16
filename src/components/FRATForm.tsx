import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
import { CheckCircle, AlertTriangle, XCircle, FileText, Eye, ClipboardList, Save, Send } from 'lucide-react';

interface FRATFormProps {
  userRole?: string;
}

export default function FRATForm({ userRole = 'pilot' }: FRATFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    flightNumber: '',
    aircraft: '',
    departure: '',
    destination: '',
    captainExperience: '',
    foExperience: '',
    weatherConditions: '',
    visibility: '',
    windSpeed: '',
    turbulence: '',
    timeOfDay: '',
    flightDuration: '',
    passengerLoad: '',
    cargoWeight: '',
    alternateAirport: '',
    notam: '',
    crewFatigue: '',
    specialConsiderations: ''
  });

  const [totalScore, setTotalScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const riskFactors = {
    captainExperience: {
      'More than 5000 hours': 0,
      '3000-5000 hours': 1,
      '1500-3000 hours': 2,
      'Less than 1500 hours': 3
    },
    foExperience: {
      'More than 3000 hours': 0,
      '1500-3000 hours': 1,
      '500-1500 hours': 2,
      'Less than 500 hours': 3
    },
    weatherConditions: {
      'Clear/Few clouds': 0,
      'Scattered clouds': 1,
      'Broken clouds': 2,
      'Overcast/Storms': 3
    },
    visibility: {
      'Greater than 10 miles': 0,
      '5-10 miles': 1,
      '1-5 miles': 2,
      'Less than 1 mile': 3
    },
    windSpeed: {
      'Less than 10 knots': 0,
      '10-20 knots': 1,
      '20-30 knots': 2,
      'Greater than 30 knots': 3
    },
    turbulence: {
      'None expected': 0,
      'Light': 1,
      'Moderate': 2,
      'Severe': 3
    },
    timeOfDay: {
      'Day (sunrise to sunset)': 0,
      'Twilight': 1,
      'Night': 2
    },
    crewFatigue: {
      'Well rested': 0,
      'Slightly tired': 1,
      'Moderately tired': 2,
      'Very tired': 3
    }
  };

  // Check if user has access to FRAT review
  const canReviewFRAT = userRole === 'safety' || userRole === 'admin';

  // Load edit data on mount
  useEffect(() => {
    const editData = localStorage.getItem('frat_edit_data');
    if (editData) {
      try {
        const parsedData = JSON.parse(editData);
        setFormData({
          flightNumber: parsedData.flightNumber || '',
          aircraft: parsedData.aircraft || '',
          departure: parsedData.departure || '',
          destination: parsedData.destination || '',
          captainExperience: parsedData.captainExperience || '',
          foExperience: parsedData.foExperience || '',
          weatherConditions: parsedData.weatherConditions || '',
          visibility: parsedData.visibility || '',
          windSpeed: parsedData.windSpeed || '',
          turbulence: parsedData.turbulence || '',
          timeOfDay: parsedData.timeOfDay || '',
          flightDuration: parsedData.flightDuration || '',
          passengerLoad: parsedData.passengerLoad || '',
          cargoWeight: parsedData.cargoWeight || '',
          alternateAirport: parsedData.alternateAirport || '',
          notam: parsedData.notam || '',
          crewFatigue: parsedData.crewFatigue || '',
          specialConsiderations: parsedData.specialConsiderations || ''
        });

        if (parsedData.editingId) {
          setIsEditing(true);
          setEditingId(parsedData.editingId);
        }

        // Clear the edit data after loading
        localStorage.removeItem('frat_edit_data');

        if (parsedData.editingId) {
          toast.success('FRAT form loaded for editing');
        } else {
          toast.success('FRAT form data loaded');
        }
      } catch (error) {
        console.error('Error loading edit data:', error);
      }
    }
  }, []);

  useEffect(() => {
    calculateRiskScore();
  }, [formData]);

  const calculateRiskScore = () => {
    let score = 0;
    Object.keys(riskFactors).forEach(factor => {
      const value = formData[factor as keyof typeof formData];
      // @ts-ignore - Dynamic access to risk factors
      if (value && riskFactors[factor as keyof typeof riskFactors][value] !== undefined) {
        // @ts-ignore - Dynamic access to risk factors
        score += riskFactors[factor as keyof typeof riskFactors][value];
      }
    });

    setTotalScore(score);

    if (score <= 6) {
      setRiskLevel('Low');
    } else if (score <= 12) {
      setRiskLevel('Medium');
    } else {
      setRiskLevel('High');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic form validation
    const requiredFields = ['flightNumber', 'aircraft', 'departure', 'destination'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsSubmitted(true);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save draft
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real application, this would save to a backend
      const draftData = {
        ...formData,
        totalScore,
        riskLevel,
        status: 'draft',
        savedAt: new Date().toISOString()
      };

      // Save to localStorage as fallback
      localStorage.setItem(`frat_draft_${formData.flightNumber || 'temp'}`, JSON.stringify(draftData));

      toast.success('FRAT form saved as draft successfully');
    } catch (error) {
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call to submit form
      await new Promise(resolve => setTimeout(resolve, 1500));

      const submissionData = {
        id: isEditing && editingId ? editingId : `FRAT${Date.now()}`,
        flightNumber: formData.flightNumber,
        date: new Date().toISOString().split('T')[0],
        submittedBy: 'Current User', // Would be actual user from auth
        pilotInCommand: 'Current User',
        secondInCommand: formData.foExperience ? 'FO Name' : undefined,
        aircraft: formData.aircraft,
        route: `${formData.departure} → ${formData.destination}`,
        departureTime: '08:00', // Would come from form
        estimatedFlightTime: '3h 30m', // Would be calculated
        status: riskLevel === 'High' ? 'Requires Review' : (riskLevel === 'Medium' ? 'Pending' : 'Approved'),
        priority: riskLevel === 'High' ? 'Critical' : (riskLevel === 'Medium' ? 'High' : 'Low'),
        totalScore,
        maxScore: 25,
        riskLevel,
        submittedAt: new Date().toISOString(),
        factors: {
          // @ts-ignore
          weather: riskFactors.weatherConditions[formData.weatherConditions] || 0,
          airport: 0, // Would be calculated from airport factors
          // @ts-ignore
          crew: (riskFactors.captainExperience[formData.captainExperience] || 0) + (riskFactors.foExperience[formData.foExperience] || 0) + (riskFactors.crewFatigue[formData.crewFatigue] || 0),
          aircraft: 0, // Would be calculated from aircraft factors
          // @ts-ignore
          operation: riskFactors.timeOfDay[formData.timeOfDay] || 0
        },
        flaggedItems: generateFlaggedItems(),
        attachments: [],
        formData: { ...formData }
      };

      // Update or add submission
      const existingSubmissions = JSON.parse(localStorage.getItem('frat_submissions') || '[]');

      if (isEditing && editingId) {
        // Update existing submission
        const index = existingSubmissions.findIndex((s: any) => s.id === editingId);
        if (index !== -1) {
          existingSubmissions[index] = submissionData;
          toast.success('FRAT form updated and resubmitted successfully!');
        } else {
          existingSubmissions.push(submissionData);
          toast.success('FRAT form submitted successfully!');
        }
      } else {
        // Add new submission
        existingSubmissions.push(submissionData);
        toast.success('FRAT form submitted successfully!');
      }

      localStorage.setItem('frat_submissions', JSON.stringify(existingSubmissions));

      // Clear any saved draft
      localStorage.removeItem(`frat_draft_${formData.flightNumber}`);

      // Show appropriate message based on risk level
      setTimeout(() => {
        if (riskLevel === 'High') {
          toast.info('High risk detected - submission sent to Safety for review before flight approval.');
        } else if (riskLevel === 'Medium') {
          toast.info('Medium risk detected - submission sent for standard review process.');
        } else {
          toast.success('Low risk flight - approved for operations.');
        }
      }, 1000);

      // Reset form after successful submission
      setTimeout(() => {
        setIsSubmitted(false);
        setIsEditing(false);
        setEditingId(null);
        setFormData({
          flightNumber: '',
          aircraft: '',
          departure: '',
          destination: '',
          captainExperience: '',
          foExperience: '',
          weatherConditions: '',
          visibility: '',
          windSpeed: '',
          turbulence: '',
          timeOfDay: '',
          flightDuration: '',
          passengerLoad: '',
          cargoWeight: '',
          alternateAirport: '',
          notam: '',
          crewFatigue: '',
          specialConsiderations: ''
        });

        // Navigate back to submissions page
        navigate('/frat/my-submissions');
      }, 2500);

    } catch (error) {
      toast.error('Failed to submit FRAT form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateFlaggedItems = (): string[] => {
    const items: string[] = [];

    if (formData.weatherConditions === 'Overcast/Storms') {
      items.push('Severe weather conditions at departure or destination');
    }
    if (formData.visibility === 'Less than 1 mile') {
      items.push('Low visibility conditions');
    }
    if (formData.windSpeed === 'Greater than 30 knots') {
      items.push('High crosswind conditions');
    }
    if (formData.turbulence === 'Severe') {
      items.push('Severe turbulence forecast');
    }
    if (formData.crewFatigue === 'Very tired') {
      items.push('Crew fatigue concerns');
    }
    if (formData.captainExperience === 'Less than 1500 hours') {
      items.push('Captain low experience hours');
    }
    if (formData.foExperience === 'Less than 500 hours') {
      items.push('First officer low experience hours');
    }
    if (formData.timeOfDay === 'Night' && (formData.weatherConditions === 'Overcast/Storms' || formData.visibility === 'Less than 1 mile')) {
      items.push('Night operations with reduced visibility');
    }

    return items;
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'Low': return <CheckCircle className="w-4 h-4" />;
      case 'Medium': return <AlertTriangle className="w-4 h-4" />;
      case 'High': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const isFormValid = () => {
    const requiredFields = ['flightNumber', 'aircraft', 'departure', 'destination'];
    return requiredFields.every(field => formData[field as keyof typeof formData]);
  };

  if (isSubmitted) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-3 rounded-full ${getRiskColor()}`}>
                {getRiskIcon()}
              </div>
            </div>
            <CardTitle>FRAT Assessment Complete</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div>
              <p className="text-2xl font-bold">Risk Score: {totalScore}</p>
              <Badge className={`mt-2 ${getRiskColor()}`}>
                {riskLevel} Risk
              </Badge>
            </div>

            <Alert className={`${getRiskColor()} border-2`}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {riskLevel === 'High' && 'This flight requires additional review and risk mitigation before proceeding.'}
                {riskLevel === 'Medium' && 'This flight has elevated risk factors. Consider additional precautions.'}
                {riskLevel === 'Low' && 'This flight has minimal risk factors. Normal procedures apply.'}
              </AlertDescription>
            </Alert>

            {/* Key Risk Factors Summary */}
            {(formData.captainExperience || formData.foExperience || formData.weatherConditions || formData.crewFatigue) && (
              <div className="text-left bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Assessment Summary</h4>
                <div className="space-y-1 text-sm">
                  {formData.captainExperience && (
                    <p><strong>Captain Experience:</strong> {formData.captainExperience}</p>
                  )}
                  {formData.foExperience && (
                    <p><strong>First Officer Experience:</strong> {formData.foExperience}</p>
                  )}
                  {formData.weatherConditions && (
                    <p><strong>Weather Conditions:</strong> {formData.weatherConditions}</p>
                  )}
                  {formData.crewFatigue && (
                    <p><strong>Crew Fatigue Level:</strong> {formData.crewFatigue}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                disabled={isSubmitting}
              >
                Modify Assessment
              </Button>
              <Button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="min-w-32"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update & Resubmit' : 'Save & Submit'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-500" />
            Flight Risk Assessment Tool (FRAT)
            {isEditing && <Badge variant="outline" className="ml-2">Editing</Badge>}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Edit and resubmit your FRAT assessment'
              : 'Complete all sections for automatic risk scoring'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/frat/my-submissions">
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Submissions
            </Button>
          </Link>
          {canReviewFRAT && (
            <Link to="/frat/review">
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Review FRAT Forms
              </Button>
            </Link>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Flight Information */}
            <Card>
              <CardHeader>
                <CardTitle>Flight Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flightNumber">Flight Number *</Label>
                  <Select value={formData.flightNumber} onValueChange={(value: string) => handleInputChange('flightNumber', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select flight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FO001">FO001</SelectItem>
                      <SelectItem value="FO002">FO002</SelectItem>
                      <SelectItem value="FO003">FO003</SelectItem>
                      <SelectItem value="FO004">FO004</SelectItem>
                      <SelectItem value="FO005">FO005</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aircraft">Aircraft *</Label>
                  <Select value={formData.aircraft} onValueChange={(value: string) => handleInputChange('aircraft', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select aircraft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N1PG">N1PG - Gulfstream G650</SelectItem>
                      <SelectItem value="N2PG">N2PG - Gulfstream G650</SelectItem>
                      <SelectItem value="N5PG">N5PG - Gulfstream G500</SelectItem>
                      <SelectItem value="N6PG">N6PG - Gulfstream G500</SelectItem>
                      <SelectItem value="N1PG">N1PG - Gulfstream G650 (Alternate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure">Departure Airport *</Label>
                  <Select value={formData.departure} onValueChange={(value: string) => handleInputChange('departure', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select departure" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAX">LAX - Los Angeles</SelectItem>
                      <SelectItem value="JFK">JFK - New York</SelectItem>
                      <SelectItem value="MIA">MIA - Miami</SelectItem>
                      <SelectItem value="ORD">ORD - Chicago</SelectItem>
                      <SelectItem value="EWR">EWR - Newark</SelectItem>
                      <SelectItem value="ATL">ATL - Atlanta</SelectItem>
                      <SelectItem value="LGA">LGA - LaGuardia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Airport *</Label>
                  <Select value={formData.destination} onValueChange={(value: string) => handleInputChange('destination', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAX">LAX - Los Angeles</SelectItem>
                      <SelectItem value="JFK">JFK - New York</SelectItem>
                      <SelectItem value="MIA">MIA - Miami</SelectItem>
                      <SelectItem value="ORD">ORD - Chicago</SelectItem>
                      <SelectItem value="EWR">EWR - Newark</SelectItem>
                      <SelectItem value="ATL">ATL - Atlanta</SelectItem>
                      <SelectItem value="LGA">LGA - LaGuardia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Crew Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Crew Experience</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="captainExperience">Captain Total Hours</Label>
                  <Select value={formData.captainExperience} onValueChange={(value: string) => handleInputChange('captainExperience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="More than 5000 hours">More than 5000 hours</SelectItem>
                      <SelectItem value="3000-5000 hours">3000-5000 hours</SelectItem>
                      <SelectItem value="1500-3000 hours">1500-3000 hours</SelectItem>
                      <SelectItem value="Less than 1500 hours">Less than 1500 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foExperience">First Officer Total Hours</Label>
                  <Select value={formData.foExperience} onValueChange={(value: string) => handleInputChange('foExperience', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="More than 3000 hours">More than 3000 hours</SelectItem>
                      <SelectItem value="1500-3000 hours">1500-3000 hours</SelectItem>
                      <SelectItem value="500-1500 hours">500-1500 hours</SelectItem>
                      <SelectItem value="Less than 500 hours">Less than 500 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="crewFatigue">Crew Fatigue Level</Label>
                  <Select value={formData.crewFatigue} onValueChange={(value: string) => handleInputChange('crewFatigue', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fatigue level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Well rested">Well rested</SelectItem>
                      <SelectItem value="Slightly tired">Slightly tired</SelectItem>
                      <SelectItem value="Moderately tired">Moderately tired</SelectItem>
                      <SelectItem value="Very tired">Very tired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Weather Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Weather & Environmental Factors</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weatherConditions">Weather Conditions</Label>
                  <Select value={formData.weatherConditions} onValueChange={(value: string) => handleInputChange('weatherConditions', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select conditions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clear/Few clouds">Clear/Few clouds</SelectItem>
                      <SelectItem value="Scattered clouds">Scattered clouds</SelectItem>
                      <SelectItem value="Broken clouds">Broken clouds</SelectItem>
                      <SelectItem value="Overcast/Storms">Overcast/Storms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visibility">Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value: string) => handleInputChange('visibility', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Greater than 10 miles">Greater than 10 miles</SelectItem>
                      <SelectItem value="5-10 miles">5-10 miles</SelectItem>
                      <SelectItem value="1-5 miles">1-5 miles</SelectItem>
                      <SelectItem value="Less than 1 mile">Less than 1 mile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="windSpeed">Wind Speed</Label>
                  <Select value={formData.windSpeed} onValueChange={(value: string) => handleInputChange('windSpeed', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select wind speed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Less than 10 knots">Less than 10 knots</SelectItem>
                      <SelectItem value="10-20 knots">10-20 knots</SelectItem>
                      <SelectItem value="20-30 knots">20-30 knots</SelectItem>
                      <SelectItem value="Greater than 30 knots">Greater than 30 knots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turbulence">Expected Turbulence</Label>
                  <Select value={formData.turbulence} onValueChange={(value: string) => handleInputChange('turbulence', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select turbulence level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None expected">None expected</SelectItem>
                      <SelectItem value="Light">Light</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="timeOfDay">Time of Day</Label>
                  <Select value={formData.timeOfDay} onValueChange={(value: string) => handleInputChange('timeOfDay', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day (sunrise to sunset)">Day (sunrise to sunset)</SelectItem>
                      <SelectItem value="Twilight">Twilight</SelectItem>
                      <SelectItem value="Night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Additional Considerations */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Considerations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialConsiderations">Special Considerations / Notes</Label>
                  <Textarea
                    id="specialConsiderations"
                    placeholder="Enter any special considerations, NOTAMs, or additional risk factors..."
                    value={formData.specialConsiderations}
                    onChange={(e) => handleInputChange('specialConsiderations', e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Score Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalScore}</div>
                  <p className="text-sm text-muted-foreground">Total Risk Score</p>
                </div>

                <Badge className={`w-full justify-center py-2 ${getRiskColor()}`}>
                  {getRiskIcon()}
                  <span className="ml-2">{riskLevel || 'Calculating...'} Risk</span>
                </Badge>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Low Risk:</span>
                    <span>0-6 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium Risk:</span>
                    <span>7-12 points</span>
                  </div>
                  <div className="flex justify-between">
                    <span>High Risk:</span>
                    <span>13+ points</span>
                  </div>
                </div>

                {riskLevel && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {riskLevel === 'High' && 'High risk detected. Additional review required.'}
                      {riskLevel === 'Medium' && 'Moderate risk. Consider additional precautions.'}
                      {riskLevel === 'Low' && 'Low risk. Normal procedures apply.'}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Form Completion Status */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Form Status</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Required Fields:</span>
                      <span className={isFormValid() ? 'text-green-600' : 'text-red-600'}>
                        {isFormValid() ? 'Complete ✓' : 'Incomplete'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk Assessment:</span>
                      <span className="text-green-600">Active ✓</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || !formData.flightNumber}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid()}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            {isEditing ? 'Update Assessment' : 'Complete Assessment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
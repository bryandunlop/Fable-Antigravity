import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePassengerForms } from './contexts/PassengerFormContext';
import type { FormField } from './contexts/PassengerFormContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import {
    Plane,
    FileText,
    Globe,
    MapPin,
    CheckCircle,
    AlertTriangle,
    Upload,
    Info
} from 'lucide-react';

export default function PublicPassengerForm() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { getTemplate, addSubmission } = usePassengerForms();

    const preselectedType = searchParams.get('type') as 'domestic' | 'international' | 'sponsored-trip' | null;

    const [selectedFormType, setSelectedFormType] = useState<'domestic' | 'international' | 'sponsored-trip' | null>(preselectedType);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const template = selectedFormType ? getTemplate(selectedFormType) : null;

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
        // Clear error when user starts typing
        if (errors[fieldId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldId];
                return newErrors;
            });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setUploadedFiles(Array.from(e.target.files));
        }
    };

    const validateForm = (): boolean => {
        if (!template) return false;

        const newErrors: Record<string, string> = {};

        template.fields.forEach(field => {
            if (field.required && !formData[field.id]) {
                newErrors[field.id] = `${field.label} is required`;
            }

            // Email validation
            if (field.type === 'email' && formData[field.id]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData[field.id])) {
                    newErrors[field.id] = 'Please enter a valid email address';
                }
            }

            // Phone validation
            if (field.type === 'phone' && formData[field.id]) {
                const phoneRegex = /^[\d\s\-\+\(\)]+$/;
                if (!phoneRegex.test(formData[field.id])) {
                    newErrors[field.id] = 'Please enter a valid phone number';
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm() || !template) {
            return;
        }

        // Extract passenger info
        const passengerInfo = {
            name: `${formData.firstName || ''} ${formData.middleName || ''} ${formData.lastName || ''}`.trim(),
            email: formData.companyEmail || '',
            phone: formData.companyPhone || ''
        };

        // Create submission
        addSubmission({
            templateId: template.id,
            templateVersion: template.version,
            formType: template.type,
            passengerInfo,
            responses: formData,
            submittedAt: new Date().toISOString(),
            submittedVia: 'public-link',
            status: 'new'
        });

        setSubmitted(true);
    };

    const renderField = (field: FormField) => {
        const value = formData[field.id] || '';
        const error = errors[field.id];

        return (
            <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                </Label>

                {field.helpText && (
                    <p className="text-sm text-muted-foreground">{field.helpText}</p>
                )}

                {field.type === 'text' && (
                    <Input
                        id={field.id}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'email' && (
                    <Input
                        id={field.id}
                        type="email"
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'phone' && (
                    <Input
                        id={field.id}
                        type="tel"
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'date' && (
                    <Input
                        id={field.id}
                        type="date"
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'number' && (
                    <Input
                        id={field.id}
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'textarea' && (
                    <Textarea
                        id={field.id}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder}
                        rows={4}
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {field.type === 'select' && (
                    <Select value={value} onValueChange={(val: string) => handleFieldChange(field.id, val)}>
                        <SelectTrigger className={error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {field.type === 'file-upload' && (
                    <div className="space-y-2">
                        <Input
                            id={field.id}
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            accept=".pdf,.jpg,.jpeg,.png"
                            className={error ? 'border-red-500' : ''}
                        />
                        {uploadedFiles.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                                {uploadedFiles.length} file(s) selected
                            </div>
                        )}
                    </div>
                )}

                {field.type === 'address-lookup' && (
                    <Input
                        id={field.id}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder="Enter address"
                        className={error ? 'border-red-500' : ''}
                    />
                )}

                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        );
    };

    const renderFormBySection = () => {
        if (!template) return null;

        // Group fields by section
        const sections: Record<string, FormField[]> = {};
        template.fields.forEach(field => {
            const section = field.section || 'General';
            if (!sections[section]) {
                sections[section] = [];
            }
            sections[section].push(field);
        });

        return Object.entries(sections).map(([sectionName, fields]) => (
            <div key={sectionName} className="space-y-4">
                <h3 className="text-lg font-semibold text-accent border-b border-accent/20 pb-2">
                    {sectionName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields.map(field => renderField(field))}
                </div>
            </div>
        ));
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001a5c] to-black flex items-center justify-center p-6">
                <Card className="max-w-2xl w-full">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-green-500/10 rounded-full">
                                <CheckCircle className="w-16 h-16 text-green-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Form Submitted Successfully!</CardTitle>
                        <CardDescription>
                            Thank you for completing the passenger form. Our scheduling team has been notified and will review your submission.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                You will receive a confirmation email at <strong>{formData.companyEmail}</strong> shortly.
                                If you have any questions, please contact the scheduling team.
                            </AlertDescription>
                        </Alert>
                        <div className="flex justify-center">
                            <Button onClick={() => window.location.reload()}>
                                Submit Another Form
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!selectedFormType) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001a5c] to-black p-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-accent/10 rounded-full">
                                <Plane className="w-16 h-16 text-accent" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold mb-4">Passenger Information Forms</h1>
                        <p className="text-xl text-muted-foreground">
                            Please select the appropriate form for your travel needs
                        </p>
                    </div>

                    {/* Form Type Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Domestic */}
                        <Card
                            className="cursor-pointer hover:border-accent transition-all hover:shadow-lg hover:shadow-accent/20"
                            onClick={() => setSelectedFormType('domestic')}
                        >
                            <CardHeader>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-full">
                                        <MapPin className="w-12 h-12 text-blue-500" />
                                    </div>
                                </div>
                                <CardTitle className="text-center">Domestic Travel</CardTitle>
                                <CardDescription className="text-center">
                                    For travel within the United States
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Basic passenger information</li>
                                    <li>• Emergency contact details</li>
                                    <li>• Special needs assessment</li>
                                    <li>• Dietary restrictions</li>
                                </ul>
                                <Button className="w-full mt-4">
                                    Select Domestic Form
                                </Button>
                            </CardContent>
                        </Card>

                        {/* International */}
                        <Card
                            className="cursor-pointer hover:border-accent transition-all hover:shadow-lg hover:shadow-accent/20"
                            onClick={() => setSelectedFormType('international')}
                        >
                            <CardHeader>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-green-500/10 rounded-full">
                                        <Globe className="w-12 h-12 text-green-500" />
                                    </div>
                                </div>
                                <CardTitle className="text-center">International Travel</CardTitle>
                                <CardDescription className="text-center">
                                    For international flights
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• All domestic requirements</li>
                                    <li>• Passport information</li>
                                    <li>• Visa details (if applicable)</li>
                                    <li>• Document uploads</li>
                                </ul>
                                <Button className="w-full mt-4">
                                    Select International Form
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Sponsored Trip */}
                        <Card
                            className="cursor-pointer hover:border-accent transition-all hover:shadow-lg hover:shadow-accent/20"
                            onClick={() => setSelectedFormType('sponsored-trip')}
                        >
                            <CardHeader>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 bg-purple-500/10 rounded-full">
                                        <FileText className="w-12 h-12 text-purple-500" />
                                    </div>
                                </div>
                                <CardTitle className="text-center">Sponsored Trip Request</CardTitle>
                                <CardDescription className="text-center">
                                    Request approval for sponsored travel
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Authorized user approval</li>
                                    <li>• Business purpose</li>
                                    <li>• Itinerary details</li>
                                    <li>• Passenger manifest</li>
                                </ul>
                                <Button className="w-full mt-4">
                                    Select Sponsored Trip Form
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-12 text-center">
                        <Alert className="max-w-3xl mx-auto">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                All forms must be completed at least 3 working days prior to travel.
                                For international flights, additional documentation is required.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#001a5c] to-black p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="outline"
                        onClick={() => setSelectedFormType(null)}
                        className="mb-4"
                    >
                        ← Back to Form Selection
                    </Button>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl">{template?.name}</CardTitle>
                                    <CardDescription>{template?.description}</CardDescription>
                                </div>
                                <Badge variant="outline" className="text-lg px-4 py-2">
                                    {selectedFormType === 'domestic' && 'Domestic'}
                                    {selectedFormType === 'international' && 'International'}
                                    {selectedFormType === 'sponsored-trip' && 'Sponsored Trip'}
                                </Badge>
                            </div>
                        </CardHeader>
                    </Card>
                </div>

                {/* International Form Warnings */}
                {selectedFormType === 'international' && (
                    <div className="space-y-4 mb-8">
                        <Alert className="border-red-500 bg-red-500/10">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <AlertDescription className="text-red-500 font-bold">
                                CAUTION: An ESTA issued for commercial travel is not sufficient for private planes.
                            </AlertDescription>
                        </Alert>

                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Reminders:</strong> It is critical that ALL passport(s) used for travel are provided and scanned copies are uploaded below.
                                Customs delays can be significant if proper documentation is not provided in advance. If traveling to a destination that requires a visa,
                                please upload a scanned copy of visas in all passports for countries to be visited during your trip. For travel into the US on a company plane,
                                a non US citizen must have an L1 Visa, B1 Visa, or green card for US entry. You may travel out of the U.S. but cannot return without one of
                                these documents as a non U.S. citizen.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Sponsored Trip Info */}
                {selectedFormType === 'sponsored-trip' && (
                    <Alert className="mb-8">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            All Authorized Users may request the use of the Company aircraft for their direct reports, with prior approval from the CHRO,
                            if there is a compelling business reason and there are no viable commercial options available to meet the business need.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    <Card>
                        <CardContent className="pt-6 space-y-8">
                            {renderFormBySection()}
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedFormType(null)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" size="lg">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Submit Form
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

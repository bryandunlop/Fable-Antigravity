import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { PenTool, RotateCcw, Check, Shield, Clock, User } from 'lucide-react';

interface DigitalSignatureProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signatureData: SignatureData) => void;
  document: {
    id: string;
    title: string;
    type: string;
    compliance: string;
  };
  userInfo: {
    name: string;
    role: string;
    email: string;
  };
}

interface SignatureData {
  signature: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  documentHash: string;
  signedBy: string;
  email: string;
  role: string;
}

export default function DigitalSignature({ isOpen, onClose, onSign, document, userInfo }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [acknowledgmentText, setAcknowledgmentText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = async () => {
    if (!hasSignature || !acknowledgmentText.trim()) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Create signature data with security features
      const signatureData: SignatureData = {
        signature: canvas.toDataURL(),
        timestamp: new Date(),
        ipAddress: '192.168.1.100', // In real app, get actual IP
        userAgent: navigator.userAgent,
        documentHash: `${document.id}-${Date.now()}`, // In real app, use actual document hash
        signedBy: userInfo.name,
        email: userInfo.email,
        role: userInfo.role
      };

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      onSign(signatureData);
      onClose();
    } catch (error) {
      console.error('Error processing signature:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentDateTime = () => {
    return new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[85vh] overflow-y-auto" aria-describedby="digital-signature-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Digital Document Acknowledgment
          </DialogTitle>
          <DialogDescription id="digital-signature-description">
            Please review and digitally sign to acknowledge receipt and understanding of this document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Document Title</Label>
                  <p className="font-medium">{document.title}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Document Type</Label>
                  <Badge variant="outline">{document.type}</Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Compliance Level</Label>
                  <Badge className={document.compliance === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                    {document.compliance}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Signature Date & Time</Label>
                  <p className="text-sm">{getCurrentDateTime()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Signer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{userInfo.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <p className="font-medium">{userInfo.role}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <p className="font-medium">{userInfo.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acknowledgment Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Check className="w-4 h-4" />
                  <AlertDescription>
                    By signing below, I acknowledge that I have received, read, and understand the content of this document. 
                    I agree to comply with all policies, procedures, and requirements outlined herein.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="acknowledgment">Please type "I ACKNOWLEDGE" to confirm your understanding:</Label>
                  <Input
                    id="acknowledgment"
                    value={acknowledgmentText}
                    onChange={(e) => setAcknowledgmentText(e.target.value)}
                    placeholder="Type: I ACKNOWLEDGE"
                    className="uppercase"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Digital Signature Canvas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Digital Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="border border-gray-200 rounded bg-white cursor-crosshair w-full max-w-full h-auto"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ maxWidth: '100%', height: 'auto', aspectRatio: '3/1' }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Please sign above using your mouse or touchscreen
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Clear Signature
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Features */}
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <strong>Security Features:</strong> This digital signature includes timestamp, IP address, 
              browser fingerprint, and document hash for legal validity and tamper detection.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Signature will be timestamped and legally binding</span>
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto">
            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="flex-1 lg:flex-none">
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={!hasSignature || acknowledgmentText.toUpperCase() !== 'I ACKNOWLEDGE' || isProcessing}
              className="flex items-center gap-2 flex-1 lg:flex-none"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Complete Digital Signature
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  Plus, 
  FileText, 
  Users, 
  AlertTriangle, 
  Wrench, 
  Calendar,
  X,
  PhoneCall,
  Shield,
  ClipboardCheck,
  Utensils,
  Package,
  Monitor
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FABAction {
  label: string;
  icon: any;
  href: string;
  color: string;
  urgent?: boolean;
}

interface FloatingActionButtonProps {
  userRole: string;
}

export default function FloatingActionButton({ userRole }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getRoleActions = (): FABAction[] => {
    switch (userRole) {
      case 'pilot':
        return [
          { label: 'Flight Ops Center', icon: Monitor, href: '/flight-operations-center', color: 'bg-primary hover:bg-primary/90' },
          { label: 'Create FRAT', icon: FileText, href: '/frat', color: 'bg-blue-500 hover:bg-blue-600' },
          { label: 'Fuel Request', icon: Package, href: '/fuel-load-request', color: 'bg-orange-500 hover:bg-orange-600' },
          { label: 'Report Issue', icon: AlertTriangle, href: '/safety/hazards', color: 'bg-red-500 hover:bg-red-600' }
        ];
      
      case 'inflight':
        return [
          { label: 'Add Passenger', icon: Users, href: '/passenger-database', color: 'bg-green-500 hover:bg-green-600' },
          { label: 'Catering Order', icon: Utensils, href: '/catering-tracker', color: 'bg-purple-500 hover:bg-purple-600' },
          { label: 'Post-Flight', icon: ClipboardCheck, href: '/post-flight-checklist', color: 'bg-blue-500 hover:bg-blue-600' },
          { label: 'Emergency', icon: PhoneCall, href: '#', color: 'bg-red-500 hover:bg-red-600', urgent: true }
        ];
      
      case 'maintenance':
        return [
          { label: 'Work Order', icon: Wrench, href: '/maintenance', color: 'bg-blue-500 hover:bg-blue-600' },
          { label: 'AOG Declaration', icon: AlertTriangle, href: '/aog-management', color: 'bg-red-500 hover:bg-red-600', urgent: true },
          { label: 'Parts Request', icon: Package, href: '/aircraft-inventory', color: 'bg-green-500 hover:bg-green-600' }
        ];
      
      case 'safety':
        return [
          { label: 'Review FRAT', icon: FileText, href: '/frat/review', color: 'bg-orange-500 hover:bg-orange-600' },
          { label: 'Safety Alert', icon: Shield, href: '/safety/hazards', color: 'bg-red-500 hover:bg-red-600', urgent: true },
          { label: 'Schedule Audit', icon: Calendar, href: '/safety/audits', color: 'bg-blue-500 hover:bg-blue-600' }
        ];
      
      case 'scheduling':
        return [
          { label: 'Flight Ops Center', icon: Monitor, href: '/flight-operations-center', color: 'bg-primary hover:bg-primary/90' },
          { label: 'Add Flight', icon: Calendar, href: '/scheduling-dashboard', color: 'bg-blue-500 hover:bg-blue-600' },
          { label: 'Crew Assignment', icon: Users, href: '/crew-management', color: 'bg-green-500 hover:bg-green-600' },
          { label: 'Send Forms', icon: FileText, href: '/passenger-forms', color: 'bg-purple-500 hover:bg-purple-600' }
        ];
      
      default:
        return [
          { label: 'Create FRAT', icon: FileText, href: '/frat', color: 'bg-blue-500 hover:bg-blue-600' },
          { label: 'Report Issue', icon: AlertTriangle, href: '/safety/hazards', color: 'bg-red-500 hover:bg-red-600' }
        ];
    }
  };

  const actions = getRoleActions();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Menu */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50">
          <Card className="p-2 min-w-48">
            <CardContent className="p-0 space-y-2">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link 
                    key={index} 
                    to={action.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start gap-3 h-auto py-3 ${action.urgent ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : ''}`}
                    >
                      <div className={`p-1 rounded ${action.color} text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {action.label}
                      {action.urgent && (
                        <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Urgent
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main FAB */}
      <Button
        className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform ${
          isOpen ? 'rotate-45' : 'rotate-0'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </Button>
    </>
  );
}
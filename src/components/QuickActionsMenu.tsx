import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './ui/context-menu';
import { 
  FileText, 
  User, 
  Shield, 
  Link2, 
  BarChart3,
  Printer,
  Download,
  Edit,
  Trash2
} from 'lucide-react';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

interface QuickActionsMenuProps {
  children: React.ReactNode;
  actions: QuickAction[];
}

export default function QuickActionsMenu({ children, actions }: QuickActionsMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {actions.map((action, index) => (
          <React.Fragment key={index}>
            {action.separator && index > 0 && <ContextMenuSeparator />}
            <ContextMenuItem
              onClick={action.onClick}
              className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
            >
              <span className="mr-2">{action.icon}</span>
              {action.label}
            </ContextMenuItem>
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Pre-configured common actions
export const maintenanceActions = {
  createWorkOrder: (onClick: () => void) => ({
    label: 'Create Work Order',
    icon: <FileText className="w-4 h-4" />,
    onClick,
  }),
  assignTechnician: (onClick: () => void) => ({
    label: 'Assign Technician',
    icon: <User className="w-4 h-4" />,
    onClick,
  }),
  addToMEL: (onClick: () => void) => ({
    label: 'Add to MEL/CDL',
    icon: <Shield className="w-4 h-4" />,
    onClick,
  }),
  linkRelated: (onClick: () => void) => ({
    label: 'Link Related Squawks',
    icon: <Link2 className="w-4 h-4" />,
    onClick,
  }),
  viewLifecycle: (onClick: () => void) => ({
    label: 'View Lifecycle',
    icon: <BarChart3 className="w-4 h-4" />,
    onClick,
  }),
  print: (onClick: () => void) => ({
    label: 'Print',
    icon: <Printer className="w-4 h-4" />,
    onClick,
    separator: true,
  }),
  export: (onClick: () => void) => ({
    label: 'Export',
    icon: <Download className="w-4 h-4" />,
    onClick,
  }),
  edit: (onClick: () => void) => ({
    label: 'Edit',
    icon: <Edit className="w-4 h-4" />,
    onClick,
    separator: true,
  }),
  delete: (onClick: () => void) => ({
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    onClick,
    variant: 'destructive' as const,
  }),
};

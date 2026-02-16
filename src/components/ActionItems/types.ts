export interface ActionItem {
  id: string;
  title: string;
  description: string;
  module: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  priority: string;
  status: string;
  progress: number;
  contributors: Array<{
    id: string;
    name: string;
    role: string;
    avatar: string;
  }>;
  recentActivity: Array<{
    id: number;
    user: { name: string; avatar: string };
    action: string;
    time: string;
  }>;
  sections: Array<{
    name: string;
    status: string;
  }>;
  sectionsComplete: number;
  totalSections: number;
}

export interface NewItemForm {
  title: string;
  description: string;
  module: string;
  priority: string;
  dueDate: string;
  sections: string[];
}

export interface ActionItemsProps {
  userRole: string;
}
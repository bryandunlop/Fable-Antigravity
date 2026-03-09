import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ChevronRight,
  UserCog,
  Star
} from 'lucide-react';

// Comprehensive aviation role definitions
const ROLE_CATEGORIES = {
  'Flight Operations': [
    { value: 'chief-pilot', label: 'Chief Pilot', description: 'Oversees all pilot operations and training' },
    { value: 'pilot-in-command', label: 'Pilot in Command (PIC)', description: 'Captain-level flight crew' },
    { value: 'second-in-command', label: 'Second in Command (SIC)', description: 'First Officer-level flight crew' },
    { value: 'check-airman', label: 'Check Airman', description: 'Conducts pilot proficiency checks' },
    { value: 'flight-instructor', label: 'Flight Instructor', description: 'Provides flight training' },
  ],
  'Cabin & Inflight': [
    { value: 'lead-fa', label: 'Lead Flight Attendant', description: 'Senior cabin crew member' },
    { value: 'flight-attendant', label: 'Flight Attendant', description: 'Cabin crew member' },
    { value: 'inflight-manager', label: 'Inflight Manager', description: 'Manages cabin services team' },
  ],
  'Maintenance': [
    { value: 'dom', label: 'Director of Maintenance (DOM)', description: 'Oversees maintenance operations' },
    { value: 'maintenance-lead', label: 'Maintenance Lead', description: 'Senior maintenance technician' },
    { value: 'mechanic', label: 'A&P Mechanic', description: 'Airframe & Powerplant technician' },
    { value: 'avionics-tech', label: 'Avionics Technician', description: 'Avionics specialist' },
    { value: 'inspector', label: 'Inspector (IA)', description: 'Inspection Authorization holder' },
  ],
  'Safety & Compliance': [
    { value: 'safety-manager', label: 'Safety Manager', description: 'Oversees SMS program' },
    { value: 'safety-officer', label: 'Safety Officer', description: 'Conducts safety investigations' },
    { value: 'compliance-officer', label: 'Compliance Officer', description: 'Ensures regulatory compliance' },
  ],
  'Management & Admin': [
    { value: 'accountable-exec', label: 'Accountable Executive (AE)', description: 'Ultimate safety authority' },
    { value: 'director-ops', label: 'Director of Operations', description: 'Oversees daily operations' },
    { value: 'scheduler', label: 'Scheduler / Dispatcher', description: 'Flight scheduling and dispatch' },
    { value: 'admin', label: 'System Administrator', description: 'Full system access and configuration' },
    { value: 'ground-ops', label: 'Ground Operations', description: 'Ground handling and services' },
  ]
};

const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();

const getRoleLabelByValue = (value: string) => ALL_ROLES.find(r => r.value === value)?.label || value;

// Comprehensive permission definitions grouped by module
const PERMISSION_CATEGORIES: Record<string, { label: string; permissions: string[] }> = {
  'flight-ops': {
    label: 'Flight Operations',
    permissions: ['Flight Planning', 'FRAT Access', 'Schedule View', 'Schedule Edit', 'Pilot Management', 'Flight Logs', 'Route Planning']
  },
  'maintenance': {
    label: 'Maintenance',
    permissions: ['Maintenance Board', 'Work Orders', 'Parts Inventory', 'MEL Management', 'Squawk Entry', 'Maintenance Logs']
  },
  'safety': {
    label: 'Safety & Compliance',
    permissions: ['Safety Reports', 'Hazard Management', 'Audit Management', 'Compliance', 'ASAP Reports', 'Risk Assessment']
  },
  'cabin': {
    label: 'Cabin & Passenger',
    permissions: ['Passenger Services', 'Passenger Database', 'Catering Management', 'Inventory']
  },
  'admin': {
    label: 'Administration',
    permissions: ['User Management', 'System Config', 'Reports', 'Billing', 'Full System Access']
  },
  'documents': {
    label: 'Documents & Training',
    permissions: ['Document Library', 'Training Records', 'Currency Tracking', 'Manuals Management']
  }
};

const ALL_PERMISSIONS = Object.values(PERMISSION_CATEGORIES).flatMap(c => c.permissions);

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [users, setUsers] = useState([
    {
      id: 'USR001',
      name: 'Captain John Smith',
      email: 'j.smith@flightops.com',
      role: 'chief-pilot',
      status: 'Active',
      lastLogin: '2025-02-01 14:30',
      certifications: ['ATP', 'Type Rating G650', 'Medical Class 1'],
      department: 'Flight Operations',
      hireDate: '2018-03-15',
      permissions: ['Flight Planning', 'FRAT Access', 'Schedule View', 'Pilot Management']
    },
    {
      id: 'USR002',
      name: 'Sarah Wilson',
      email: 's.wilson@flightops.com',
      role: 'dom',
      status: 'Active',
      lastLogin: '2025-02-02 09:15',
      certifications: ['A&P License', 'IA', 'Avionics Specialist'],
      department: 'Maintenance',
      hireDate: '2020-06-10',
      permissions: ['Maintenance Board', 'Work Orders', 'Parts Inventory', 'MEL Management']
    },
    {
      id: 'USR003',
      name: 'Mike Johnson',
      email: 'm.johnson@flightops.com',
      role: 'lead-fa',
      status: 'Active',
      lastLogin: '2025-02-01 16:45',
      certifications: ['Flight Attendant Cert', 'Safety Training', 'First Aid'],
      department: 'Cabin Services',
      hireDate: '2019-11-22',
      permissions: ['Passenger Services', 'Safety Reports', 'Schedule View', 'Inventory']
    },
    {
      id: 'USR004',
      name: 'David Brown',
      email: 'd.brown@flightops.com',
      role: 'director-ops',
      status: 'Active',
      lastLogin: '2025-02-02 11:00',
      certifications: ['Management Cert', 'Safety Officer'],
      department: 'Operations',
      hireDate: '2016-01-08',
      permissions: ['All Modules', 'User Management', 'Reports']
    },
    {
      id: 'USR005',
      name: 'Lisa Anderson',
      email: 'l.anderson@flightops.com',
      role: 'admin',
      status: 'Inactive',
      lastLogin: '2025-01-28 13:20',
      certifications: ['System Admin', 'Security Clearance'],
      department: 'IT',
      hireDate: '2017-09-12',
      permissions: ['Full System Access', 'User Management', 'System Config']
    },
    {
      id: 'USR006',
      name: 'Robert Garcia',
      email: 'r.garcia@flightops.com',
      role: 'safety-manager',
      status: 'Active',
      lastLogin: '2025-02-02 08:00',
      certifications: ['SMS Training', 'IS-BAO Auditor'],
      department: 'Safety',
      hireDate: '2019-04-01',
      permissions: ['Safety Reports', 'Hazard Management', 'Audit Management', 'Compliance']
    },
    {
      id: 'USR007',
      name: 'First Officer Emily Chen',
      email: 'e.chen@flightops.com',
      role: 'second-in-command',
      status: 'Active',
      lastLogin: '2025-02-01 18:00',
      certifications: ['Commercial', 'Type Rating G500', 'Medical Class 1'],
      department: 'Flight Operations',
      hireDate: '2021-08-15',
      permissions: ['Flight Planning', 'FRAT Access', 'Schedule View']
    },
    {
      id: 'USR008',
      name: 'Tom Parker',
      email: 't.parker@flightops.com',
      role: 'mechanic',
      status: 'Active',
      lastLogin: '2025-02-02 07:30',
      certifications: ['A&P License'],
      department: 'Maintenance',
      hireDate: '2022-02-14',
      permissions: ['Maintenance Board', 'Work Orders']
    }
  ]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role.toLowerCase() === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    const category = Object.entries(ROLE_CATEGORIES).find(([_, roles]) => roles.some(r => r.value === role));
    if (!category) return 'bg-gray-100 text-gray-800 border-gray-200';
    switch (category[0]) {
      case 'Flight Operations': return 'bg-green-100 text-green-800 border-green-200';
      case 'Cabin & Inflight': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Safety & Compliance': return 'bg-red-100 text-red-800 border-red-200';
      case 'Management & Admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast.success(`Role updated to ${getRoleLabelByValue(newRole)}`);
  };

  const handlePermissionToggle = (userId: string, permission: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const has = u.permissions.includes(permission);
      return {
        ...u,
        permissions: has
          ? u.permissions.filter(p => p !== permission)
          : [...u.permissions, permission]
      };
    }));
  };

  const handleSelectAllPermissions = (userId: string, categoryPermissions: string[], select: boolean) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      if (select) {
        const toAdd = categoryPermissions.filter(p => !u.permissions.includes(p));
        return { ...u, permissions: [...u.permissions, ...toAdd] };
      } else {
        return { ...u, permissions: u.permissions.filter(p => !categoryPermissions.includes(p)) };
      }
    }));
  };

  const [permDialogUser, setPermDialogUser] = useState<string | null>(null);

  const getStats = () => {
    return {
      total: users.length,
      active: users.filter(u => u.status === 'Active').length,
      inactive: users.filter(u => u.status === 'Inactive').length,
      roles: {
        admin: users.filter(u => u.role === 'Admin').length,
        lead: users.filter(u => u.role === 'Lead').length,
        pilot: users.filter(u => u.role === 'Pilot').length,
        maintenance: users.filter(u => u.role === 'Maintenance').length,
        inflight: users.filter(u => u.role === 'Inflight').length,
      }
    };
  };

  const stats = getStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h1>User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>

        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.roles.admin}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Inflight</p>
                <p className="text-2xl font-bold">{stats.roles.inflight}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tools Navigation */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Administrator Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/admin/airport-evaluation-officer')}
              className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-transparent hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Airport Evaluation Officer</p>
                  <p className="text-sm text-muted-foreground">Review airport submissions & data</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 transition-colors" />
            </button>

            <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-100 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">System Configuration</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                  <SelectGroup key={category}>
                    <SelectLabel className="text-xs font-bold text-gray-400 uppercase">{category}</SelectLabel>
                    {roles.map(role => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(val: string) => handleRoleChange(user.id, val)}>
                        <SelectTrigger className="w-[200px] h-8 text-xs border-dashed">
                          <div className="flex items-center gap-1.5">
                            <UserCog className="w-3 h-3 text-muted-foreground shrink-0" />
                            <Badge className={`${getRoleColor(user.role)} text-[10px] px-1.5 py-0`}>{getRoleLabelByValue(user.role)}</Badge>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                            <SelectGroup key={category}>
                              <SelectLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider">{category}</SelectLabel>
                              {roles.map(role => (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{role.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{role.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setPermDialogUser(user.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer group"
                      >
                        <Shield className="w-3 h-3 text-muted-foreground group-hover:text-blue-500" />
                        <span className="text-xs text-muted-foreground group-hover:text-blue-600">{user.permissions.length} permissions</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.lastLogin).toLocaleDateString()} {new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit User - {user.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Name</Label>
                                  <Input defaultValue={user.name} />
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <Input defaultValue={user.email} />
                                </div>
                                <div>
                                  <Label>Role / Title</Label>
                                  <Select defaultValue={user.role}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                      {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                                        <SelectGroup key={category}>
                                          <SelectLabel className="text-xs font-bold text-gray-400 uppercase">{category}</SelectLabel>
                                          {roles.map(role => (
                                            <SelectItem key={role.value} value={role.value}>
                                              <div className="flex flex-col">
                                                <span className="font-medium">{role.label}</span>
                                                <span className="text-[10px] text-muted-foreground">{role.description}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Select defaultValue={user.status.toLowerCase()}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                      <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Department</Label>
                                  <Input defaultValue={user.department} />
                                </div>
                                <div>
                                  <Label>Hire Date</Label>
                                  <Input type="date" defaultValue={user.hireDate} />
                                </div>
                              </div>

                              <div>
                                <Label>Certifications</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {user.certifications.map((cert, index) => (
                                    <Badge key={index} variant="outline">{cert}</Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label className="flex items-center justify-between">
                                  <span>Permissions ({user.permissions.length})</span>
                                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => setPermDialogUser(user.id)}>Manage All →</Button>
                                </Label>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {user.permissions.map((permission, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-red-100 hover:text-red-700 hover:border-red-200 transition-colors group"
                                      onClick={() => handlePermissionToggle(user.id, permission)}
                                    >
                                      {permission}
                                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button onClick={() => toast.success('User saved successfully')}>Save Changes</Button>
                                <Button variant="outline">Cancel</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No users match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Management Dialog */}
      <Dialog open={permDialogUser !== null} onOpenChange={(open) => !open && setPermDialogUser(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {permDialogUser && (() => {
            const user = users.find(u => u.id === permDialogUser);
            if (!user) return null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Manage Permissions — {user.name}
                  </DialogTitle>
                  <DialogDescription>
                    Toggle individual permissions or use "Select All" to grant an entire category. Current role: <Badge className={`${getRoleColor(user.role)} text-xs ml-1`}>{getRoleLabelByValue(user.role)}</Badge>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
                    const allSelected = category.permissions.every(p => user.permissions.includes(p));
                    const someSelected = category.permissions.some(p => user.permissions.includes(p));
                    return (
                      <div key={key} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b">
                          <Label className="font-semibold text-sm">{category.label}</Label>
                          <button
                            onClick={() => handleSelectAllPermissions(user.id, category.permissions, !allSelected)}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${allSelected
                              ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                              }`}
                          >
                            {allSelected ? '✓ All Selected' : 'Select All'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-4">
                          {category.permissions.map(permission => (
                            <label
                              key={permission}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5 transition-colors"
                            >
                              <Checkbox
                                checked={user.permissions.includes(permission)}
                                onCheckedChange={() => handlePermissionToggle(user.id, permission)}
                              />
                              <span className="text-sm">{permission}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center">
                  <span className="text-xs text-muted-foreground">{user.permissions.length} of {ALL_PERMISSIONS.length} permissions granted</span>
                  <Button onClick={() => { setPermDialogUser(null); toast.success('Permissions updated'); }}>Done</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
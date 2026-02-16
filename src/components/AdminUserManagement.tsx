import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
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
  ChevronRight
} from 'lucide-react';

export default function AdminUserManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const users = [
    {
      id: 'USR001',
      name: 'Captain John Smith',
      email: 'j.smith@flightops.com',
      role: 'Pilot',
      status: 'Active',
      lastLogin: '2025-02-01 14:30',
      certifications: ['ATP', 'Type Rating B737', 'Medical Class 1'],
      department: 'Flight Operations',
      hireDate: '2018-03-15',
      permissions: ['Flight Planning', 'FRAT Access', 'Schedule View']
    },
    {
      id: 'USR002',
      name: 'Sarah Wilson',
      email: 's.wilson@flightops.com',
      role: 'Maintenance',
      status: 'Active',
      lastLogin: '2025-02-02 09:15',
      certifications: ['A&P License', 'Avionics Specialist'],
      department: 'Maintenance',
      hireDate: '2020-06-10',
      permissions: ['Maintenance Board', 'Work Orders', 'Parts Inventory']
    },
    {
      id: 'USR003',
      name: 'Mike Johnson',
      email: 'm.johnson@flightops.com',
      role: 'Inflight',
      status: 'Active',
      lastLogin: '2025-02-01 16:45',
      certifications: ['Flight Attendant Cert', 'Safety Training'],
      department: 'Cabin Services',
      hireDate: '2019-11-22',
      permissions: ['Passenger Services', 'Safety Reports', 'Schedule View', 'Passenger Database']
    },
    {
      id: 'USR004',
      name: 'David Brown',
      email: 'd.brown@flightops.com',
      role: 'Lead',
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
      role: 'Admin',
      status: 'Inactive',
      lastLogin: '2025-01-28 13:20',
      certifications: ['System Admin', 'Security Clearance'],
      department: 'IT',
      hireDate: '2017-09-12',
      permissions: ['Full System Access', 'User Management', 'System Config']
    }
  ];

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
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'lead': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pilot': return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'inflight': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="pilot">Pilot</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inflight">Inflight</SelectItem>
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
                  <TableHead>Department</TableHead>
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
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.department}</TableCell>
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
                                  <Label>Role</Label>
                                  <Select defaultValue={user.role.toLowerCase()}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="lead">Lead</SelectItem>
                                      <SelectItem value="pilot">Pilot</SelectItem>
                                      <SelectItem value="maintenance">Maintenance</SelectItem>
                                      <SelectItem value="inflight">Inflight</SelectItem>
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
                                <Label>Permissions</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {user.permissions.map((permission, index) => (
                                    <Badge key={index} variant="secondary">{permission}</Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2 pt-4">
                                <Button>Save Changes</Button>
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
    </div>
  );
}
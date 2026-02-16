import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Search,
  Filter,
  Download,
  Plus,
  Settings,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Part {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  vendor: string;
  location: string;
  leadTime: number;
  lastOrdered: string;
  serialTracked: boolean;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'on-order';
  aircraftCompatibility: string[];
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  parts: Array<{
    partNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalAmount: number;
  orderDate: string;
  expectedDelivery: string;
  status: 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  urgency: 'routine' | 'priority' | 'aog';
}

interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  rating: number;
  leadTime: number;
  onTimeDelivery: number;
  status: 'active' | 'inactive';
  certifications: string[];
}

interface StockAlert {
  id: string;
  partNumber: string;
  description: string;
  currentStock: number;
  minStock: number;
  type: 'low-stock' | 'out-of-stock' | 'overstock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
}

export default function PartsInventory() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [parts, setParts] = useState<Part[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [myCMPConnected, setMyCMPConnected] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    // Initialize with mock data that would come from myCMP API
    setParts([
      {
        id: '1',
        partNumber: 'G650-ENG-001',
        description: 'Engine Oil Filter',
        category: 'Engine',
        currentStock: 3,
        minStock: 5,
        maxStock: 15,
        unitCost: 485.50,
        totalValue: 1456.50,
        vendor: 'Rolls-Royce',
        location: 'Hangar A - Shelf B2',
        leadTime: 14,
        lastOrdered: '2024-12-15',
        serialTracked: false,
        status: 'low-stock',
        aircraftCompatibility: ['G650', 'G650ER']
      },
      {
        id: '2',
        partNumber: 'G650-AVN-042',
        description: 'Primary Flight Display Unit',
        category: 'Avionics',
        currentStock: 0,
        minStock: 1,
        maxStock: 3,
        unitCost: 125000.00,
        totalValue: 0,
        vendor: 'Honeywell',
        location: 'Secure Storage',
        leadTime: 45,
        lastOrdered: '2024-11-20',
        serialTracked: true,
        status: 'out-of-stock',
        aircraftCompatibility: ['G650', 'G650ER']
      },
      {
        id: '3',
        partNumber: 'G650-HYD-018',
        description: 'Hydraulic Pump Assembly',
        category: 'Hydraulics',
        currentStock: 8,
        minStock: 2,
        maxStock: 6,
        unitCost: 8750.00,
        totalValue: 70000.00,
        vendor: 'Parker Aerospace',
        location: 'Hangar A - High Value',
        leadTime: 28,
        lastOrdered: '2024-10-05',
        serialTracked: true,
        status: 'in-stock',
        aircraftCompatibility: ['G650', 'G650ER']
      },
      {
        id: '4',
        partNumber: 'G650-INT-003',
        description: 'Cabin LED Light Assembly',
        category: 'Interior',
        currentStock: 12,
        minStock: 4,
        maxStock: 20,
        unitCost: 320.00,
        totalValue: 3840.00,
        vendor: 'Diehl Aviation',
        location: 'Hangar B - Shelf C1',
        leadTime: 7,
        lastOrdered: '2024-12-20',
        serialTracked: false,
        status: 'in-stock',
        aircraftCompatibility: ['G650', 'G650ER']
      }
    ]);

    setPurchaseOrders([
      {
        id: '1',
        poNumber: 'PO-2024-1001',
        vendor: 'Rolls-Royce',
        parts: [
          {
            partNumber: 'G650-ENG-001',
            description: 'Engine Oil Filter',
            quantity: 10,
            unitCost: 485.50,
            totalCost: 4855.00
          }
        ],
        totalAmount: 4855.00,
        orderDate: '2024-12-28',
        expectedDelivery: '2025-01-15',
        status: 'approved',
        urgency: 'routine'
      },
      {
        id: '2',
        poNumber: 'PO-2024-1002',
        vendor: 'Honeywell',
        parts: [
          {
            partNumber: 'G650-AVN-042',
            description: 'Primary Flight Display Unit',
            quantity: 1,
            unitCost: 125000.00,
            totalCost: 125000.00
          }
        ],
        totalAmount: 125000.00,
        orderDate: '2024-12-29',
        expectedDelivery: '2025-02-15',
        status: 'pending',
        urgency: 'aog'
      }
    ]);

    setVendors([
      {
        id: '1',
        name: 'Rolls-Royce',
        contact: 'John Smith',
        email: 'orders@rolls-royce.com',
        phone: '+1-555-0101',
        rating: 4.8,
        leadTime: 14,
        onTimeDelivery: 96,
        status: 'active',
        certifications: ['FAA-PMA', 'EASA-21G', 'ISO-9001']
      },
      {
        id: '2',
        name: 'Honeywell',
        contact: 'Sarah Johnson',
        email: 'aviation@honeywell.com',
        phone: '+1-555-0102',
        rating: 4.9,
        leadTime: 21,
        onTimeDelivery: 98,
        status: 'active',
        certifications: ['FAA-PMA', 'EASA-21G', 'AS9100']
      },
      {
        id: '3',
        name: 'Parker Aerospace',
        contact: 'Mike Wilson',
        email: 'sales@parker.com',
        phone: '+1-555-0103',
        rating: 4.6,
        leadTime: 18,
        onTimeDelivery: 94,
        status: 'active',
        certifications: ['FAA-PMA', 'EASA-21G']
      }
    ]);

    setStockAlerts([
      {
        id: '1',
        partNumber: 'G650-ENG-001',
        description: 'Engine Oil Filter',
        currentStock: 3,
        minStock: 5,
        type: 'low-stock',
        severity: 'medium',
        acknowledged: false
      },
      {
        id: '2',
        partNumber: 'G650-AVN-042',
        description: 'Primary Flight Display Unit',
        currentStock: 0,
        minStock: 1,
        type: 'out-of-stock',
        severity: 'critical',
        acknowledged: false
      }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
      case 'low-stock':
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
      case 'on-order':
        return <Badge className="bg-blue-100 text-blue-800">On Order</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPOStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case 'shipped':
        return <Badge className="bg-purple-100 text-purple-800">Shipped</Badge>;
      case 'received':
        return <Badge className="bg-green-100 text-green-800">Received</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'routine':
        return <Badge variant="outline">Routine</Badge>;
      case 'priority':
        return <Badge className="bg-orange-100 text-orange-800">Priority</Badge>;
      case 'aog':
        return <Badge className="bg-red-100 text-red-800">AOG</Badge>;
      default:
        return <Badge>{urgency}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getStockLevel = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    return {
      percentage,
      color: current === 0 ? 'bg-red-500' : 
             current <= min ? 'bg-yellow-500' : 
             percentage > 80 ? 'bg-orange-500' : 'bg-green-500'
    };
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || part.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const totalInventoryValue = parts.reduce((sum, part) => sum + part.totalValue, 0);
  const lowStockParts = parts.filter(part => part.status === 'low-stock' || part.status === 'out-of-stock').length;
  const pendingOrders = purchaseOrders.filter(po => po.status === 'pending' || po.status === 'approved').length;

  const syncWithMyCMP = async () => {
    toast.info('Syncing with myCMP...');
    // Simulate API call
    setTimeout(() => {
      setLastSync(new Date());
      toast.success('Successfully synced with myCMP');
    }, 2000);
  };

  const acknowledgeAlert = (alertId: string) => {
    setStockAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
    toast.success('Alert acknowledged');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parts & Inventory Management</h1>
          <p className="text-muted-foreground">
            Integrated with myCMP for G650 parts tracking and procurement
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={syncWithMyCMP} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Sync myCMP
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      {/* myCMP Connection Status */}
      <Alert className={myCMPConnected ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <div className="flex items-center">
          {myCMPConnected ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className="ml-2">
            myCMP Connection: {myCMPConnected ? 'Active' : 'Disconnected'} | 
            Last Sync: {lastSync.toLocaleString()}
          </AlertDescription>
        </div>
      </Alert>

      {/* Stock Alerts */}
      {stockAlerts.filter(alert => !alert.acknowledged).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {stockAlerts.filter(alert => !alert.acknowledged).length} stock alerts require attention
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{parts.length}</div>
                <p className="text-xs text-muted-foreground">
                  {parts.filter(p => p.status === 'in-stock').length} in stock
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalInventoryValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total asset value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockParts}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting delivery
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by part number or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Engine">Engine</SelectItem>
                <SelectItem value="Avionics">Avionics</SelectItem>
                <SelectItem value="Hydraulics">Hydraulics</SelectItem>
                <SelectItem value="Interior">Interior</SelectItem>
                <SelectItem value="Landing Gear">Landing Gear</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Parts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>Current stock levels and part information</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => {
                    const stockLevel = getStockLevel(part.currentStock, part.minStock, part.maxStock);
                    
                    return (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.partNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{part.description}</p>
                            {part.serialTracked && (
                              <Badge variant="outline" className="text-xs">Serial Tracked</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{part.category}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{part.currentStock}</span>
                              <span className="text-muted-foreground">/ {part.maxStock}</span>
                            </div>
                            <Progress 
                              value={stockLevel.percentage} 
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              Min: {part.minStock}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>${part.unitCost.toLocaleString()}</TableCell>
                        <TableCell>${part.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{part.vendor}</TableCell>
                        <TableCell>{getStatusBadge(part.status)}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedPart(part)}>
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{part.partNumber} - Details</DialogTitle>
                                <DialogDescription>{part.description}</DialogDescription>
                              </DialogHeader>
                              {selectedPart && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Category</Label>
                                      <p>{selectedPart.category}</p>
                                    </div>
                                    <div>
                                      <Label>Location</Label>
                                      <p>{selectedPart.location}</p>
                                    </div>
                                    <div>
                                      <Label>Current Stock</Label>
                                      <p>{selectedPart.currentStock} units</p>
                                    </div>
                                    <div>
                                      <Label>Min/Max Stock</Label>
                                      <p>{selectedPart.minStock} / {selectedPart.maxStock}</p>
                                    </div>
                                    <div>
                                      <Label>Unit Cost</Label>
                                      <p>${selectedPart.unitCost.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Total Value</Label>
                                      <p>${selectedPart.totalValue.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <Label>Lead Time</Label>
                                      <p>{selectedPart.leadTime} days</p>
                                    </div>
                                    <div>
                                      <Label>Last Ordered</Label>
                                      <p>{selectedPart.lastOrdered}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label>Aircraft Compatibility</Label>
                                    <div className="mt-2 flex space-x-2">
                                      {selectedPart.aircraftCompatibility.map((aircraft, index) => (
                                        <Badge key={index} variant="outline">{aircraft}</Badge>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex space-x-2 pt-4">
                                    <Button>Create Purchase Order</Button>
                                    <Button variant="outline">Update Stock</Button>
                                    <Button variant="outline">Edit Part</Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Track purchase orders and delivery status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Parts</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.poNumber}</TableCell>
                      <TableCell>{order.vendor}</TableCell>
                      <TableCell>
                        {order.parts.map((part, index) => (
                          <div key={index} className="text-sm">
                            {part.partNumber} (Qty: {part.quantity})
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>${order.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(order.expectedDelivery).toLocaleDateString()}</TableCell>
                      <TableCell>{getUrgencyBadge(order.urgency)}</TableCell>
                      <TableCell>{getPOStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Management</CardTitle>
              <CardDescription>Manage vendor relationships and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>On-Time Delivery</TableHead>
                    <TableHead>Certifications</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        <div>
                          <p>{vendor.contact}</p>
                          <p className="text-sm text-muted-foreground">{vendor.email}</p>
                          <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="text-yellow-500">★</span>
                          <span className="ml-1">{vendor.rating}/5.0</span>
                        </div>
                      </TableCell>
                      <TableCell>{vendor.leadTime} days</TableCell>
                      <TableCell>{vendor.onTimeDelivery}%</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {vendor.certifications.map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {vendor.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
              <CardDescription>Critical inventory alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg ${
                      alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            alert.severity === 'critical' ? 'text-red-500' : 
                            alert.severity === 'high' ? 'text-orange-500' : 
                            'text-yellow-500'
                          }`} />
                          <span className="font-medium">{alert.partNumber}</span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                        <p className="text-sm">
                          Current Stock: <span className="font-medium">{alert.currentStock}</span> | 
                          Minimum Required: <span className="font-medium">{alert.minStock}</span>
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {!alert.acknowledged && (
                          <>
                            <Button size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                              Acknowledge
                            </Button>
                            <Button size="sm" variant="outline">
                              Create PO
                            </Button>
                          </>
                        )}
                        {alert.acknowledged && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                  <div className="text-3xl font-bold">2.4x</div>
                  <p className="text-muted-foreground">Annual turnover rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Engine Parts</span>
                    <span className="font-semibold">$45,678</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avionics</span>
                    <span className="font-semibold">$125,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hydraulics</span>
                    <span className="font-semibold">$70,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interior</span>
                    <span className="font-semibold">$3,840</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
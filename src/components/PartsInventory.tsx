import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import SummaryBar from './shared/SummaryBar';
import RecordList, { RecordFold, RecordRow } from './shared/RecordList';
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

  // A part above its minimum needs nothing from anyone, so it folds out of the way.
  // Ordering matches the page's own low-stock definition (see lowStockParts above).
  //
  // EXCEPT while searching or filtering. Someone who types a part number is looking
  // for THAT part, and a healthy part is the likeliest thing they are looking up;
  // folding it would answer a direct question with an empty list and a drawer.
  // A deliberate query beats the fold's default.
  const isNarrowingParts = searchTerm.trim() !== '' || filterCategory !== 'all';
  const partsNeedingAttention = isNarrowingParts
    ? filteredParts
    : filteredParts.filter(part => part.status !== 'in-stock');
  const partsInStock = isNarrowingParts
    ? []
    : filteredParts.filter(part => part.status === 'in-stock');

  const ordersOutstanding = purchaseOrders.filter(o => o.status !== 'received' && o.status !== 'cancelled');
  const ordersClosed = purchaseOrders.filter(o => o.status === 'received' || o.status === 'cancelled');

  const orderMeta = (order: PurchaseOrder) =>
    `${order.parts.length} line${order.parts.length === 1 ? '' : 's'} \u00b7 $${order.totalAmount.toLocaleString()} \u00b7 due ${new Date(order.expectedDelivery).toLocaleDateString()}`;

  // What a tech needs before tapping through: how many are on the shelf against the
  // minimum, and where. Cost and total value belong in the detail, not the scan line.
  const partMeta = (part: Part) =>
    [
      part.description,
      `${part.currentStock} of ${part.maxStock} (min ${part.minStock})`,
      part.location,
      part.serialTracked ? 'serial tracked' : null,
    ].filter(Boolean).join(' \u00b7 ');

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

  // No page padding — Navigation's <main> is already p-6 pb-20 md:pb-6, and the
  // second p-6 cost 48px of a 390pt phone.
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Parts & Inventory Management</h1>
          <p className="text-muted-foreground">
            Integrated with myCMP for G650 parts tracking and procurement
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
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
        {/* The icon must be a DIRECT child: Alert is a grid whose `has-[>svg]`
            column rule only fires on a top-level svg. Wrapped, the text column
            collapsed to ~130pt on a phone. */}
        {myCMPConnected ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          myCMP connection: {myCMPConnected ? 'active' : 'disconnected'} · last sync {lastSync.toLocaleString()}
        </AlertDescription>
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
        {/* Five labels in a five-column grid overlap each other at 390pt. Scrolling
            the strip is the phone idiom, but a scroll container with no arrow and no
            fade is invisible — two of the five tabs start off-screen. The mask fades
            the right edge while there is more to reach, so the strip reads as cut off
            rather than finished. Removed once the grid returns. */}
        <TabsList className="w-full flex overflow-x-auto justify-start [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] sm:mask-none sm:grid sm:grid-cols-5">
          <TabsTrigger value="inventory" className="shrink-0">Inventory</TabsTrigger>
          <TabsTrigger value="orders" className="shrink-0">Purchase Orders</TabsTrigger>
          <TabsTrigger value="vendors" className="shrink-0">Vendors</TabsTrigger>
          <TabsTrigger value="alerts" className="shrink-0">Stock Alerts</TabsTrigger>
          <TabsTrigger value="analytics" className="shrink-0">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Four stat Cards were a screen and a half of chrome on a phone before
              the first part. The same numbers read fine as one wrapping line, and
              the two exception counts vanish at zero rather than reading as a score. */}
          <SummaryBar
            items={[
              { label: 'parts', value: parts.length, icon: Package },
              { label: 'in stock', value: parts.filter(p => p.status === 'in-stock').length },
              { label: 'inventory value', value: `$${totalInventoryValue.toLocaleString()}`, icon: DollarSign },
              { label: 'low or out of stock', value: lowStockParts, icon: AlertTriangle, tone: 'alert', hideWhenZero: true },
              { label: 'orders awaiting delivery', value: pendingOrders, icon: Truck, hideWhenZero: true },
            ]}
          />


          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
              <SelectTrigger className="w-full sm:w-48">
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

          {/* Was a nine-column table — Part Number / Description / Category / Stock
              Level / Unit Cost / Total Value / Vendor / Status / Actions. Nine columns
              cannot be made to work at 390pt, and a hangar phone is where a part gets
              looked up. The row states what is short; a part sitting comfortably above
              its minimum needs nothing from anyone, so it folds away. */}
          <Card>
            <CardHeader>
              <CardTitle>Parts Inventory</CardTitle>
              <CardDescription>Current stock levels and part information</CardDescription>
            </CardHeader>
            <CardContent>
              <RecordList>
                {partsNeedingAttention.map((part) => (
                  <RecordRow
                    key={part.id}
                    title={part.partNumber}
                    meta={partMeta(part)}
                    trailing={getStatusBadge(part.status)}
                    onOpen={() => setSelectedPart(part)}
                  />
                ))}
                {partsNeedingAttention.length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    {isNarrowingParts ? 'No part matches that search.' : 'Every part is above its minimum.'}
                  </p>
                )}
                {partsInStock.length > 0 && (
                  <RecordFold label={`${partsInStock.length} in stock`}>
                    {partsInStock.map((part) => (
                      <RecordRow
                        key={part.id}
                        title={part.partNumber}
                        meta={partMeta(part)}
                        onOpen={() => setSelectedPart(part)}
                      />
                    ))}
                  </RecordFold>
                )}
              </RecordList>
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
              {/* Eight columns became one row per order. A received or cancelled PO is
                  history, so it folds; what is left is what is still coming. */}
              <RecordList>
                {ordersOutstanding.map((order) => (
                  <RecordRow
                    key={order.id}
                    title={`${order.poNumber} \u00b7 ${order.vendor}`}
                    meta={orderMeta(order)}
                    trailing={getUrgencyBadge(order.urgency)}
                  />
                ))}
                {ordersOutstanding.length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground">Nothing on order.</p>
                )}
                {ordersClosed.length > 0 && (
                  <RecordFold label={`${ordersClosed.length} received or cancelled`}>
                    {ordersClosed.map((order) => (
                      <RecordRow
                        key={order.id}
                        title={`${order.poNumber} \u00b7 ${order.vendor}`}
                        meta={orderMeta(order)}
                        trailing={getPOStatusBadge(order.status)}
                      />
                    ))}
                  </RecordFold>
                )}
              </RecordList>
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
              {/* Seven columns became one row per vendor. The certifications list is
                  the reason to open a vendor, not the reason to scan the list. */}
              <RecordList>
                {vendors.map((vendor) => (
                  <RecordRow
                    key={vendor.id}
                    title={vendor.name}
                    meta={`${vendor.contact} \u00b7 ${vendor.phone} \u00b7 \u2605 ${vendor.rating}/5.0 \u00b7 ${vendor.leadTime}d lead \u00b7 ${vendor.onTimeDelivery}% on time`}
                    trailing={
                      <Badge className={`shrink-0 ${vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {vendor.status}
                      </Badge>
                    }
                  />
                ))}
              </RecordList>
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

      {/* One dialog for the page, driven by the selected part — it used to be
          re-declared inside every row of the table. */}
      <Dialog open={!!selectedPart} onOpenChange={(open) => !open && setSelectedPart(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPart && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPart.partNumber} - Details</DialogTitle>
                <DialogDescription>{selectedPart.description}</DialogDescription>
              </DialogHeader>
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
                    <Label>Vendor</Label>
                    <p>{selectedPart.vendor}</p>
                  </div>
                  <div>
                    <Label>Lead Time</Label>
                    <p>{selectedPart.leadTime} days</p>
                  </div>
                </div>

                <div>
                  <Label>Stock level</Label>
                  <Progress value={getStockLevel(selectedPart.currentStock, selectedPart.minStock, selectedPart.maxStock).percentage} className="h-2 mt-2" />
                </div>

                <div>
                  <Label>Aircraft Compatibility</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPart.aircraftCompatibility.map((aircraft, index) => (
                      <Badge key={index} variant="outline">{aircraft}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button>Create Purchase Order</Button>
                  <Button variant="outline">Update Stock</Button>
                  <Button variant="outline">Edit Part</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
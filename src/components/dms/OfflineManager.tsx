import React, { useState, useEffect } from 'react';
import { dmsDocuments, dmsRevisions } from '../../data/dmsData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
    Download,
    Cloud,
    CloudOff,
    HardDrive,
    Trash2,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Wifi,
    WifiOff,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CachedDocument {
    revisionId: string;
    documentId: string;
    title: string;
    versionLabel: string;
    cachedAt: Date;
    size: number; // in bytes
    checksum: string;
}

// Simulated IndexedDB-like storage using localStorage for demo
// In production, use actual IndexedDB with capacitor-filesystem
const STORAGE_KEY = 'dms_offline_documents';
const LAST_SYNC_KEY = 'dms_last_sync';

const getStoredDocs = (): CachedDocument[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveStoredDocs = (docs: CachedDocument[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
};

const getLastSyncTime = (): Date | null => {
    try {
        const stored = localStorage.getItem(LAST_SYNC_KEY);
        return stored ? new Date(JSON.parse(stored)) : null;
    } catch {
        return null;
    }
};

const saveLastSyncTime = (date: Date) => {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(date));
};

export default function OfflineManager() {
    const [cachedDocs, setCachedDocs] = useState<CachedDocument[]>(getStoredDocs());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [autoSync, setAutoSync] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(getLastSyncTime());

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Connection restored', { description: 'You are back online.' });
            if (autoSync) {
                handleSync();
            }
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning('Connection lost', { description: 'Working in offline mode.' });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [autoSync]);

    // Get all documents with their revisions
    const allDocuments = dmsDocuments.map(doc => {
        const revision = dmsRevisions.find(r => r.documentId === doc.id && r.isActive);
        const cached = cachedDocs.find(c => c.revisionId === revision?.id);
        return {
            ...doc,
            revision,
            cached,
            isCached: !!cached,
        };
    });

    const handleDownload = async (docId: string) => {
        const doc = allDocuments.find(d => d.id === docId);
        if (!doc || !doc.revision) return;

        setDownloading(doc.revision.id);
        setDownloadProgress(0);

        // Simulate download with progress
        for (let i = 0; i <= 100; i += 10) {
            await new Promise(resolve => setTimeout(resolve, 200));
            setDownloadProgress(i);
        }

        // Add to cached documents
        const newCached: CachedDocument = {
            revisionId: doc.revision.id,
            documentId: doc.id,
            title: doc.title,
            versionLabel: doc.revision.versionLabel,
            cachedAt: new Date(),
            size: Math.floor(Math.random() * 5000000) + 1000000, // 1-6MB
            checksum: doc.revision.fileChecksum,
        };

        const updatedDocs = [...cachedDocs.filter(c => c.revisionId !== doc.revision!.id), newCached];
        setCachedDocs(updatedDocs);
        saveStoredDocs(updatedDocs);

        setDownloading(null);
        setDownloadProgress(0);

        toast.success('Document downloaded', {
            description: `${doc.title} is now available offline.`,
        });
    };

    const handleRemove = (revisionId: string) => {
        const updatedDocs = cachedDocs.filter(c => c.revisionId !== revisionId);
        setCachedDocs(updatedDocs);
        saveStoredDocs(updatedDocs);
        toast.success('Document removed from offline storage');
    };

    const handleSync = async () => {
        setSyncing(true);

        // Simulate checking for updates
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if any cached docs have newer versions
        let updatesFound = 0;
        for (const cached of cachedDocs) {
            const revision = dmsRevisions.find(r => r.id === cached.revisionId);
            if (revision && revision.fileChecksum !== cached.checksum) {
                updatesFound++;
            }
        }

        // Update last sync time
        const now = new Date();
        setLastSyncTime(now);
        saveLastSyncTime(now);

        setSyncing(false);

        if (updatesFound > 0) {
            toast.info(`${updatesFound} document update(s) available`);
        } else {
            toast.success('All documents are up to date');
        }
    };

    const handleDownloadAll = async () => {
        for (const doc of allDocuments) {
            if (!doc.isCached && doc.revision) {
                await handleDownload(doc.id);
            }
        }
    };

    const totalCachedSize = cachedDocs.reduce((acc, doc) => acc + doc.size, 0);
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Offline Documents</h1>
                    <p className="text-muted-foreground">
                        Download documents for offline access on your device
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {/* Online Status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>

                    {/* Last Sync Time */}
                    {lastSyncTime && (
                        <div className="text-sm text-muted-foreground text-right">
                            <span className="text-xs">Last synced:</span>
                            <p className="font-medium">{format(lastSyncTime, 'MMM d, h:mm a')}</p>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handleSync}
                        disabled={!isOnline || syncing}
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Cached Documents</p>
                                <p className="text-3xl font-bold">{cachedDocs.length}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <HardDrive className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            of {allDocuments.length} total documents
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Storage Used</p>
                                <p className="text-3xl font-bold">{formatSize(totalCachedSize)}</p>
                            </div>
                            <div className="p-3 bg-blue-500/20 rounded-xl">
                                <Cloud className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                        <Progress value={(totalCachedSize / (50 * 1024 * 1024)) * 100} className="mt-2 h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1">
                            of 50 MB available
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Auto-Sync</p>
                                <p className="text-lg font-medium mt-1">
                                    {autoSync ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Automatically sync when online
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Offline Notice */}
            {!isOnline && (
                <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                            <div>
                                <p className="font-medium text-amber-400">You are currently offline</p>
                                <p className="text-sm text-muted-foreground">
                                    Only cached documents are available. Changes will sync when you're back online.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Documents Table */}
            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Available Documents
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={handleDownloadAll}
                        disabled={!isOnline || allDocuments.every(d => d.isCached)}
                        className="gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Download All
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Document</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Cached</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allDocuments.map(doc => (
                                <TableRow key={doc.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{doc.title}</p>
                                                <p className="text-xs text-muted-foreground">{doc.category}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{doc.revision?.versionLabel || 'N/A'}</span>
                                    </TableCell>
                                    <TableCell>
                                        {doc.isCached ? (
                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Cached
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 gap-1">
                                                <CloudOff className="w-3 h-3" />
                                                Not Cached
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {doc.cached
                                            ? format(new Date(doc.cached.cachedAt), 'MMM d, h:mm a')
                                            : '—'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {downloading === doc.revision?.id ? (
                                            <div className="flex items-center gap-2">
                                                <Progress value={downloadProgress} className="w-20 h-2" />
                                                <span className="text-xs text-muted-foreground">{downloadProgress}%</span>
                                            </div>
                                        ) : doc.isCached ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemove(doc.cached!.revisionId)}
                                                className="gap-1 text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDownload(doc.id)}
                                                disabled={!isOnline}
                                                className="gap-1"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Technical Note */}
            <Card className="bg-muted/30 border-border/50">
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> In a production mobile app (Capacitor/React Native), documents would be stored
                        using native filesystem APIs for guaranteed persistence. This demo uses browser storage for illustration.
                        Actual implementation would use <code className="bg-muted px-1 rounded">@capacitor/filesystem</code> and
                        IndexedDB with integrity checksums.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

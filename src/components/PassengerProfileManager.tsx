import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Trash2, UserPlus, Save, X } from 'lucide-react';
import { useTaxContext, TaxProfile } from "./contexts/TaxContext";
import { toast } from "sonner";

export default function PassengerProfileManager() {
    const { profiles, addProfile, deleteProfile } = useTaxContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newProfile, setNewProfile] = useState<Partial<TaxProfile>>({
        designation: 'Standard'
    });

    const handleAdd = () => {
        if (!newProfile.name) {
            toast.error("Name is required");
            return;
        }
        addProfile({
            id: crypto.randomUUID(),
            name: newProfile.name,
            tNumber: newProfile.tNumber || 'N/A',
            title: newProfile.title || '',
            designation: newProfile.designation as any
        });
        setIsAdding(false);
        setNewProfile({ designation: 'Standard' });
        toast.success("Passenger Profile Added");
    };

    return (
        <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Executive Tax Profiles</CardTitle>
                    <CardDescription>Manage key employees and their tax statuses (Control Employee / CEO).</CardDescription>
                </div>
                <Button onClick={() => setIsAdding(true)} size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" /> Add Profile
                </Button>
            </CardHeader>
            <CardContent>
                {isAdding && (
                    <div className="mb-4 p-4 border rounded-md bg-muted/20 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                placeholder="Full Name"
                                value={newProfile.name || ''}
                                onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
                            />
                            <Input
                                placeholder="Employee ID (T-Number)"
                                value={newProfile.tNumber || ''}
                                onChange={e => setNewProfile({ ...newProfile, tNumber: e.target.value })}
                            />
                            <Input
                                placeholder="Job Title"
                                value={newProfile.title || ''}
                                onChange={e => setNewProfile({ ...newProfile, title: e.target.value })}
                            />
                            <Select
                                value={newProfile.designation}
                                onValueChange={(val: any) => setNewProfile({ ...newProfile, designation: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Designation" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Standard">Standard</SelectItem>
                                    <SelectItem value="Band 7">Band 7 (Control)</SelectItem>
                                    <SelectItem value="CEO">CEO (Security)</SelectItem>
                                    <SelectItem value="Board Member">Board Member</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleAdd}>Save Profile</Button>
                        </div>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Tax Designation</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.map((profile) => (
                            <TableRow key={profile.id}>
                                <TableCell className="font-medium">{profile.name}</TableCell>
                                <TableCell className="font-mono text-xs">{profile.tNumber}</TableCell>
                                <TableCell>{profile.title}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={
                                        profile.designation === 'CEO' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            profile.designation === 'Band 7' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                    }>
                                        {profile.designation}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => deleteProfile(profile.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {profiles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No profiles defined.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

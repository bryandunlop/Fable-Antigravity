import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../authConfig';
import { graphService } from '../services/microsoftGraph';
import {
    Settings,
    User,
    Moon,
    Sun,
    Monitor,
    Cloud,
    CloudOff,
    RefreshCw,
    Calendar,
    Check,
    Bell,
    Lock,
    Globe
} from 'lucide-react';

interface UserSettingsProps {
    userRole: string;
    userName?: string;
}

type ThemeMode = 'light' | 'dark' | 'system';

export default function UserSettings({ userRole, userName = 'User' }: UserSettingsProps) {
    // Theme state
    const [theme, setTheme] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('theme-mode');
        return (saved as ThemeMode) || 'system';
    });

    // Outlook Calendar sync state
    const [outlookConnected, setOutlookConnected] = useState(false);
    const [outlookSyncing, setOutlookSyncing] = useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [msalInstance] = useState(() => new PublicClientApplication(msalConfig));
    const [accessToken, setAccessToken] = useState<string | null>(null);

    // Notification preferences
    const [emailNotifications, setEmailNotifications] = useState(() => {
        return localStorage.getItem('email-notifications') !== 'false';
    });
    const [pushNotifications, setPushNotifications] = useState(() => {
        return localStorage.getItem('push-notifications') !== 'false';
    });

    // Apply theme to document
    useEffect(() => {
        const applyTheme = () => {
            const root = document.documentElement;

            if (theme === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.toggle('dark', systemPrefersDark);
            } else {
                root.classList.toggle('dark', theme === 'dark');
            }
        };

        applyTheme();
        localStorage.setItem('theme-mode', theme);

        // Listen for system theme changes if in system mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => applyTheme();
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    // Check for saved Outlook connection on mount
    useEffect(() => {
        const savedConnection = localStorage.getItem('outlook-connected');
        const savedAutoSync = localStorage.getItem('outlook-auto-sync');

        if (savedConnection === 'true') {
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                msalInstance
                    .acquireTokenSilent({
                        ...loginRequest,
                        account: accounts[0],
                    })
                    .then((response) => {
                        setAccessToken(response.accessToken);
                        graphService.initializeClient(response.accessToken);
                        setOutlookConnected(true);

                        if (savedAutoSync === 'true') {
                            setAutoSyncEnabled(true);
                        }
                    })
                    .catch(() => {
                        localStorage.removeItem('outlook-connected');
                    });
            }
        }
    }, [msalInstance]);

    // Outlook Calendar Integration Functions
    const connectOutlook = async () => {
        try {
            const loginResponse = await msalInstance.loginPopup(loginRequest);
            const account = loginResponse.account;

            if (account) {
                const tokenResponse = await msalInstance.acquireTokenSilent({
                    ...loginRequest,
                    account,
                });

                setAccessToken(tokenResponse.accessToken);
                graphService.initializeClient(tokenResponse.accessToken);
                setOutlookConnected(true);

                localStorage.setItem('outlook-connected', 'true');
                toast.success('Connected to Outlook Calendar');
            }
        } catch (error) {
            console.error('Error connecting to Outlook:', error);
            toast.error('Failed to connect to Outlook');
        }
    };

    const disconnectOutlook = () => {
        setOutlookConnected(false);
        setAccessToken(null);
        setAutoSyncEnabled(false);
        localStorage.removeItem('outlook-connected');
        localStorage.removeItem('outlook-auto-sync');
        toast.success('Disconnected from Outlook');
    };

    const toggleAutoSync = () => {
        const newValue = !autoSyncEnabled;
        setAutoSyncEnabled(newValue);
        localStorage.setItem('outlook-auto-sync', newValue.toString());

        if (newValue && outlookConnected) {
            toast.success('Auto-sync enabled');
        } else if (!newValue) {
            toast.success('Auto-sync disabled');
        }
    };

    const handleThemeChange = (newTheme: ThemeMode) => {
        setTheme(newTheme);
        toast.success(`Theme set to ${newTheme === 'system' ? 'follow system' : newTheme} mode`);
    };

    const toggleEmailNotifications = () => {
        const newValue = !emailNotifications;
        setEmailNotifications(newValue);
        localStorage.setItem('email-notifications', newValue.toString());
        toast.success(`Email notifications ${newValue ? 'enabled' : 'disabled'}`);
    };

    const togglePushNotifications = () => {
        const newValue = !pushNotifications;
        setPushNotifications(newValue);
        localStorage.setItem('push-notifications', newValue.toString());
        toast.success(`Push notifications ${newValue ? 'enabled' : 'disabled'}`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600">Manage your preferences and integrations</p>
                </div>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-gray-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
                </div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-gray-700">Name</span>
                        <span className="font-medium text-gray-900">{userName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-gray-700">Role</span>
                        <span className="font-medium text-gray-900 capitalize">{userRole}</span>
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Monitor className="w-5 h-5 text-gray-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Appearance</h2>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Choose how the application looks to you</p>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Light Mode */}
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${theme === 'light'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-blue-600' : 'text-gray-600'}`} />
                            <div className="text-center">
                                <div className={`font-medium ${theme === 'light' ? 'text-blue-900' : 'text-gray-900'}`}>
                                    Light
                                </div>
                                {theme === 'light' && (
                                    <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                                )}
                            </div>
                        </button>

                        {/* Dark Mode */}
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${theme === 'dark'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-600' : 'text-gray-600'}`} />
                            <div className="text-center">
                                <div className={`font-medium ${theme === 'dark' ? 'text-blue-900' : 'text-gray-900'}`}>
                                    Dark
                                </div>
                                {theme === 'dark' && (
                                    <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                                )}
                            </div>
                        </button>

                        {/* System Mode */}
                        <button
                            onClick={() => handleThemeChange('system')}
                            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${theme === 'system'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-blue-600' : 'text-gray-600'}`} />
                            <div className="text-center">
                                <div className={`font-medium ${theme === 'system' ? 'text-blue-900' : 'text-gray-900'}`}>
                                    System
                                </div>
                                {theme === 'system' && (
                                    <Check className="w-4 h-4 text-blue-600 mx-auto mt-1" />
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Outlook Calendar Integration */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Outlook Calendar Sync</h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            {outlookConnected ? (
                                <Cloud className="w-5 h-5 text-blue-600" />
                            ) : (
                                <CloudOff className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                                {outlookConnected ? 'Connected' : 'Not Connected'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {outlookConnected
                                    ? 'Your flights will sync to your Outlook calendar'
                                    : 'Connect your Outlook account to automatically sync flights'}
                            </p>
                        </div>
                    </div>

                    {outlookConnected && (
                        <div className="bg-white rounded-lg p-4 space-y-3">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <RefreshCw className="w-4 h-4 text-gray-600" />
                                    <div>
                                        <div className="font-medium text-gray-900">Auto-sync</div>
                                        <div className="text-xs text-gray-600">Automatically sync when flights change</div>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={autoSyncEnabled}
                                    onChange={toggleAutoSync}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {!outlookConnected ? (
                            <Button
                                onClick={connectOutlook}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                <Calendar className="w-4 h-4" />
                                Connect Outlook
                            </Button>
                        ) : (
                            <Button
                                onClick={disconnectOutlook}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <CloudOff className="w-4 h-4" />
                                Disconnect
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
                </div>

                <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer py-3 border-b border-gray-100">
                        <div>
                            <div className="font-medium text-gray-900">Email Notifications</div>
                            <div className="text-sm text-gray-600">Receive updates via email</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={emailNotifications}
                            onChange={toggleEmailNotifications}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-3">
                        <div>
                            <div className="font-medium text-gray-900">Push Notifications</div>
                            <div className="text-sm text-gray-600">Receive in-app notifications</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={pushNotifications}
                            onChange={togglePushNotifications}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                    </label>
                </div>
            </div>

            {/* Privacy & Security */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Lock className="w-5 h-5 text-gray-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Privacy & Security</h2>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                        Your data is stored securely and never shared with third parties.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                            <Globe className="w-4 h-4 mr-2" />
                            Privacy Policy
                        </Button>
                        <Button variant="outline" size="sm">
                            <Lock className="w-4 h-4 mr-2" />
                            Security Settings
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

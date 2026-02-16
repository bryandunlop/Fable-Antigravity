import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
                    <Card className="w-full max-w-lg border-red-200">
                        <CardHeader className="bg-red-50 border-b border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                </div>
                                <CardTitle className="text-red-900">Something went wrong</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="text-sm text-slate-600">
                                <p className="font-medium mb-2">The application encountered an unexpected error:</p>
                                <div className="p-3 bg-slate-100 rounded-md font-mono text-xs overflow-auto max-h-40 border border-slate-200">
                                    {this.state.error?.toString()}
                                </div>
                                {this.state.errorInfo && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-slate-500 hover:text-slate-800 transition-colors">View Stack Trace</summary>
                                        <pre className="mt-2 p-3 bg-slate-100 rounded-md font-mono text-[10px] overflow-auto max-h-60 border border-slate-200 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => window.location.href = '/'}
                                >
                                    Return Home
                                </Button>
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reload Page
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

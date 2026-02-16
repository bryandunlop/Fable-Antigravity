/**
 * MSAL Configuration for Microsoft Authentication
 * Used for authenticating users to access Microsoft Graph API
 */

import { Configuration, PopupRequest } from '@azure/msal-browser';

/**
 * MSAL Configuration
 * TODO: Replace clientId with your Azure AD Application (client) ID
 * Register your app at: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE', // Replace with your client ID
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin, // Must match redirect URI in Azure AD app registration
    },
    cache: {
        cacheLocation: 'sessionStorage', // Use sessionStorage for better security
        storeAuthStateInCookie: false, // Set to true for IE11 or Edge
    },
};

/**
 * Scopes for Microsoft Graph API
 * These permissions allow the app to read and write calendar events
 */
export const loginRequest: PopupRequest = {
    scopes: ['User.Read', 'Calendars.ReadWrite'],
};

/**
 * Graph API endpoint
 */
export const graphConfig = {
    graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
    graphCalendarEndpoint: 'https://graph.microsoft.com/v1.0/me/calendar',
};

/**
 * Microsoft Graph API Service
 * Handles interactions with Microsoft Graph API for Outlook Calendar
 */

import { Client } from '@microsoft/microsoft-graph-client';

interface Flight {
    id: string;
    flightNumber: string;
    tailNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    scheduledDeparture: string;
    scheduledArrival: string;
    crew: Array<{ id: string; name: string; role: string }>;
    status: 'scheduled' | 'departed' | 'arrived' | 'cancelled';
}

interface CalendarEvent {
    id: string;
    subject: string;
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    body: {
        contentType: string;
        content: string;
    };
    location: {
        displayName: string;
    };
    categories: string[];
}

class MicrosoftGraphService {
    private client: Client | null = null;

    /**
     * Initialize the Graph client with an access token
     */
    initializeClient(accessToken: string): void {
        this.client = Client.init({
            authProvider: (done) => {
                done(null, accessToken);
            },
        });
    }

    /**
     * Get calendar events within a date range
     */
    async getCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
        if (!this.client) {
            throw new Error('Graph client not initialized. Call initializeClient first.');
        }

        try {
            const response = await this.client
                .api('/me/calendar/events')
                .filter(
                    `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`
                )
                .select('id,subject,start,end,body,location,categories')
                .get();

            return response.value || [];
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw error;
        }
    }

    /**
     * Create a calendar event from a flight
     */
    async createCalendarEvent(flight: Flight): Promise<CalendarEvent> {
        if (!this.client) {
            throw new Error('Graph client not initialized. Call initializeClient first.');
        }

        const event = {
            subject: `Flight ${flight.flightNumber} - ${flight.tailNumber}`,
            start: {
                dateTime: new Date(flight.departureTime).toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(flight.arrivalTime).toISOString(),
                timeZone: 'UTC',
            },
            body: {
                contentType: 'HTML',
                content: this.generateFlightEventBody(flight),
            },
            location: {
                displayName: `${flight.origin} → ${flight.destination}`,
            },
            categories: ['Flight', 'MyAirOps'],
        };

        try {
            const response = await this.client.api('/me/calendar/events').post(event);
            return response;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            throw error;
        }
    }

    /**
     * Update an existing calendar event
     */
    async updateCalendarEvent(eventId: string, flight: Flight): Promise<CalendarEvent> {
        if (!this.client) {
            throw new Error('Graph client not initialized. Call initializeClient first.');
        }

        const event = {
            subject: `Flight ${flight.flightNumber} - ${flight.tailNumber}`,
            start: {
                dateTime: new Date(flight.departureTime).toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(flight.arrivalTime).toISOString(),
                timeZone: 'UTC',
            },
            body: {
                contentType: 'HTML',
                content: this.generateFlightEventBody(flight),
            },
            location: {
                displayName: `${flight.origin} → ${flight.destination}`,
            },
        };

        try {
            const response = await this.client.api(`/me/calendar/events/${eventId}`).patch(event);
            return response;
        } catch (error) {
            console.error('Error updating calendar event:', error);
            throw error;
        }
    }

    /**
     * Delete a calendar event
     */
    async deleteCalendarEvent(eventId: string): Promise<void> {
        if (!this.client) {
            throw new Error('Graph client not initialized. Call initializeClient first.');
        }

        try {
            await this.client.api(`/me/calendar/events/${eventId}`).delete();
        } catch (error) {
            console.error('Error deleting calendar event:', error);
            throw error;
        }
    }

    /**
     * Generate HTML body content for a flight event
     */
    private generateFlightEventBody(flight: Flight): string {
        const crewList = flight.crew.map((member) => `${member.name} (${member.role})`).join(', ');

        return `
      <div style="font-family: Arial, sans-serif;">
        <h3>Flight Details</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Flight Number:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${flight.flightNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Aircraft:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${flight.tailNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Route:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${flight.origin} → ${flight.destination}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Departure:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(flight.departureTime).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Arrival:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(flight.arrivalTime).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Crew:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${crewList}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${flight.status}</td>
          </tr>
        </table>
        <p style="margin-top: 16px; color: #666; font-size: 12px;">
          <em>This event was automatically created from MyAirOps flight schedule.</em>
        </p>
      </div>
    `;
    }

    /**
     * Find a calendar event by flight ID (stored in categories or custom property)
     */
    async findEventByFlightId(flightId: string): Promise<CalendarEvent | null> {
        if (!this.client) {
            throw new Error('Graph client not initialized. Call initializeClient first.');
        }

        try {
            // Search for events with MyAirOps category and matching flight ID in subject
            const response = await this.client
                .api('/me/calendar/events')
                .filter(`categories/any(c:c eq 'MyAirOps')`)
                .select('id,subject,start,end,body,location,categories')
                .get();

            const events = response.value || [];

            // Find event with matching flight ID in the subject or body
            const matchingEvent = events.find((event: CalendarEvent) =>
                event.body?.content?.includes(flightId) || event.subject?.includes(flightId)
            );

            return matchingEvent || null;
        } catch (error) {
            console.error('Error finding event by flight ID:', error);
            return null;
        }
    }
}

export const graphService = new MicrosoftGraphService();
export type { Flight, CalendarEvent };

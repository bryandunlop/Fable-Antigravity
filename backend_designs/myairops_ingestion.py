import requests
import json
from datetime import datetime

# Configuration
MYAIROPS_BASE_URL = "https://api.myairops.com/v2"  # Hypothetical V2 endpoint
API_KEY = "YOUR_API_KEY_HERE"  # In production, use environment variables
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def fetch_schedule_data(start_date, end_date):
    """
    Fetches flight schedule and manifest data from myairops API.
    """
    endpoint = f"{MYAIROPS_BASE_URL}/schedule"
    params = {
        "start": start_date,
        "end": end_date,
        "expand": "manifest,aircraft"  # Request nested objects
    }
    
    try:
        response = requests.get(endpoint, headers=HEADERS, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None

def process_flight_data(api_response):
    """
    Transforms API response into internal Leg objects.
    Flags 'Deadhead' if no passengers are present.
    """
    processed_legs = []
    
    if not api_response or 'flights' not in api_response:
        return processed_legs

    for flight in api_response['flights']:
        # Extract core leg details
        leg = {
            "external_id": flight.get("id"),
            "aircraft_tail": flight.get("aircraft", {}).get("registration"),
            "dep_airport": flight.get("departure_airport", {}).get("code_icao"),
            "arr_airport": flight.get("arrival_airport", {}).get("code_icao"),
            "block_time": flight.get("actual_flight_time", 0.0), # In decimal hours
            "distance_miles": flight.get("distance_nm", 0) * 1.15078, # Convert NM to Statute Miles
            "passengers": [],
            "leg_type": "Live",  # Default to Live
            "requires_owner_assignment": False
        }

        # Process Manifest
        manifest = flight.get("manifest", [])
        if manifest:
            for pax in manifest:
                leg["passengers"].append({
                    "name": pax.get("full_name"),
                    "relationship": pax.get("type", "Guest") # Mapping generic type to relationship placeholder
                })
        else:
            # Logic Check: No passengers = Deadhead
            leg["leg_type"] = "Deadhead"
            leg["requires_owner_assignment"] = True
        
        processed_legs.append(leg)

    return processed_legs

def webhook_handler_post_flight(payload):
    """
    Simulated Webhook Handler for 'Post-Flight' event.
    Updates ActualFlightTime for precise SEC billing.
    """
    print("Received Post-Flight Webhook")
    
    trip_id = payload.get("trip_id")
    actual_flight_time = payload.get("actual_flight_time")
    
    if trip_id and actual_flight_time:
        # Pseudo-code for DB update
        print(f"Updating DB: Leg {trip_id} -> Actual Time: {actual_flight_time} hours")
        # db.execute("UPDATE Legs SET BlockTime = ? WHERE ExternalID = ?", (actual_flight_time, trip_id))
        return {"status": "success", "message": "Flight time updated"}
    
    return {"status": "error", "message": "Invalid payload"}

# Example Usage
if __name__ == "__main__":
    # Mock date range
    data = fetch_schedule_data("2023-10-01", "2023-10-02")
    if data:
        legs = process_flight_data(data)
        print(json.dumps(legs, indent=2))

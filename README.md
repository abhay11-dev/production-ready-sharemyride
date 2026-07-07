# ShareMyRide - Location Search Integration

This document outlines the recent integration of the OpenStreetMap Nominatim API for location searching, replacing the previous implementations (Google Maps and Geoapify).

## Installation

No new dependencies were added as the backend already uses `axios`. The frontend continues to use its customized `axios` instance for API communication. No additional installation commands are required other than the standard:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## New Endpoint

A dedicated location search endpoint has been added to the backend which proxies requests to the OpenStreetMap Nominatim API.

### `GET /api/location/search`

This endpoint fetches location autocomplete suggestions. 

**Query Parameters:**
- `q` (string, required): The search query. Must be at least 2 characters long.

## Usage

On the frontend, the `LocationAutocomplete.jsx` component has been updated. It now calls the internal `/api/location/search` endpoint instead of relying on external SDKs like `@react-google-maps/api`. This centralizes the business logic, reduces client-side payload, and prevents CORS/API key issues on the client.

### Environment Variables

**No new environment variables are required.** OpenStreetMap's Nominatim API is free and does not require an API key for basic usage. The backend sets the required `User-Agent` header internally.

## Example Request

```bash
curl -X GET "http://localhost:5000/api/location/search?q=Mumbai"
```

## Example Response

```json
[
  {
    "id": "12345678",
    "placeId": "12345678",
    "label": "Mumbai, Maharashtra, India",
    "name": "Mumbai",
    "latitude": 19.0759837,
    "longitude": 72.8776559,
    "formatted": "Mumbai, Maharashtra, India",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "_secondary": "Mumbai, Maharashtra, India",
    "_icon": "🏙️",
    "_type": "city"
  }
]
```

## Manual Steps

- Since `googlePlaces.js` and `geoapify.js` in `frontend/src/utils/` are now unused orphans, they can be safely deleted or kept for reference if needed.
- Open `frontend/src/App.jsx` if you wish to remove the `<GoogleMapsProvider>` wrapper, as it is no longer strictly necessary for location search (unless other components like `RideMap.jsx` are still relying on `@react-google-maps/api` for rendering).

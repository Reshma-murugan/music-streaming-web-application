# iTunes API Documentation

## Overview
The iTunes Search API allows developers to access iTunes Store content including music, movies, TV shows, apps, books, and more. **No authentication required**.

## Base URL
```
https://itunes.apple.com
```

## Rate Limits
- **20 requests per minute per IP address**
- Exceeding limits returns `429 Too Many Requests`
- Our app implements automatic rate limiting with waiting

## Endpoints

### 1. Search Endpoint
**GET** `/search?term={query}&entity={type}&limit={count}`

**Parameters:**
- `term` (required): Search keywords (URL encoded)
- `entity` (optional): Content type
  - `song` - Music tracks
  - `musicArtist` - Artists
  - `album` - Albums
  - `musicVideo` - Music videos
- `limit` (optional): Number of results (default 50, max 200)

**Examples:**
```javascript
// Search for songs
https://itunes.apple.com/search?term=blinding%20lights&entity=song&limit=20

// Search for artists
https://itunes.apple.com/search?term=taylor%20swift&entity=musicArtist&limit=10

// Search for albums
https://itunes.apple.com/search?term=2024%20hits&entity=album&limit=10
```

### 2. Lookup Endpoint
**GET** `/lookup?id={item_id}`

**Parameters:**
- `id` (required): iTunes ID of item
- `entity` (optional): Get related items

**Examples:**
```javascript
// Get song details
https://itunes.apple.com/lookup?id=1440895319&entity=song

// Get artist details
https://itunes.apple.com/lookup?id=159260351&entity=musicArtist

// Get album details
https://itunes.apple.com/lookup?id=1496928407&entity=album
```

## Response Format

### Search Response
```json
{
  "resultCount": 50,
  "results": [
    {
      "trackId": 1440895319,
      "trackName": "Blinding Lights",
      "artistName": "The Weeknd",
      "collectionName": "After Hours",
      "artworkUrl100": "https://...",
      "previewUrl": "https://...",
      "trackTimeMillis": 200000,
      "trackNumber": 1,
      "trackViewUrl": "https://...",
      "artistId": 152058096,
      "collectionId": 1496928407
    }
  ]
}
```

### Artist Response
```json
{
  "resultCount": 1,
  "results": [
    {
      "artistId": 159260351,
      "artistName": "Taylor Swift",
      "artistLinkUrl": "https://...",
      "primaryGenreName": "Pop",
      "artistType": "Artist"
    }
  ]
}
```

## Our Implementation

### Smart Search Terms
We use intelligent search terms to avoid generic results:

- **"2024 hits"** instead of "popular" (gets actual popular songs)
- **"grammy winners"** instead of "taylor" (gets variety of top artists)
- **"best music 2024"** for current hits

### Data Transformation
iTunes data is transformed to match our app's Deezer format:

```javascript
// iTunes → Our Format
{
  trackId → id,
  trackName → title,
  artistName → artist.name,
  artworkUrl100 → artist.picture,
  previewUrl → preview,
  trackTimeMillis → duration (seconds)
}
```

### Fallback Strategy
1. **Primary**: Deezer API (if available)
2. **Fallback**: iTunes Search API
3. **Final**: Demo data (always works)

### Rate Limiting
Our app respects the 20 requests/minute limit:
- Tracks request timestamps
- Automatically waits when limit reached
- Shows countdown in console

## Best Practices

1. **Use specific search terms** - avoid generic words
2. **URL encode spaces** - use `%20` instead of spaces
3. **Limit results** - specify `limit` to reduce bandwidth
4. **Handle rate limits** - implement waiting机制
5. **Cache results** - avoid duplicate requests
6. **Use preview URLs** - 30-second audio clips

## Common Issues

### "Popular" Search Problem
❌ `term=popular` returns songs titled "Popular"
✅ `term=2024%20hits` returns actual popular songs

### Rate Limiting
❌ Making >20 requests/minute
✅ Our app automatically waits when limit reached

### Empty Results
❌ `term=unknown%20artist` 
✅ `term=grammy%20winners`

## Testing URLs
```javascript
// Test these in browser
https://itunes.apple.com/search?term=2024%20hits&entity=song&limit=5
https://itunes.apple.com/search?term=grammy%20winners&entity=musicArtist&limit=5
https://itunes.apple.com/search?term=best%20music&entity=album&limit=5
```

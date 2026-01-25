# Social Media Sharing System

Complete implementation of secure social media sharing for Activities, Posts, and Events.

## 🔐 Security Features

### Share Tokens
- **32-character random tokens** for Activities and Posts
- **Cryptographically secure** (impossible to guess)
- **Regeneratable** if compromised
- **Unique and indexed** for fast lookup

### URL Structure
```
Activities: /share/activities/x7k9m2p4r5t1w3z8q1b5n3m7...
Posts:      /share/posts/a3k7n9p2m4t8w1z5r6b3k9m1...
Events:     /share/events/@event-slug (public, uses slug)
```

## 📦 Database Schema

### New Tables
```sql
ALTER TABLE activities ADD COLUMN slug VARCHAR(255);
ALTER TABLE activities ADD COLUMN share_token VARCHAR(32) UNIQUE;

ALTER TABLE posts ADD COLUMN slug VARCHAR(255);
ALTER TABLE posts ADD COLUMN share_token VARCHAR(32) UNIQUE;
```

## 🚀 API Endpoints

### Generate Share Links

**Activities:**
```http
GET /api/activities/{activity}/share-link
Authorization: Bearer {token}
```

**Posts:**
```http
GET /api/posts/{post}/share-link
Authorization: Bearer {token}
```

**Response:**
```json
{
  "url": "https://racefy.app/share/activities/x7k9m2p4r5t1w3z8...",
  "title": "John Doe completed 10.5km Running",
  "description": "Distance: 10.50 km | Time: 52:30 | Elevation: 125m",
  "hashtags": ["#Racefy", "#Running", "#Krakow"],
  "image": null,
  "platforms": {
    "facebook": {
      "url": "https://www.facebook.com/sharer/sharer.php?u=..."
    },
    "twitter": {
      "url": "https://twitter.com/intent/tweet?text=...&url=...",
      "text": "John Doe completed 10.5km Running #Racefy #Running"
    },
    "linkedin": {
      "url": "https://www.linkedin.com/sharing/share-offsite/?url=..."
    },
    "whatsapp": {
      "url": "https://wa.me/?text=..."
    },
    "telegram": {
      "url": "https://t.me/share/url?url=...&text=..."
    }
  }
}
```

## 🌐 Public Share Pages

### Routes
```php
GET /share/activities/{shareToken}  // Public activity page
GET /share/posts/{shareToken}       // Public post page
GET /share/events/{slug}            // Public event page
```

### Features
- ✅ **Open Graph meta tags** for rich previews on social media
- ✅ **Twitter Card support** for enhanced Twitter sharing
- ✅ **Beautiful mobile-friendly design**
- ✅ **Auto-redirect to app** on mobile devices
- ✅ **Bot detection** for crawlers (Facebook, Twitter, LinkedIn, etc.)

## 📱 Model Methods

### Activities & Posts

```php
// Check if sharing is enabled
$activity->isSharingEnabled(); // bool

// Enable sharing (generates token)
$activity->enableSharing();

// Disable sharing (removes token)
$activity->disableSharing();

// Regenerate token if compromised
$activity->regenerateShareToken();

// Get share URL
$activity->getShareUrl(); // /share/activities/{token}

// Find by token
Activity::findByShareToken('x7k9m2p4r5t1w3z8...');
Post::findByShareToken('a3k7n9p2m4t8w1z5...');
```

## 🎨 Frontend Integration

### React Example

```javascript
import { useState } from 'react';
import api from './services/api';

function ShareButton({ activity }) {
  const [shareLinks, setShareLinks] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/activities/${activity.id}/share-link`);
      setShareLinks(response.data);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareToFacebook = () => {
    window.open(shareLinks.platforms.facebook.url, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    window.open(shareLinks.platforms.twitter.url, '_blank', 'width=600,height=400');
  };

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: shareLinks.title,
        text: shareLinks.description,
        url: shareLinks.url,
      });
    }
  };

  return (
    <div>
      {!shareLinks ? (
        <button onClick={handleShare} disabled={loading}>
          {loading ? 'Generating...' : 'Share'}
        </button>
      ) : (
        <div className="share-options">
          <button onClick={shareToFacebook}>
            📘 Facebook
          </button>
          <button onClick={shareToTwitter}>
            🐦 Twitter
          </button>
          <button onClick={shareNative}>
            📤 More...
          </button>

          <div className="share-url">
            <input
              type="text"
              value={shareLinks.url}
              readOnly
              onClick={(e) => e.target.select()}
            />
            <button onClick={() => navigator.clipboard.writeText(shareLinks.url)}>
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### React Native Example

```javascript
import { Share } from 'react-native';
import api from './services/api';

const shareActivity = async (activityId) => {
  try {
    const response = await api.get(`/activities/${activityId}/share-link`);
    const { url, title, description } = response.data;

    await Share.share({
      message: `${title}\n\n${description}\n\n${url}`,
      url: url,
      title: title,
    });
  } catch (error) {
    console.error('Failed to share:', error);
  }
};

// Usage in component
<TouchableOpacity onPress={() => shareActivity(activity.id)}>
  <Text>Share Activity</Text>
</TouchableOpacity>
```

## 🔄 Setup Instructions

### 1. Run Migrations

```bash
./vendor/bin/sail artisan migrate
```

### 2. Generate Tokens for Existing Data (Optional)

```bash
php artisan tinker

# Generate slugs and tokens for existing activities
Activity::whereNull('share_token')->each(function($a) {
    $a->enableSharing();
});

# Generate slugs and tokens for existing posts
Post::whereNull('share_token')->each(function($p) {
    $p->enableSharing();
});
```

### 3. Test the API

```bash
# Generate share link
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost/api/activities/1/share-link

# Access public share page
curl http://localhost/share/activities/x7k9m2p4r5t1w3z8...
```

## 🎯 Supported Platforms

| Platform | Format | Features |
|----------|--------|----------|
| **Facebook** | Share Dialog | Rich preview with image |
| **Twitter/X** | Web Intent | Large card with hashtags |
| **LinkedIn** | Share Dialog | Professional format |
| **WhatsApp** | Web API | Mobile-optimized |
| **Telegram** | Share URL | Instant messaging |
| **Native Share** | Web Share API | iOS/Android native |

## 📊 Features by Content Type

### Activities
- Distance, duration, elevation stats
- Sport type and location
- GPS route map (if available)
- Personal records indicators
- Hashtags: #Racefy #SportType #City

### Posts
- Title and content preview
- Photo/video count
- Author information
- Creation date

### Events
- Event details and description
- Start date and location
- Participant count
- Sport type and difficulty
- Cover image

## 🔒 Privacy & Security

### Privacy Controls
- Activities marked `is_private` won't generate share tokens automatically
- User must explicitly call `enableSharing()` to make private content shareable
- Posts with `visibility: 'private'` require ownership to generate share links
- Share tokens can be regenerated if link is compromised

### Token Security
- 32 random alphanumeric characters
- Collision probability: 1 in 62^32 (virtually impossible)
- URL-safe (lowercase only)
- Indexed for O(1) lookup performance

## 🚀 Future Enhancements

### Planned Features
1. **Open Graph Images** - Generate beautiful route map cards
2. **Share Analytics** - Track which platforms users share to
3. **Expiring Share Links** - Time-limited tokens
4. **Direct Social Media Posting** - OAuth integration for one-click posting
5. **Custom Share Messages** - User-customizable share text

### Potential Improvements
- Share count tracking
- Most shared activities leaderboard
- Embed codes for websites
- QR codes for physical sharing

## 📝 Notes

- Share tokens are generated automatically when first needed
- Events use slugs (always public) instead of share tokens
- Mobile apps should use native share dialogs when available
- Web crawlers get full HTML pages with meta tags
- Users get redirected to app or shown share page

## 🐛 Troubleshooting

### Share link returns 404
- Check if activity/post has `share_token` set
- Call `$activity->enableSharing()` if token is missing
- Verify activity is not private without sharing enabled

### Social media preview not showing
- Ensure Open Graph meta tags are present in HTML
- Use Facebook's Sharing Debugger to test
- Check that images are publicly accessible

### Mobile redirect not working
- Verify `APP_URL` is set correctly in `.env`
- Check JavaScript console for errors
- Ensure deep link configuration is correct
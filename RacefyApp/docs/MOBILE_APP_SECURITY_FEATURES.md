# Mobile App: Critical Security Features Implementation

## Context

Recent backend commits (cec3910, 7f04fb9, d872b99, 172e5f5) introduced comprehensive security and privacy features. This document outlines the **most important features to implement in the React Native mobile app from a user perspective**.

## Priority Order (User Impact)

### 🔴 P0 - Critical (Immediate User Safety)
1. **User Blocking** - Essential for user safety and harassment prevention
2. **Content Reporting** - Required for community moderation

### 🟡 P1 - High (Privacy & Safety)
3. **Privacy Zones** - Protects home/work addresses from GPS tracks

### 🟢 P2 - Medium (User Rights & Compliance)
4. **GDPR Data Export** - Legal requirement, less frequently used
5. **Account Deletion** - Important but one-time action

---

## 1. User Blocking System (P0 - CRITICAL)

### User Story
*"As a user, I want to block other users so they cannot see my content, interact with me, or send me messages."*

### Why It's Critical
- **Harassment prevention**: Users need immediate ability to stop unwanted interactions
- **Privacy control**: Users control who can see their activities and posts
- **Safety**: Bidirectional blocking prevents stalking/harassment

### API Endpoints

```typescript
// Block a user
POST /api/users/{userId}/block
Response: 200 OK

// Unblock a user
DELETE /api/users/{userId}/block
Response: 200 OK

// Get list of blocked users (paginated)
GET /api/blocks?page=1&per_page=20
Response: {
  data: BlockedUser[],
  meta: { current_page, last_page, total }
}

// Check block status with another user
GET /api/users/{userId}/block-status
Response: {
  is_blocking: boolean,    // You blocked them
  is_blocked_by: boolean,  // They blocked you
  has_relationship: boolean // Either direction
}
```

### TypeScript Types

```typescript
interface BlockedUser {
  id: number;
  name: string;
  username: string;
  avatar: string | null;
  blocked_at: string; // ISO datetime
}

interface BlockStatus {
  is_blocking: boolean;
  is_blocked_by: boolean;
  has_relationship: boolean;
}
```

### Mobile UI Components Needed

1. **Block Button in User Profile**
   - Location: User profile header (dropdown menu or action sheet)
   - States: "Block User" / "Unblock User"
   - Action: Show confirmation dialog before blocking
   - Success: Show toast "User blocked successfully"
   - Side effect: Automatically unfollows in both directions

2. **Blocked Users Management Screen**
   - Location: Settings → Privacy & Safety → Blocked Users
   - Display: List of blocked users with avatar, name, username
   - Action: "Unblock" button for each user
   - Empty state: "You haven't blocked anyone yet"

3. **Block Confirmation Dialog**
   ```
   Title: Block @username?
   Message: They won't be able to see your content or interact with you. You'll also automatically unfollow each other.
   Actions: [Cancel] [Block]
   ```

### Implementation Notes
- Blocking is **bidirectional** - both users become invisible to each other
- Blocking auto-unfollows both directions
- Blocked users are filtered from:
  - Feed posts
  - Activity discover feed
  - Search results (users, posts, events)
  - Followers/following lists
  - Comment sections
  - Message conversations (cannot start new conversations)

### User Flow Example
```
1. User A views User B's profile
2. User A taps [...] menu → "Block User"
3. Confirmation dialog appears
4. User A confirms
5. API call: POST /api/users/{userB_id}/block
6. User A unfollows User B (automatic)
7. User B unfollows User A (automatic)
8. User A can no longer see User B's content
9. User B can no longer see User A's content
10. Toast: "User blocked successfully"
```

---

## 2. Content Reporting System (P0 - CRITICAL)

### User Story
*"As a user, I want to report inappropriate content (posts, comments, activities, users) so moderators can review and take action."*

### Why It's Critical
- **Community safety**: Users can flag harmful content
- **Moderation pipeline**: Enables admin review of violations
- **Legal compliance**: Required for DSA/platform moderation obligations

### API Endpoints

```typescript
// Submit a report
POST /api/reports
Body: {
  reportable_type: 'post' | 'comment' | 'activity' | 'user' | 'message',
  reportable_id: number,
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'nudity' | 'misinformation' | 'impersonation' | 'copyright' | 'other',
  description?: string // Optional additional context
}
Response: 201 Created

// Get user's own reports (optional feature)
GET /api/reports?page=1
Response: {
  data: Report[],
  meta: { ... }
}
```

### TypeScript Types

```typescript
type ReportableType = 'post' | 'comment' | 'activity' | 'user' | 'message';

type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'impersonation'
  | 'copyright'
  | 'other';

interface CreateReportRequest {
  reportable_type: ReportableType;
  reportable_id: number;
  reason: ReportReason;
  description?: string;
}

interface Report {
  id: number;
  reportable_type: ReportableType;
  reportable_id: number;
  reason: ReportReason;
  description: string | null;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}
```

### Mobile UI Components Needed

1. **Report Button/Menu Item**
   - Location: Action menu ([...]) on posts, comments, activities, user profiles
   - Label: "Report" or "Report Content"
   - Icon: Flag or warning icon
   - Show for: Non-owners only (you can't report your own content)

2. **Report Modal/Bottom Sheet**
   ```
   Title: Report Content

   Reason: [Dropdown/Picker]
   - Spam
   - Harassment or Bullying
   - Hate Speech
   - Violence or Threats
   - Nudity or Sexual Content
   - Misinformation
   - Impersonation
   - Copyright Violation
   - Other

   Additional Information (Optional):
   [Text Area - 500 char limit]

   Actions: [Cancel] [Submit Report]
   ```

3. **Success Confirmation**
   ```
   Toast: "Report submitted successfully"
   Message: "Thank you for helping keep our community safe. We'll review your report."
   ```

### Implementation Notes
- Rate limiting: 10 reports per minute (enforced by backend)
- Duplicate prevention: Users cannot report the same content twice within 24 hours
- All reports are logged in audit trail
- Users receive confirmation but no follow-up on report status (privacy)

### User Flow Example
```
1. User sees inappropriate post
2. Taps [...] menu → "Report"
3. Report modal opens
4. Selects reason: "Harassment"
5. (Optional) Adds description: "This user is targeting me"
6. Taps "Submit Report"
7. API call: POST /api/reports
8. Success toast appears
9. Modal closes
10. User can continue using app normally
```

---

## 3. Privacy Zones (P1 - HIGH)

### User Story
*"As a runner/cyclist, I want to hide my home and work addresses from my GPS tracks so strangers cannot see where I live."*

### Why It's Important
- **Personal safety**: Prevents stalking by hiding home/work locations
- **Privacy**: Users control what location data is exposed
- **Automatic protection**: 200m radius automatically applied to all future activities

### API Endpoints

```typescript
// Get user's privacy zones
GET /api/privacy-zones
Response: {
  data: PrivacyZone[]
}

// Create a privacy zone
POST /api/privacy-zones
Body: {
  name: string,
  type: 'home' | 'work' | 'other',
  latitude: number,
  longitude: number
}
Response: 201 Created { data: PrivacyZone }

// Toggle zone active/inactive
POST /api/privacy-zones/{zoneId}/toggle
Response: 200 OK { data: PrivacyZone }

// Delete a zone
DELETE /api/privacy-zones/{zoneId}
Response: 204 No Content

// Get AI-suggested zones (based on activity patterns)
GET /api/privacy-zones/suggestions
Response: {
  data: PrivacyZoneSuggestion[]
}
```

### TypeScript Types

```typescript
interface PrivacyZone {
  id: number;
  name: string;
  type: 'home' | 'work' | 'other';
  latitude: number;
  longitude: number;
  radius: number; // Always 200 meters
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PrivacyZoneSuggestion {
  name: string;
  type: 'home' | 'work' | 'other';
  latitude: number;
  longitude: number;
  activity_count: number; // Number of activities starting/ending near this location
  confidence: number; // 0-100 confidence score
}

interface CreatePrivacyZoneRequest {
  name: string;
  type: 'home' | 'work' | 'other';
  latitude: number;
  longitude: number;
}
```

### Mobile UI Components Needed

1. **Privacy Zones Settings Screen**
   - Location: Settings → Privacy & Safety → Privacy Zones
   - Description: "Hide your home and work addresses from GPS tracks. Start/end points within 200m will be hidden."

2. **Zone List**
   - Shows all created zones
   - Each zone displays:
     - Icon (🏠 Home, 💼 Work, 📍 Other)
     - Zone name
     - Active/Inactive toggle
     - Delete button
   - Empty state: "No privacy zones yet. Add a zone to hide sensitive locations."

3. **Add Zone Screen**
   - Zone name input (e.g., "Home", "Office")
   - Zone type picker: Home / Work / Other
   - Map picker for location (or use current location button)
   - Visual: Show 200m radius circle on map
   - Save button

4. **Smart Suggestions (Optional but Recommended)**
   - Show AI-suggested zones based on activity patterns
   - Display as cards: "We noticed you frequently start activities here. Add as privacy zone?"
   - One-tap to accept suggestion

### Implementation Notes
- Privacy zones affect **all future activities** automatically
- GPS points within 200m of zone center are:
  - Hidden from public route display
  - Removed from shared GPX exports
  - Still stored in backend but marked as private
- Inactive zones don't hide anything (can be toggled on/off)
- Maximum 10 zones per user (recommended)

### User Flow Example
```
1. User goes to Settings → Privacy Zones
2. Sees suggestion: "You start 15 activities at this location"
3. Taps "Add as Home"
4. Zone created automatically with 200m radius
5. All future activities starting within 200m of home have GPS trimmed
6. Route maps show altered start point (200m away from actual home)
7. Strava/other users cannot see exact home location
```

### Visual Reference
```
Before Privacy Zone:
[GPS Track] ──────●──────▶
            (starts at exact home address)

After Privacy Zone:
[GPS Track]      ╳╳╳╳●──────▶
            (hidden) (public starts here, 200m away)
```

---

## 4. GDPR Data Export (P2 - MEDIUM)

### User Story
*"As a user, I want to download all my data in a portable format to comply with GDPR Article 20 (Right to Data Portability)."*

### API Endpoint

```typescript
// Export all user data
GET /api/profile/export-data
Response: {
  user: {...},
  activities: [...],
  posts: [...],
  comments: [...],
  conversations: [...],
  followers: [...],
  following: [...],
  points: [...],
  consents: [...],
  privacy_zones: [...]
  // ... complete data export
}
```

### Mobile UI

**Location**: Settings → Account → Download My Data

**Button**:
```
[Download My Data]
Description: Download all your data in JSON format (GDPR Article 20)
```

**Flow**:
1. User taps "Download My Data"
2. Loading indicator appears
3. API call retrieves data
4. Save JSON file to device (or share via native share sheet)
5. Success message: "Your data has been downloaded"

---

## 5. Account Deletion (P2 - MEDIUM)

### User Story
*"As a user, I want to permanently delete my account and all associated data (GDPR Article 17 - Right to Erasure)."*

### API Endpoint

```typescript
// Delete account (requires password confirmation)
DELETE /api/profile
Body: {
  password: string
}
Response: 200 OK
```

### Mobile UI

**Location**: Settings → Account → Delete Account (Danger Zone)

**Flow**:
1. User taps "Delete Account" in danger zone
2. Warning dialog appears:
   ```
   Title: Delete Account?
   Message: This action cannot be undone. All your data will be permanently deleted including:
   - Activities and GPS tracks
   - Posts and comments
   - Photos and videos
   - Messages
   - Followers and following

   [Cancel] [Continue]
   ```
3. Password confirmation screen:
   ```
   Title: Confirm Account Deletion
   Field: [Password Input]
   Button: [Delete My Account]
   ```
4. API call with password
5. On success: Log out and return to login screen
6. Toast: "Your account has been deleted"

---

## Implementation Priority Recommendations

### Week 1: Critical Safety Features
- [ ] User Blocking UI (profile menu, confirmation dialog)
- [ ] Blocked Users management screen
- [ ] Content Reporting UI (report button on all content types)
- [ ] Report modal with reason selection

### Week 2: Privacy Features
- [ ] Privacy Zones settings screen
- [ ] Zone list with toggle/delete
- [ ] Add zone with map picker
- [ ] Smart suggestions display (if API returns suggestions)

### Week 3: GDPR Compliance
- [ ] Data export button
- [ ] Account deletion flow with confirmation

---

## Testing Checklist

### User Blocking
- [ ] Block user from their profile
- [ ] Blocked user disappears from feed
- [ ] Blocked user disappears from search
- [ ] Cannot send messages to blocked user
- [ ] Unblock user successfully
- [ ] Previously blocked user reappears in feed

### Content Reporting
- [ ] Report post successfully
- [ ] Report comment successfully
- [ ] Cannot report own content
- [ ] All report reasons work
- [ ] Optional description field works
- [ ] Success toast appears

### Privacy Zones
- [ ] Create zone with map picker
- [ ] Toggle zone active/inactive
- [ ] Delete zone
- [ ] Suggestions display (if available)
- [ ] Accept suggestion creates zone

### GDPR
- [ ] Data export downloads complete JSON
- [ ] Account deletion requires password
- [ ] Account deletion logs user out
- [ ] Deleted account cannot log in again

---

## API Rate Limits (Informational)

- **Block/Unblock**: 30 requests/minute (same as other content actions)
- **Content Reports**: 10 reports/minute (prevents spam)
- **Privacy Zones**: 30 requests/minute
- **Data Export**: 5 requests/hour (heavy operation)
- **Account Deletion**: 3 attempts/hour (prevents accidental deletion)

---

## Translation Keys Required

### English Examples
```json
{
  "profile": {
    "block": "Block",
    "unblock": "Unblock",
    "blockUser": "Block User",
    "blockConfirm": "Block @{{username}}? They won't be able to see your content or interact with you.",
    "blockSuccess": "User blocked successfully",
    "unblockSuccess": "User unblocked successfully",
    "blockedUsers": "Blocked Users",
    "noBlockedUsers": "You haven't blocked anyone yet"
  },
  "reports": {
    "title": "Report",
    "reportContent": "Report Content",
    "reason": "Reason",
    "selectReason": "Select a reason",
    "submitted": "Report submitted successfully",
    "reasons": {
      "spam": "Spam",
      "harassment": "Harassment or Bullying",
      "hate_speech": "Hate Speech",
      "violence": "Violence or Threats",
      "nudity": "Nudity or Sexual Content",
      "misinformation": "Misinformation",
      "impersonation": "Impersonation",
      "copyright": "Copyright Violation",
      "other": "Other"
    }
  },
  "privacyZones": {
    "title": "Privacy Zones",
    "description": "Hide your home and work addresses from GPS tracks",
    "addZone": "Add Privacy Zone",
    "zoneName": "Zone Name",
    "home": "Home",
    "work": "Work",
    "other": "Other",
    "noZones": "No privacy zones yet",
    "zoneCreated": "Privacy zone created"
  },
  "settings": {
    "downloadMyData": "Download My Data",
    "deleteAccount": "Delete Account",
    "accountDeleted": "Your account has been deleted"
  }
}
```

---

## UI/UX Best Practices

### User Blocking
- ✅ Always show confirmation before blocking
- ✅ Use clear, non-technical language
- ✅ Make unblocking easy (no confirmation needed)
- ✅ Show toast feedback for all actions

### Content Reporting
- ✅ Keep report flow short (2 steps max)
- ✅ Make reason selection clear with examples
- ✅ Don't require description (optional)
- ✅ Confirm submission with encouraging message

### Privacy Zones
- ✅ Show visual 200m radius on map
- ✅ Use location icons (🏠💼📍) for quick recognition
- ✅ Enable one-tap creation from suggestions
- ✅ Explain how zones protect privacy

### GDPR Features
- ✅ Make data export one-tap (no forms)
- ✅ Require password for account deletion only
- ✅ Show clear warning before deletion
- ✅ List what will be deleted

---

## Documentation References

- **Full API Documentation**: `docs/mobile/API_ENDPOINTS.md`
- **Security Documentation**: `docs/SECURITY.md`
- **TypeScript Types**: `docs/mobile/TYPESCRIPT.md`
- **Backend Implementation**: Commits cec3910, 7f04fb9, d872b99, 172e5f5

---

## Questions for Backend Team?

If you need clarification on any endpoints, expected responses, or edge cases:
- Check `docs/mobile/API_ENDPOINTS.md` first
- Review `docs/SECURITY.md` for feature details
- Test endpoints using the provided examples
- Contact backend team with specific questions

---

## Success Criteria

### User Safety
- ✅ Users can block harassers within 2 taps
- ✅ Users can report inappropriate content within 3 taps
- ✅ Blocked users completely disappear from app experience

### Privacy
- ✅ Users can protect home/work locations with GPS zones
- ✅ Privacy zones apply automatically to all activities
- ✅ Zone creation is intuitive with map picker

### Compliance
- ✅ Users can export all their data in one tap
- ✅ Users can delete accounts with password confirmation
- ✅ All GDPR rights are accessible

---

**END OF MOBILE APP IMPLEMENTATION GUIDE**

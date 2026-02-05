# MediaPicker Component Refactor

## Summary

Cleaned up dead code in `MediaPicker.tsx` and improved the media selection flow with action sheet support for camera access.

## What Changed

### Before (Dead Code Removed)
- ❌ `handleAddMedia()` - 58 lines of unused action sheet code
- ❌ Unused imports: `ActionSheetIOS`, `Platform`
- ✅ `takePhoto()` and `recordVideo()` existed but were never called

### After (Clean Implementation)
- ✅ `showMediaOptions()` - New streamlined action sheet handler
- ✅ `takePhoto()` and `recordVideo()` now properly integrated
- ✅ Platform-specific UI (iOS action sheet, Android alert dialog)
- ✅ All functions have comprehensive error handling and logging

## New User Flow

### Adding Photos

When user taps "Add Photo" button:

**iOS:**
```
[Action Sheet appears]
┌─────────────────────────┐
│ Take Photo              │  ← Opens camera
│ Choose from Library     │  ← Opens gallery
│ Cancel                  │
└─────────────────────────┘
```

**Android:**
```
[Alert Dialog appears]
┌─────────────────────────────────┐
│     Add Photo                   │
│                                 │
│  [Choose from Library]          │  ← Opens gallery
│  [Take Photo]                   │  ← Opens camera
│  [Cancel]                       │
└─────────────────────────────────┘
```

### Adding Videos

When user taps "Add Video" button:

**iOS:**
```
[Action Sheet appears]
┌─────────────────────────┐
│ Record Video            │  ← Opens camera in video mode
│ Choose from Library     │  ← Opens gallery
│ Cancel                  │
└─────────────────────────┘
```

**Android:**
```
[Alert Dialog appears]
┌─────────────────────────────────┐
│     Add Video                   │
│                                 │
│  [Choose from Library]          │  ← Opens gallery
│  [Record Video]                 │  ← Opens camera
│  [Cancel]                       │
└─────────────────────────────────┘
```

## Code Structure

### Function Flow

```
handleAddPhoto()
  └─> showMediaOptions('image')
       ├─> iOS: ActionSheetIOS with 2 options
       │    ├─> Take Photo → takePhoto()
       │    └─> Choose from Library → pickFromGallery('image')
       └─> Android: Alert with 2 buttons
            ├─> Take Photo → takePhoto()
            └─> Choose from Library → pickFromGallery('image')

handleAddVideo()
  └─> showMediaOptions('video')
       ├─> iOS: ActionSheetIOS with 2 options
       │    ├─> Record Video → recordVideo()
       │    └─> Choose from Library → pickFromGallery('video')
       └─> Android: Alert with 2 buttons
            ├─> Record Video → recordVideo()
            └─> Choose from Library → pickFromGallery('video')
```

### Key Functions

#### `showMediaOptions(mediaType: 'image' | 'video')`
- Shows platform-appropriate picker (action sheet on iOS, alert on Android)
- Handles both image and video types
- Respects `maxItems` limit

#### `takePhoto()`
- Requests camera permissions
- Opens camera in photo mode
- Validates file size (max 10MB)
- Error handling with logging

#### `recordVideo()`
- Requests camera permissions
- Opens camera in video mode (60s max duration)
- Validates file size (max 100MB)
- Error handling with logging

#### `pickFromGallery(mediaType)`
- Requests photo library permissions
- Opens gallery with media type filter
- Supports multiple selection
- Validates file sizes
- Error handling with logging

## Error Handling

All functions now include:
- ✅ Try-catch blocks
- ✅ Permission checks with user-friendly error messages
- ✅ File size validation
- ✅ Detailed logging via `logger` service
- ✅ Graceful fallbacks

### Example Error Flow

```typescript
try {
  // Request permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    logger.warn('media', 'Permission denied');
    Alert.alert('Error', 'Camera permission required');
    return;
  }

  // Launch camera
  const result = await ImagePicker.launchCameraAsync({...});

  // Validate file size
  const isValid = await checkFileSize(asset.uri, 'image');
  if (!isValid) return;

  // Add to media
  onChange([...media, newItem]);

} catch (error) {
  logger.error('media', 'Error taking photo', { error });
  Alert.alert('Error', 'Failed to take photo. Please try again.');
}
```

## File Size Limits

- **Images:** 10MB maximum
- **Videos:** 100MB maximum

Large files are rejected with user-friendly error messages showing:
- Actual file size
- Maximum allowed size
- Media type

## Logging

All operations logged with context:

```typescript
// Debug logs
logger.debug('media', 'Launching camera for photo');

// Info logs
logger.info('media', 'Photo taken successfully', { uri: asset.uri });

// Warning logs
logger.warn('media', 'Permission denied');

// Error logs
logger.error('media', 'Error taking photo', { error });
```

View logs: **Settings → Developer → Debug Logs** (filter by `media`)

## UI States

### Empty State (No Media)
```
┌──────────────┬──────────────┐
│   📷         │   🎥         │
│ Add Photo    │ Add Video    │
└──────────────┴──────────────┘
```

### With Media
```
┌────┬────┬────┬───┬───┐
│ 🖼️ │ 🖼️ │ 🎬 │ ➕│🎥│  ← Scroll horizontally
└────┴────┴────┴───┴───┘
 Media count: 3/10
```

## Permissions Required

### iOS (Info.plist)
- `NSCameraUsageDescription` - For taking photos/videos
- `NSMicrophoneUsageDescription` - For recording video with audio
- `NSPhotoLibraryUsageDescription` - For reading from gallery
- `NSPhotoLibraryAddUsageDescription` - For saving media

### Android (AndroidManifest.xml)
- `CAMERA` - For taking photos/videos
- `READ_EXTERNAL_STORAGE` - For reading from gallery
- `WRITE_EXTERNAL_STORAGE` - For saving media

## Testing Checklist

- [ ] Can show action sheet on iOS
- [ ] Can show alert dialog on Android
- [ ] Can take photo with camera
- [ ] Can record video with camera
- [ ] Can select photo from gallery
- [ ] Can select video from gallery
- [ ] File size validation works (reject > 10MB images)
- [ ] File size validation works (reject > 100MB videos)
- [ ] Permission errors show user-friendly messages
- [ ] All operations logged correctly
- [ ] No crashes with large files
- [ ] Cancel works in all dialogs

## Migration Notes

No breaking changes for consumers of `MediaPicker` component:

```tsx
// Usage remains the same
<MediaPicker
  media={media}
  onChange={setMedia}
  maxItems={10}
  allowVideo={true}
/>
```

Internal implementation improved, but API unchanged.

## Benefits

1. **Cleaner Code**
   - Removed ~120 lines of dead code
   - Single source of truth for media options
   - Better code organization

2. **Better UX**
   - Direct camera access
   - Platform-appropriate UI
   - Clear error messages

3. **Maintainability**
   - All functions properly used
   - Comprehensive error handling
   - Detailed logging for debugging

4. **Reliability**
   - File size validation prevents crashes
   - Permission handling prevents silent failures
   - Error recovery with user feedback

## Related Files

- `src/components/MediaPicker.tsx` - Main component (refactored)
- `app.config.ts` - iOS permissions (already configured)
- `docs/IOS_VIDEO_CRASH_FIX.md` - Related iOS video fixes

## Future Enhancements

Possible improvements:
- [ ] Image compression before upload
- [ ] Video thumbnail generation
- [ ] Progress indicator for large files
- [ ] Batch upload with progress
- [ ] Edit/crop images after selection
- [ ] Video trimming before upload
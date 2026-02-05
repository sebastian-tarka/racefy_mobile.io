# iOS Video Crash Fix

## Problem

App was crashing on iOS when trying to add MOV (video) files from the photo library.

## Root Causes

### 1. Missing iOS Permissions

The app was missing critical permissions in `Info.plist` required for handling video files:

**Missing:**
- `NSPhotoLibraryAddUsageDescription` - Required to save/add media to photo library
- `NSMicrophoneUsageDescription` - Required to record video with audio

**Already Present:**
- `NSCameraUsageDescription` - For taking photos/videos
- `NSPhotoLibraryUsageDescription` - For reading from photo library

### 2. No Error Handling

The `MediaPicker` component had no try-catch blocks around:
- Permission requests
- Image picker operations
- File operations

This caused uncaught exceptions to crash the app instead of showing error messages.

### 3. No File Size Validation

Large video files (especially MOV from iPhone) can be 100MB+ and cause:
- Memory issues
- Upload failures
- Timeout errors

There was no validation to check file size before processing.

## Solution

### 1. Added iOS Permissions

Updated `app.config.ts` with required permissions:

```typescript
infoPlist: {
  NSCameraUsageDescription: 'Racefy needs camera access to take photos and videos...',
  NSMicrophoneUsageDescription: 'Racefy needs microphone access to record audio with videos.',
  NSPhotoLibraryUsageDescription: 'Racefy needs photo library access to select photos and videos...',
  NSPhotoLibraryAddUsageDescription: 'Racefy needs permission to save photos and videos...',
}
```

### 2. Added Comprehensive Error Handling

All media operations now wrapped in try-catch blocks with:
- Detailed logging via `logger` service
- User-friendly error messages
- Graceful fallbacks

```typescript
try {
  const result = await ImagePicker.launchImageLibraryAsync(options);
  // ... handle result
} catch (error) {
  logger.error('media', 'Error picking from gallery', { error });
  Alert.alert(t('common.error'), 'Failed to select media. Please try again...');
}
```

### 3. Added File Size Validation

Implemented size limits and validation:
- **Videos:** 100MB maximum
- **Images:** 10MB maximum

```typescript
const checkFileSize = async (uri: string, type: 'image' | 'video'): Promise<boolean> => {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (fileInfo.size > maxSize) {
    Alert.alert('File size too large...');
    return false;
  }
  return true;
};
```

Files are checked before being added to prevent crashes and upload failures.

### 4. Enhanced Logging

All media operations now logged with context:
- Permission requests
- File selections
- Size checks
- Errors with full stack traces

Logs can be viewed in: **Settings → Developer → Debug Logs**

## Files Changed

```
RacefyApp/
├── app.config.ts                     (Updated iOS permissions)
└── src/components/MediaPicker.tsx    (Added error handling + size validation)
```

## Testing Checklist

After rebuilding the iOS app with these changes:

- [ ] Can select images from photo library
- [ ] Can select videos from photo library (including MOV files)
- [ ] Can record video with camera
- [ ] Can take photos with camera
- [ ] App shows error when video > 100MB
- [ ] App shows error when image > 10MB
- [ ] No crashes when selecting large files
- [ ] Permission prompts appear correctly
- [ ] Errors are logged to debug logs

## Deployment

### Development Testing

1. **Rebuild the app** with new permissions:
   ```bash
   cd RacefyApp
   npx expo prebuild --platform ios --clean
   npx expo run:ios
   ```

2. **Test on physical device** (permissions behave differently than simulator)

### Production Build

1. **iOS build requires rebuild** for Info.plist changes:
   ```bash
   cd RacefyApp
   eas build --platform ios --profile production
   ```

2. **Submit to TestFlight:**
   ```bash
   eas submit --platform ios --latest
   ```

3. **Wait for review** (~24 hours) before testing

## Technical Details

### Why MOV Files Crash

MOV is Apple's native video format and can be:
- Very high resolution (4K+)
- Long duration (multiple minutes)
- Large file size (100MB-500MB+)
- High bitrate

Without proper error handling and size validation:
1. App tries to load entire file into memory
2. Memory pressure triggers warning
3. iOS terminates app to free memory
4. User sees crash

### Why Permissions Matter

iOS requires explicit permission descriptions for:
- **Reading** photos/videos (`NSPhotoLibraryUsageDescription`)
- **Adding/Saving** photos/videos (`NSPhotoLibraryAddUsageDescription`)
- **Camera** access (`NSCameraUsageDescription`)
- **Microphone** for video with audio (`NSMicrophoneUsageDescription`)

Missing any of these causes:
- Silent failure (iOS 14+)
- Crash (iOS 13 and below)
- Permission denied errors

## Prevention

To avoid similar issues in the future:

1. **Always wrap platform APIs in try-catch:**
   ```typescript
   try {
     const result = await SomePlatformAPI.doSomething();
   } catch (error) {
     logger.error('category', 'Operation failed', { error });
     // Show user-friendly error
   }
   ```

2. **Always validate file sizes** before processing:
   ```typescript
   const fileInfo = await FileSystem.getInfoAsync(uri);
   if (fileInfo.size > MAX_SIZE) {
     // Reject and inform user
   }
   ```

3. **Always log operations** for debugging:
   ```typescript
   logger.debug('category', 'Starting operation', { context });
   // ... do operation
   logger.info('category', 'Operation completed', { result });
   ```

4. **Test on physical devices** - simulators don't enforce permissions

5. **Check Apple's permission requirements** - they change frequently

## Related Documentation

- iOS Permissions: https://developer.apple.com/documentation/bundleresources/information_property_list
- Expo Image Picker: https://docs.expo.dev/versions/latest/sdk/imagepicker/
- File System: https://docs.expo.dev/versions/latest/sdk/filesystem/

## Support

If crashes still occur:
1. Check debug logs: Settings → Developer → Debug Logs
2. Filter for category: `media`
3. Look for error entries with stack traces
4. Share logs with development team
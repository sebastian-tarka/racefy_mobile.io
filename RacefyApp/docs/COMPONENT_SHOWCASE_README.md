# Component Showcase - Design Board

Two ways to preview and test your feed components:

## Option 1: Standalone HTML Design Board 🌐

**File**: `docs/component-showcase.html`

### How to Use:
1. **Open in Browser**:
   ```bash
   cd RacefyApp/docs
   open component-showcase.html
   # or on Linux: xdg-open component-showcase.html
   # or on Windows: start component-showcase.html
   ```

2. **Or serve with local server**:
   ```bash
   cd RacefyApp/docs
   python3 -m http.server 8000
   # Then open: http://localhost:8000/component-showcase.html
   ```

### Features:
- ✅ Beautiful visual showcase
- ✅ No dependencies needed
- ✅ Easy to share (send HTML file to team)
- ✅ Works offline
- ✅ Mockups show component behavior
- ✅ Before/After comparisons
- ✅ Industry pattern references
- ✅ Responsive design

### Perfect For:
- 📊 Presentations
- 🎨 Design reviews
- 👥 Sharing with stakeholders
- 📱 Quick reference

---

## Option 2: Dev Screen in App 📱

**File**: `src/screens/dev/ComponentShowcase.tsx`

### How to Use:

1. **Add to navigation** (for dev builds only):

   Edit `src/navigation/AppNavigator.tsx`:
   ```typescript
   import { ComponentShowcaseScreen } from '../screens/dev/ComponentShowcase';

   // Add to your stack (in development mode)
   {__DEV__ && (
     <Stack.Screen
       name="ComponentShowcase"
       component={ComponentShowcaseScreen}
       options={{ headerShown: false }}
     />
   )}
   ```

2. **Navigate from Settings** (recommended):

   Add a dev menu button in Settings screen:
   ```typescript
   {__DEV__ && (
     <TouchableOpacity
       onPress={() => navigation.navigate('ComponentShowcase')}
     >
       <Text>🎨 Component Showcase</Text>
     </TouchableOpacity>
   )}
   ```

3. **Or add a floating dev button**:
   ```typescript
   {__DEV__ && (
     <TouchableOpacity
       style={{
         position: 'absolute',
         bottom: 100,
         right: 20,
         width: 60,
         height: 60,
         borderRadius: 30,
         backgroundColor: '#10b981',
         justifyContent: 'center',
         alignItems: 'center',
         elevation: 5,
       }}
       onPress={() => navigation.navigate('ComponentShowcase')}
     >
       <Text style={{ fontSize: 24 }}>🎨</Text>
     </TouchableOpacity>
   )}
   ```

### Features:
- ✅ **Real components** (not mockups!)
- ✅ Test actual behavior
- ✅ Interactive (tap, swipe, pinch)
- ✅ Theme switching
- ✅ Tabbed navigation (Images, Videos, Feed)
- ✅ Live feature demos

### Perfect For:
- 🧪 Component testing
- 🐛 Bug reproduction
- 🎯 QA validation
- 🔍 Visual regression testing

---

## Comparison

| Feature | HTML Design Board | Dev Screen |
|---------|------------------|-----------|
| **Components** | Mockups | Real |
| **Interactive** | ❌ Static | ✅ Fully interactive |
| **Shareable** | ✅ Just send HTML | ❌ Needs app |
| **Offline** | ✅ Yes | ✅ Yes |
| **Setup** | None | Add to navigation |
| **Use Case** | Presentations | Testing |

---

## Quick Access URLs

### HTML Showcase (after serving):
```
http://localhost:8000/component-showcase.html
```

### Dev Screen (in app):
```typescript
navigation.navigate('ComponentShowcase')
```

---

## What's Showcased

### 1. AutoDisplayImage
- Portrait images (aspect > 1.3)
- Landscape images (aspect < 0.8)
- Square images (0.8 - 1.3)
- Center-weighted cropping
- Gradient fade overlay
- Expand/collapse toggle

### 2. ImageGallery
- Swipeable navigation
- Pinch-to-zoom (1x - 4x)
- Page indicators
- Image counter
- Close button

### 3. AutoPlayVideo
- 16:9 landscape videos
- 9:16 portrait videos
- Auto-play at 50% visibility
- Mute/unmute controls
- Play/pause feedback

### 4. FeedCard
- Activity posts
- Event posts
- General posts
- Type-specific borders
- All improvements applied

### 5. UX Improvements
- Before/After comparisons
- Center-weighted cropping demo
- Gradient affordance
- Spring animation specs
- Clickable image grids

---

## Screenshots

The HTML design board includes:
- 📱 iPhone mockups
- 🎨 Component previews
- 📊 Before/After visuals
- 🎯 Feature lists
- 💻 Code examples
- 🏆 Industry patterns

---

## Tips

### For Presentations:
1. Use **HTML Design Board**
2. Open in fullscreen (F11)
3. Scroll through sections
4. Reference industry patterns

### For Development:
1. Use **Dev Screen**
2. Test real interactions
3. Verify animations
4. Check theme support
5. Validate behaviors

### For Stakeholders:
1. Share **HTML file** via email/Slack
2. They can open locally
3. No app installation needed
4. Professional presentation

---

## Customization

### HTML Design Board

Edit `component-showcase.html` to:
- Add new components
- Update descriptions
- Change colors/branding
- Add screenshots

### Dev Screen

Edit `src/screens/dev/ComponentShowcase.tsx` to:
- Add new demo cases
- Update sample data
- Add new tabs
- Customize layouts

---

## Feedback & Iteration

Use these tools to:
1. **Show progress** to stakeholders
2. **Validate UX decisions** with team
3. **Document component behavior**
4. **Test edge cases** during development
5. **Create visual regression tests**

---

## Example Workflow

### Design Review:
```
1. Open HTML showcase in browser
2. Present to team
3. Discuss improvements
4. Get approval
```

### QA Testing:
```
1. Open dev screen in app
2. Test each component
3. Verify behaviors
4. Log issues
```

### Stakeholder Demo:
```
1. Send HTML file
2. Schedule call
3. Walk through components
4. Collect feedback
```

---

## Next Steps

### Recommended:
1. Add dev screen to your app now
2. Test with real data
3. Share HTML with team
4. Iterate based on feedback

### Advanced:
- Add screenshot tests (detox)
- Record video demos
- Create component library (Storybook)
- Build visual regression tests

---

*Created: 2026-01-28*
*Tools: HTML5 + React Native*
*Purpose: Component documentation & testing*

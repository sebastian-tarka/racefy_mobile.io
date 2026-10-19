# Training Plans Feature - Integration Guide

## ✅ What's Been Implemented

The Training Plans feature is now fully implemented with all screens, API methods, types, and translations. Here's what's ready:

### Files Created/Updated:

**Types:**
- ✅ `src/types/api.ts` - Added training types (CalibrationData, TrainingProgram, TrainingWeek, TrainingSession)

**API Service:**
- ✅ `src/services/api.ts` - Added 6 training API methods:
  - `createCalibration()`
  - `initProgram()`
  - `getProgram()`
  - `getCurrentProgram()`
  - `getProgramWeeks()`
  - `completeTrainingSession()`

**Screens:**
- ✅ `src/screens/training/CalibrationFormScreen.tsx` - Create calibration form
- ✅ `src/screens/training/ProgramLoadingScreen.tsx` - Loading/polling screen
- ✅ `src/screens/training/WeeksListScreen.tsx` - List of training weeks
- ✅ `src/screens/training/WeekDetailScreen.tsx` - Week detail with sessions
- ✅ `src/screens/training/index.ts` - Export file

**Navigation:**
- ✅ `src/navigation/types.ts` - Added 4 training routes
- ✅ `src/navigation/AppNavigator.tsx` - Registered training screens

**Translations:**
- ✅ `src/i18n/locales/en.json` - English translations
- ✅ `src/i18n/locales/pl.json` - Polish translations

---

## 🔧 Integration Options

You need to decide **where** to add the entry point for Training Plans. Here are the recommended options:

### Option 1: Add to Profile Screen (Recommended)

Add a "Training Plans" button/card in the Profile screen that navigates to training.

**File:** `src/screens/main/ProfileScreen.tsx`

```tsx
// Add this button/card in your profile screen
<TouchableOpacity
  style={styles.trainingCard}
  onPress={() => checkTrainingAccess()}
>
  <Ionicons name="fitness" size={24} color={colors.primary} />
  <View style={styles.trainingCardContent}>
    <Text style={styles.trainingCardTitle}>
      {t('training.title')}
    </Text>
    <Text style={styles.trainingCardSubtitle}>
      {t('training.subtitle')}
    </Text>
  </View>
  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
</TouchableOpacity>

// Add this function to check if user has active program
const checkTrainingAccess = async () => {
  try {
    const program = await api.getCurrentProgram();
    if (program) {
      navigation.navigate('TrainingWeeksList', { programId: program.id });
    } else {
      navigation.navigate('TrainingCalibration');
    }
  } catch (error) {
    console.error('Failed to check training status:', error);
    navigation.navigate('TrainingCalibration');
  }
};
```

### Option 2: Add a New Tab (Bottom Navigation)

Add "Training" as a 6th tab in the bottom navigation.

**File:** `src/navigation/AppNavigator.tsx`

In the `MainNavigator` function, add:

```tsx
<MainTab.Screen
  name="Training"
  component={TrainingEntryScreen} // You'd need to create this wrapper screen
  options={{
    tabBarLabel: 'Training',
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons
        name={focused ? 'fitness' : 'fitness-outline'}
        size={size}
        color={color}
      />
    ),
  }}
  listeners={authGuardListener}
/>
```

You'll need to create a simple entry screen that checks for active program:

```tsx
// src/screens/training/TrainingEntryScreen.tsx
export function TrainingEntryScreen({ navigation }: Props) {
  useEffect(() => {
    checkTraining();
  }, []);

  const checkTraining = async () => {
    const program = await api.getCurrentProgram();
    if (program) {
      navigation.replace('TrainingWeeksList', { programId: program.id });
    } else {
      navigation.replace('TrainingCalibration');
    }
  };

  return <Loading fullScreen />;
}
```

### Option 3: Add to Settings Menu

Add a "Training Plans" option in the Settings screen.

**File:** `src/screens/settings/SettingsScreen.tsx`

```tsx
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => checkAndNavigateToTraining()}
>
  <Ionicons name="fitness" size={24} color={colors.primary} />
  <Text style={styles.settingLabel}>{t('training.title')}</Text>
  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
</TouchableOpacity>
```

---

## 📝 Additional Translation Keys Needed

Add these to your locale files for better UX:

```json
// en.json
{
  "training": {
    "subtitle": "AI-powered personalized training programs",
    "getStarted": "Start Training",
    "viewProgram": "View Your Program"
  }
}

// pl.json
{
  "training": {
    "subtitle": "Spersonalizowane plany treningowe oparte na AI",
    "getStarted": "Rozpocznij Trening",
    "viewProgram": "Zobacz Swój Program"
  }
}
```

---

## 🧪 Testing the Feature

### Test Flow:

1. **Navigate to Training:**
   - Go to Profile (or wherever you added the entry point)
   - Tap "Training Plans"

2. **Create Calibration:**
   - Select sport type (e.g., Running)
   - Select goal type (Endurance/Speed/Strength)
   - Select fitness level (Beginner/Intermediate/Advanced)
   - Adjust training frequency (3-6 sessions/week)
   - (Optional) Enter target distance and event date
   - Tap "Create Training Program"

3. **Wait for Generation:**
   - You'll see a loading screen
   - The app polls the API every 2 seconds
   - Program should be active within 5-10 seconds

4. **View Weeks List:**
   - See all training weeks
   - Current week is highlighted
   - Progress bars show completion status
   - Pull to refresh to update data

5. **View Week Detail:**
   - Tap on any week
   - See all sessions for that week
   - Each session shows: day, type, duration/distance, pace, description
   - Tap "Mark as Complete" on any session

6. **Complete Sessions:**
   - Mark sessions complete throughout the week
   - Week progress updates automatically
   - Celebration when week is 100% complete

### Test Accounts:progress
```
Email: test@racefy.test
Password: password

Email: demo@racefy.test
Password: password
```

---

## 🎯 User Flow Summary

```
Entry Point (Profile/Tab/Settings)
         ↓
Check getCurrentProgram()
         ↓
    ┌────┴────┐
    │         │
 No Program  Has Program
    │         │
    ↓         ↓
Calibration  Weeks List
    Form         ↓
    ↓        Week Detail
Initialize       ↓
  Program    Complete
    ↓        Sessions
 Loading
  Screen
    ↓
Poll Status
    ↓
Weeks List
```

---

## 🔗 API Endpoints Used

All endpoints are already implemented in `services/api.ts`:

1. `POST /training/calibration` - Create calibration
2. `POST /training/programs/initialize` - Start program generation (async)
3. `GET /training/programs/{id}` - Poll program status
4. `GET /training/programs/current` - Get active program
5. `GET /training/programs/{id}/weeks` - Get all weeks
6. `PATCH /training/programs/{id}/weeks/{week}/sessions/{id}/complete` - Mark complete

---

## 🚀 Next Steps

1. **Choose Integration Option** (Profile/Tab/Settings)
2. **Test the Complete Flow**
3. **Optional Enhancements:**
   - Add notifications for upcoming training sessions
   - Sync completed sessions with activities
   - Export training plan to calendar
   - Add progress statistics/charts
   - Share training achievements

---

## 📦 Dependencies

All required dependencies are already in your project:
- `@react-native-community/slider` (used for training frequency)
- `@react-native-community/datetimepicker` (used for target event date)
- All other components use existing app dependencies

---

## 💡 Pro Tips

1. **Caching:** Consider caching the current program in AsyncStorage to reduce API calls
2. **Offline:** Add offline support for viewing weeks (using AsyncStorage)
3. **Push Notifications:** Send reminders for upcoming training sessions
4. **Activity Integration:** Link completed training sessions to recorded activities
5. **Progress Tracking:** Add charts showing completion trends over weeks

---

## 🐛 Troubleshooting

**Program generation times out:**
- Check backend AI service is running
- Increase timeout from 30s if needed (in `ProgramLoadingScreen.tsx`)

**"Program not found" error:**
- Ensure user is authenticated
- Check API endpoint returns correct data structure

**Navigation errors:**
- Verify all routes are added to `types.ts` and `AppNavigator.tsx`
- Check navigation params match the type definitions

---

## ✅ Implementation Checklist

Before deploying:

- [ ] Choose and implement entry point (Profile/Tab/Settings)
- [ ] Test complete calibration flow
- [ ] Test program generation and polling
- [ ] Test weeks list display
- [ ] Test session completion
- [ ] Test with both test accounts
- [ ] Test error scenarios (network failure, timeout)
- [ ] Verify translations in both English and Polish
- [ ] Test on both iOS and Android
- [ ] Consider adding analytics tracking for training feature usage

---

**The feature is ready to use! Choose your integration option and start testing.** 🎉

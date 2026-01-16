# Commentary Settings Component - Integration Guide

## Overview

The `CommentarySettingsSection` component provides a complete UI for configuring AI commentary settings in the event creation/edit form. It follows the app's design patterns and supports both light and dark themes.

## Component Features

✅ **Collapsible Section** - Expands/collapses like other optional fields
✅ **Enable/Disable Toggle** - Main switch for commentary
✅ **Style Selection** - 6 predefined commentary styles with descriptions
✅ **Language Selection** - Multi-select for English and Polish
✅ **Update Interval** - 5, 10, 15, 30, or 60 minute intervals
✅ **Token Limit** - Optional limit to control costs
✅ **Auto-publish Toggle** - Automatically publish generated commentary
✅ **Full Theme Support** - Works in light and dark mode
✅ **Validation** - Prevents deselecting all languages

## Integration Example

### 1. Add to EventFormScreen State

```typescript
// Add to FormData interface
interface FormData {
  // ... existing fields
  commentary_settings: {
    enabled: boolean;
    style: CommentaryStyle;
    token_limit: number | null;
    interval_minutes: number;
    auto_publish: boolean;
    languages: CommentaryLanguage[];
  };
}

// Add to initialFormData
const initialFormData: FormData = {
  // ... existing fields
  commentary_settings: {
    enabled: false,
    style: 'professional',
    token_limit: null,
    interval_minutes: 15,
    auto_publish: true,
    languages: ['en'],
  },
};
```

### 2. Import Component

```typescript
import { CommentarySettingsSection } from '../../components';
import type { CommentaryStyle, CommentaryLanguage } from '../../types/api';
```

### 3. Add to Form Render

```typescript
{/* After Optional Fields section */}
<CommentarySettingsSection
  value={formData.commentary_settings}
  onChange={(settings) => updateField('commentary_settings', settings)}
  disabled={isLimitedEdit}
/>
```

### 4. Update API Request

```typescript
const handleSubmit = async () => {
  // ... validation

  const requestData: CreateEventRequest = {
    // ... existing fields
    commentary_settings: formData.commentary_settings.enabled
      ? {
          enabled: formData.commentary_settings.enabled,
          style: formData.commentary_settings.style,
          token_limit: formData.commentary_settings.token_limit,
          interval_minutes: formData.commentary_settings.interval_minutes,
          auto_publish: formData.commentary_settings.auto_publish,
          languages: formData.commentary_settings.languages,
        }
      : undefined, // Don't send if disabled
  };

  // Submit to API
};
```

### 5. Populate from API (Edit Mode)

```typescript
const populateForm = (event: Event) => {
  setFormData({
    // ... existing fields
    commentary_settings: event.commentary_settings || {
      enabled: false,
      style: 'professional',
      token_limit: null,
      interval_minutes: 15,
      auto_publish: true,
      languages: ['en'],
    },
  });
};
```

## Component Props

```typescript
interface CommentarySettingsSectionProps {
  value: CommentarySettingsData;
  onChange: (settings: CommentarySettingsData) => void;
  disabled?: boolean; // Disables all controls
}

interface CommentarySettingsData {
  enabled: boolean;
  style: CommentaryStyle;
  token_limit: number | null;
  interval_minutes: number;
  auto_publish: boolean;
  languages: CommentaryLanguage[];
}
```

## Available Options

### Commentary Styles

| Style | Name | Description |
|-------|------|-------------|
| `exciting` | Exciting | Energetic and enthusiastic |
| `professional` | Professional | Formal and objective |
| `casual` | Casual | Friendly and relaxed |
| `humorous` | Humorous | Playful and witty |
| `statistical` | Statistical | Data-focused analysis |
| `motivational` | Motivational | Encouraging and supportive |

### Languages

| Code | Name | Flag |
|------|------|------|
| `en` | English | 🇬🇧 |
| `pl` | Polski | 🇵🇱 |

### Update Intervals

Available options: **5, 10, 15, 30, 60** minutes

## UI Preview

```
┌─────────────────────────────────────────────┐
│ 🎙️ AI Commentary                ▼          │
│    Enabled                                  │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Enable AI Commentary            [✓ ON]  │ │
│ │ Generate AI commentary for this event   │ │
│ ├─────────────────────────────────────────┤ │
│ │ Commentary Style                        │ │
│ │ Choose the tone and style               │ │
│ │ ┌─────────┐ ┌─────────┐                │ │
│ │ │Exciting✓│ │Profess. │                │ │
│ │ └─────────┘ └─────────┘                │ │
│ │ ┌─────────┐ ┌─────────┐                │ │
│ │ │ Casual  │ │Humorous │                │ │
│ │ └─────────┘ └─────────┘                │ │
│ ├─────────────────────────────────────────┤ │
│ │ Languages                               │ │
│ │ ┌──────────┐ ┌──────────┐              │ │
│ │ │🇬🇧 English│ │🇵🇱 Polski │              │ │
│ │ └──────────┘ └──────────┘              │ │
│ ├─────────────────────────────────────────┤ │
│ │ Update Interval                         │ │
│ │ [5][10][15✓][30][60]                   │ │
│ ├─────────────────────────────────────────┤ │
│ │ Token Limit: [________]                 │ │
│ │ Leave empty for unlimited               │ │
│ ├─────────────────────────────────────────┤ │
│ │ Auto-publish                    [✓ ON]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Validation Rules

1. **At least one language must be selected** - Component prevents deselecting the last language
2. **Token limit is optional** - Empty = unlimited
3. **Token limit must be numeric** - Non-numeric input is ignored
4. **All settings hidden when disabled** - Only enable toggle shows when `enabled: false`

## Theme Support

The component automatically adapts to light and dark themes:

- **Light Mode**: White backgrounds, emerald accents
- **Dark Mode**: Dark gray backgrounds, emerald accents
- **Selected States**: Success color (emerald) for active selections
- **Borders**: Theme-aware border colors

## Accessibility

- Touch targets meet minimum 44x44pt size
- Clear visual feedback on selection
- Disabled state reduces opacity to 60%
- Icons provide visual context

## Performance Notes

- Component uses controlled inputs (no internal state)
- Efficient re-renders (only updates when value changes)
- No network calls within component (parent handles API)

## Example: Complete EventFormScreen Integration

```typescript
export function EventFormScreen({ navigation, route }: Props) {
  // ... existing code

  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    commentary_settings: {
      enabled: false,
      style: 'professional',
      token_limit: null,
      interval_minutes: 15,
      auto_publish: true,
      languages: ['en'],
    },
  });

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView>
      <ScrollView>
        {/* Existing form fields */}

        {/* Add Commentary Settings */}
        <CommentarySettingsSection
          value={formData.commentary_settings}
          onChange={(settings) => updateField('commentary_settings', settings)}
          disabled={isLimitedEdit}
        />

        {/* Submit Button */}
        <Button title="Save Event" onPress={handleSubmit} />
      </ScrollView>
    </SafeAreaView>
  );
}
```

## Notes

- Settings are only sent to API if `enabled: true`
- Default values are provided for all fields
- Component handles all UI logic internally
- Parent component only needs to provide value and onChange

---

**Last Updated:** 2026-01-16
**Component Version:** 1.0.0

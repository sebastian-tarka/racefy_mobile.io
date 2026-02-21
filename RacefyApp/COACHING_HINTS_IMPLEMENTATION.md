# Coaching Hints — Mobile Implementation Guide

**For:** Senior React Native Developer
**Scope:** Add coaching hints to EXISTING training feature (Week Detail Screen + Program Overview)
**Estimated time:** 4-6 hours
**Approach:** Extend, don't rebuild. The training feature already works — we're adding a new data layer to it.

---

## What Already Exists (DO NOT rebuild)

The mobile app already has these training screens:
- **Calibration Form** — creates training plan
- **Program Overview** — weeks list with progress bars
- **Week Detail** — suggested activities, notes, complete/skip actions
- **Week Feedback** — compliance data, coach messages, trends

All of these work. This task adds **coaching hints** — AI-generated per-week guidance that tells the user what to focus on in each session.

---

## What You're Adding

### 1. Coaching Hint Panel on Week Detail Screen
### 2. Hint indicator icon on Week Cards (Program Overview)
### 3. "Generate Coaching Hints" button on Program Overview
### 4. Polling mechanism for async hint generation

---

## API Reference (Already Deployed)

### Week response now includes `coaching_hint`

`GET /api/training/weeks/{id}` — the field is already there, no backend changes needed.

```json
{
  "data": {
    "id": 42,
    "week_number": 1,
    "phase_name": "Base Building",
    "start_date": "2026-02-24",
    "end_date": "2026-03-02",
    "status": "active",
    "focus_description": "Build aerobic base with comfortable efforts",
    "progress": {
      "activities_count": 1,
      "sessions_per_week": 3,
      "suggested_activities_count": 3,
      "total_distance": 5.2,
      "total_duration": 1800
    },
    "suggested_activities": [
      {
        "session_order": 1,
        "activity_type": "Easy Run",
        "intensity_description": "comfortable pace",
        "target_duration_minutes": 30,
        "target_distance_meters": null,
        "notes": "Focus on relaxed breathing"
      }
    ],
    "coaching_hint": {
      "week_overview": "This week focuses on building a solid aerobic base. Keep all runs at a conversational pace — you should be able to talk comfortably throughout.",
      "session_hints": [
        {
          "session_order": 1,
          "title": "Easy Aerobic Run",
          "description": "A comfortable session to maintain your aerobic base and build consistency.",
          "warm_up": "Start with 5 minutes of easy walking, gradually increasing to a light jog.",
          "main_focus": "Maintain a conversational pace throughout. If you find yourself breathing heavily, slow down.",
          "cool_down": "End with 5 minutes of walking and gentle stretching for calves and quads."
        },
        {
          "session_order": 2,
          "title": "Recovery Run",
          "description": "A very easy session focused on active recovery.",
          "warm_up": "5 minutes of walking.",
          "main_focus": "Keep the effort very easy. This is about movement, not intensity.",
          "cool_down": "Gentle stretching focusing on hips and ankles."
        },
        {
          "session_order": 3,
          "title": "Comfortable Long Run",
          "description": "Slightly longer session to build endurance at an easy pace.",
          "warm_up": "Start with 5-10 minutes of easy walking.",
          "main_focus": "Find a comfortable rhythm. Walk breaks are perfectly fine.",
          "cool_down": "10 minutes of walking, then full-body stretching."
        }
      ]
    },
    "notes": null,
    "activities": []
  }
}
```

**Key points:**
- `coaching_hint` is `null` when not yet generated
- `coaching_hint.session_hints` array length matches `progress.sessions_per_week`
- Content is auto-translated based on `Accept-Language` header (send `pl` or `en`)
- Each session hint has: `title`, `description`, `warm_up`, `main_focus`, `cool_down`

### Weeks list also includes coaching_hint

`GET /api/training/weeks` — returns all weeks, each with `coaching_hint` (null or object).

Use this to show hint indicator icons on week cards and to poll for generation progress.

### Generate hints (async)

```http
POST /api/training/programs/{programId}/generate-hints
Authorization: Bearer {token}
```

**Response 202** (job dispatched):
```json
{
  "message": "Coaching hints generation started.",
  "status": "processing",
  "weeks_pending": 10,
  "total_weeks": 10
}
```

**Response 200** (all already have hints):
```json
{
  "message": "All weeks already have coaching hints.",
  "status": "completed"
}
```

**Important:** Generation takes ~10-15 seconds per week (AI call). For a 10-week program that's ~2 minutes total. The endpoint dispatches a background job and returns immediately with 202. You must **poll** `GET /api/training/weeks` every 5 seconds to check progress.

---

## TypeScript Types

```typescript
// Add to your existing training types

interface CoachingHint {
  week_overview: string;
  session_hints: SessionHint[];
}

interface SessionHint {
  session_order: number;    // 1-based
  title: string;
  description: string;
  warm_up: string;
  main_focus: string;
  cool_down: string;
}

// Your existing Week type already gets this field from the API.
// Just add to the interface:
interface TrainingWeek {
  // ... existing fields ...
  coaching_hint: CoachingHint | null;
}
```

---

## Implementation Plan

### Step 1: API Service (5 min)

Add to your existing training API service:

```typescript
// Add this to your existing training service
export const generateAllHints = (programId: number) =>
  api.post(`/training/programs/${programId}/generate-hints`);
```

The `getWeek()` and `getWeeks()` calls already return `coaching_hint` — no changes needed.

---

### Step 2: SessionHintCard Component (new, 30 min)

A single session's coaching hint with expandable warm-up / main focus / cool-down sections.

**Behavior:**
- Always show: order badge (circle with number), title, description
- Three collapsible sections: Warm-up, Main Focus, Cool-down (start collapsed)
- Tap section header → expand/collapse

**SPA reference (adapt to React Native):**

```
┌─────────────────────────────────────┐
│  ① Easy Aerobic Run                 │
│  A comfortable session to maintain  │
│  your aerobic base and build...     │
│                                     │
│  ┌─ Warm-up ──────────────── ▼ ──┐  │
│  │ Start with 5 minutes of easy  │  │
│  │ walking, gradually increasing │  │
│  │ to a light jog.               │  │
│  └───────────────────────────────┘  │
│                                     │
│  ── Main Focus ──────────── ▶ ──    │
│                                     │
│  ── Cool-down ───────────── ▶ ──    │
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface SessionHintCardProps {
  hint: SessionHint;
  index: number; // 0-based, display as index+1
}
```

**Structure:**
- Card container with border
- Header row: numbered badge (emerald circle) + title
- Description text below title
- Three pressable accordion sections with chevron icon

---

### Step 3: CoachingHintPanel Component (new, 20 min)

Container that shows the week overview + list of session hint cards.

```
┌─────────────────────────────────────┐
│  💡 Coaching Hints                  │
│                                     │
│  ┌─ Week Overview ────────────────┐ │
│  │ This week focuses on building  │ │
│  │ a solid aerobic base. Keep all │ │
│  │ runs at a conversational pace. │ │
│  └────────────────────────────────┘ │
│                                     │
│  [SessionHintCard 1]                │
│  [SessionHintCard 2]                │
│  [SessionHintCard 3]                │
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface CoachingHintPanelProps {
  coachingHint: CoachingHint;
}
```

**Structure:**
- Section heading with lightbulb icon + "Coaching Hints" text
- Week overview in emerald-tinted card (light green bg)
- Map `session_hints[]` → `SessionHintCard` components

If `coachingHint` is null, render nothing (parent handles empty state).

---

### Step 4: Integrate into Week Detail Screen (30 min)

Add the coaching hint panel to your **existing** Week Detail screen, between the header/progress section and the suggested activities section.

**Where to place it in the scroll view:**

```
[Back button]
[Week header — number, phase, dates, status badge]
[WeekProgressBar]
[Focus description]

── NEW: Coaching Hints Section ──────────
  if coaching_hint exists:
    <CoachingHintPanel coachingHint={week.coaching_hint} />
  else:
    <Empty state: "No coaching guidance available for this week.">
─────────────────────────────────────────

[Suggested Activities]    ← existing
[Linked Activities]       ← existing
[Notes]                   ← existing
[Complete/Skip buttons]   ← existing
```

**No new API calls needed** — `coaching_hint` is already in the week response.

---

### Step 5: Hint Indicator on Week Cards (15 min)

In your **existing** week card component (Program Overview / Weeks List), add a small indicator icon when `week.coaching_hint` is not null.

```
┌─────────────────────────────────────┐
│  Week 3 — Base Building        💡  │  ← hint icon when coaching_hint exists
│  Mar 10 - Mar 16                    │
│  [████░░░░░░] 1/3 sessions         │
│  Active                             │
└─────────────────────────────────────┘
```

Simple conditional: `{week.coaching_hint && <LightbulbIcon />}`

---

### Step 6: "Generate Coaching Hints" Button + Polling (1 hour)

Add to your **existing** Program Overview screen, above the weeks list. Only visible when at least one week has no hint.

**Behavior:**
1. Show button if `weeks.some(w => !w.coaching_hint)` is true
2. On press → call `POST /training/programs/{id}/generate-hints`
3. If response status is `"completed"` → show info toast, done
4. If response status is `"processing"` (HTTP 202) → start polling
5. Poll `GET /training/weeks` every 5 seconds
6. Show progress: "Generating hints... (3/10)"
7. When all weeks have hints (remaining = 0) → stop polling, show success toast, refresh weeks list
8. On unmount → clear polling interval

**Placement:**

```
[ProgramHeader]

┌─────────────────────────────────────┐   ← NEW: only when hints missing
│  💡 Generate Coaching Hints         │
│      Generating hints... (3/10)     │   ← while generating
└─────────────────────────────────────┘

[WeekCard 1]
[WeekCard 2]
...
```

**Polling implementation pattern:**

```typescript
const [isGenerating, setIsGenerating] = useState(false);
const [progress, setProgress] = useState<{pending: number; total: number} | null>(null);
const pollRef = useRef<NodeJS.Timeout | null>(null);

const stopPolling = useCallback(() => {
  if (pollRef.current) {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }
}, []);

// Cleanup on unmount
useEffect(() => stopPolling, [stopPolling]);

const handleGenerate = async () => {
  setIsGenerating(true);
  try {
    const response = await generateAllHints(program.id);

    if (response.data.status === 'completed') {
      setIsGenerating(false);
      // show info toast
      return;
    }

    // 202 — start polling
    const totalPending = response.data.weeks_pending;
    setProgress({ pending: totalPending, total: weeks.length });

    pollRef.current = setInterval(async () => {
      const weeksRes = await getWeeks();
      const freshWeeks = weeksRes.data.data;
      const remaining = freshWeeks.filter(w => !w.coaching_hint).length;

      setProgress(prev => prev ? { ...prev, pending: remaining } : null);

      if (remaining === 0) {
        stopPolling();
        setIsGenerating(false);
        setProgress(null);
        // show success toast
        // refresh parent weeks list
      }
    }, 5000);
  } catch (err) {
    setIsGenerating(false);
    // show error toast
  }
};
```

---

## Files Summary

### New files (2 components)
| File | Purpose |
|------|---------|
| `SessionHintCard.tsx` | Single session hint with expandable sections |
| `CoachingHintPanel.tsx` | Week overview + session hints list |

### Modified files (3 screens + 1 service)
| File | Change |
|------|--------|
| Training API service | Add `generateAllHints()` |
| Week Detail Screen | Add `CoachingHintPanel` between header and suggested activities |
| Week Card component | Add hint indicator icon (💡) when `coaching_hint` exists |
| Program Overview Screen | Add "Generate Hints" button with polling |

### NOT modified
- Calibration form — no changes
- Week Feedback screen — no changes
- Navigation — no new screens, hints are shown inline
- Types file — just add `CoachingHint` and `SessionHint` interfaces

---

## Styling Reference

Use your existing design system. The SPA uses these patterns (adapt to React Native):

| Element | SPA Style | React Native equivalent |
|---------|-----------|------------------------|
| Week overview card | `bg-emerald-50` (light green bg) | Light emerald/green tinted card |
| Session order badge | Emerald circle with white number | Small round badge |
| Section headers | Gray text with chevron | Pressable row with chevron icon |
| Expanded content | Gray text, indented | Normal text in collapsible |
| Hint indicator | Lightbulb SVG icon | Your icon library equivalent |
| Generate button | Emerald outline button | Outline/secondary button style |

---

## Edge Cases

1. **No program** → "Generate Hints" button not shown (existing empty state handles this)
2. **All hints already generated** → Button hidden (`hasWeeksWithoutHints` is false)
3. **Generation in progress, user leaves screen** → Stop polling on unmount
4. **API error during generation** → Show error toast, reset generating state
5. **coaching_hint is null for a week** → Show "No coaching guidance available" empty state on week detail
6. **Accept-Language header** → Send user's language preference, API returns translated hints automatically

---

## Testing Checklist

- [ ] Open Week Detail for a week WITH coaching_hint → see overview + session cards
- [ ] Open Week Detail for a week WITHOUT coaching_hint → see empty state message
- [ ] Tap session hint sections → warm-up/focus/cool-down expand/collapse
- [ ] Program Overview → weeks with hints show 💡 icon
- [ ] Program Overview → "Generate Hints" button visible when hints are missing
- [ ] Tap "Generate Hints" → spinner + progress counter (X/Y)
- [ ] Wait for generation to complete → success toast, button disappears, 💡 icons appear
- [ ] Switch language to Polish → hints displayed in Polish
- [ ] Navigate away during generation → no crashes, polling stops

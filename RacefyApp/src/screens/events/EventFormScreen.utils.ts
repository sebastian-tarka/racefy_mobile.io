import {CommentaryLanguage, CommentaryStyle, EventRankingMode} from "../../types/api";
import type {NativeStackScreenProps} from "@react-navigation/native-stack";
import type {RootStackParamList} from "../../navigation";
import {StyleSheet} from "react-native";
import {borderRadius, fontSize, spacing} from "../../theme";

export type Props = NativeStackScreenProps<RootStackParamList, 'EventForm'>;
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';

// Local interface for commentary settings (managed via separate API)
export interface CommentarySettingsData {
    enabled: boolean;
    style: CommentaryStyle;
    token_limit: number | null;
    interval_minutes: number;
    auto_publish: boolean;
    languages: CommentaryLanguage[];
    force_participants: boolean;
    time_windows: Array<{ start: string; end: string }>;
    days_of_week: number[];
    pause_summary_enabled: boolean;
}

export const defaultCommentarySettings: CommentarySettingsData = {
    enabled: false,
    style: 'exciting',
    token_limit: null,
    interval_minutes: 15,
    auto_publish: true,
    languages: ['en', 'pl'],
    force_participants: false,
    time_windows: [],
    days_of_week: [],
    pause_summary_enabled: true,
};

export interface FormData {
    title: string;
    content: string;
    sport_type_id: number | null;
    ranking_mode?: EventRankingMode,
    location_name: string;
    latitude: number;
    longitude: number;
    starts_at: Date;
    ends_at: Date;
    registration_opens_at: Date | null;
    registration_closes_at: Date | null;
    max_participants: string;
    difficulty: DifficultyLevel;
    distance: string;
    entry_fee: string;
    // GPS Privacy (new in 2026-01)
    show_start_finish_points: boolean;
    start_finish_note: string;
    // Activity aggregation
    allow_multiple_activities: boolean;
}

export const initialFormData: FormData = {
    title: '',
    content: '',
    sport_type_id: null,
    ranking_mode: 'fastest_time',
    location_name: '',
    latitude: 0,
    longitude: 0,
    starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
    registration_opens_at: null,
    registration_closes_at: null,
    max_participants: '',
    difficulty: 'all_levels',
    distance: '',
    entry_fee: '',
    // GPS Privacy (new in 2026-01)
    show_start_finish_points: false,
    start_finish_note: '',
    // Activity aggregation
    allow_multiple_activities: false,
};
export type DatePickerField = 'starts_at' | 'ends_at' | 'registration_opens_at' | 'registration_closes_at';
export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.lg,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: fontSize.sm,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    dateText: {
        fontSize: fontSize.md,
        flex: 1,
    },
    errorText: {
        fontSize: fontSize.sm,
        marginTop: spacing.xs,
    },
    optionalToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        marginBottom: spacing.sm,
    },
    optionalToggleText: {
        fontSize: fontSize.md,
        fontWeight: '600',
    },
    optionalCard: {
        marginBottom: spacing.md,
    },
    submitButton: {
        marginTop: spacing.lg,
        marginBottom: spacing.xl,
    },
    gpsPrivacySection: {
        borderTopWidth: 1,
        paddingTop: spacing.lg,
        marginTop: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        fontSize: fontSize.sm,
        lineHeight: 20,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderRadius: borderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        borderColor: 'transparent',
    },
    checkboxTextContainer: {
        flex: 1,
    },
    checkboxLabel: {
        fontSize: fontSize.md,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    checkboxDescription: {
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
});
import React, {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {useTranslation} from 'react-i18next';
import {format} from 'date-fns';
import {
    Button,
    Card,
    CommentarySettingsSection,
    DifficultySelector,
    ImagePickerButton,
    Input,
    MediaPicker,
    OptionSelector,
    ScreenHeader,
    SportTypeSelector,
    ScreenContainer,
} from '../../components';
import {api} from '../../services/api';
import {logger} from '../../services/logger';
import {emitRefresh} from '../../services/refreshEvents';
import {fixStorageUrl} from '../../config/api';
import {useTheme} from '../../hooks/useTheme';
import {useSportTypes} from '../../hooks/useSportTypes';
import {spacing} from '../../theme';
import {CreateEventRequest, Event, EventRankingMode, EventTeamScoring, EventVisibility, MediaItem, UpdateEventRequest,} from '../../types/api';
import {
    CommentarySettingsData,
    DatePickerField,
    defaultCommentarySettings,
    FormData,
    initialFormData,
    Props,
    styles
} from "./EventFormScreen.utils";
import {EventRankingModeSelector} from "../../components/EventRankingModeSelector";

export function EventFormScreen({navigation, route}: Props) {
    const {eventId} = route.params || {};
    const isEditMode = !!eventId;
    const {t} = useTranslation();
    const {colors} = useTheme();
    const {sportTypes, isLoading: isSportTypesLoading} = useSportTypes();

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [eventMedia, setEventMedia] = useState<MediaItem[]>([]);
    const [commentarySettings, setCommentarySettings] = useState<CommentarySettingsData>(
        defaultCommentarySettings
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEditMode);
    const [showDatePicker, setShowDatePicker] = useState<{
        field: DatePickerField;
        mode: 'date' | 'time';
    } | null>(null);
    const [showOptionalFields, setShowOptionalFields] = useState(false);
    const [eventStatus, setEventStatus] = useState<string | null>(null);
    const [hasAiFeatures, setHasAiFeatures] = useState(false);

    // Limited edit mode for ongoing/completed/cancelled events - only media, title, description can be edited
    const isLimitedEdit = isEditMode && (eventStatus === 'ongoing' || eventStatus === 'completed' || eventStatus === 'cancelled');

    // AI commentary is read-only for completed/cancelled events
    const isCommentaryReadOnly = isEditMode && (eventStatus === 'completed' || eventStatus === 'cancelled');

    // Check if user has AI features enabled
    useEffect(() => {
        const checkAiFeatures = async () => {
            try {
                const features = await api.getAiFeatures();
                setHasAiFeatures(features.ai_features_enabled && features.ai_commentary_enabled);
            } catch (error) {
                logger.debug('api', 'Failed to check AI features', {error});
                setHasAiFeatures(false);
            }
        };
        checkAiFeatures();
    }, []);

    useEffect(() => {
        if (isEditMode && eventId) {
            fetchEvent(eventId);
        }
    }, [eventId]);

    const fetchEvent = async (id: number) => {
        setIsFetching(true);
        try {
            const [event, settings] = await Promise.all([
                api.getEvent(id),
                api.getCommentarySettings(id).catch((err) => {
                    // Commentary settings may not be accessible if user is not organizer
                    logger.debug('api', 'Could not load commentary settings', {error: err});
                    return null;
                }),
            ]);
            logger.debug('api', 'Fetched event for form', {
                id: event.id,
                sport_type_id: event.sport_type_id,
                ranking_mode:event.ranking_mode,
                sport_type: event.sport_type,
                hasCommentarySettings: !!settings,
            });
            populateForm(event);
            if (settings) {
                setCommentarySettings({
                    enabled: settings.enabled,
                    style: settings.style,
                    token_limit: settings.token_limit,
                    interval_minutes: settings.interval_minutes,
                    auto_publish: settings.auto_publish,
                    languages: settings.languages,
                    force_participants: settings.force_participants || false,
                    time_windows: settings.time_windows || [],
                    days_of_week: settings.days_of_week || [],
                    pause_summary_enabled: settings.pause_summary_enabled !== false,
                });
            }
        } catch (error) {
            logger.error('api', 'Failed to fetch event', {error});
            Alert.alert(t('common.error'), t('eventDetail.failedToLoad'));
            navigation.goBack();
        } finally {
            setIsFetching(false);
        }
    };

    const populateForm = (event: Event) => {
        setEventStatus(event.status);
        // Use sport_type_id if available, otherwise fallback to sport_type.id
        const sportTypeId = event.sport_type_id ?? event.sport_type?.id ?? null;
        setFormData({
            title: event.post?.title || '',
            content: event.post?.content || '',
            sport_type_id: sportTypeId,
            location_name: event.location_name,
            ranking_mode: event.ranking_mode,
            latitude: event.latitude,
            longitude: event.longitude,
            starts_at: new Date(event.starts_at),
            ends_at: new Date(event.ends_at),
            registration_opens_at: event.registration_opens_at
                ? new Date(event.registration_opens_at)
                : null,
            registration_closes_at: event.registration_closes_at
                ? new Date(event.registration_closes_at)
                : null,
            max_participants: event.max_participants?.toString() || '',
            difficulty: event.difficulty,
            // Convert from meters (API) to km (form display)
            distance: event.distance ? (event.distance / 1000).toString() : '',
            entry_fee: event.entry_fee?.toString() || '',
            // GPS Privacy (new in 2026-01)
            show_start_finish_points: event.show_start_finish_points ?? false,
            start_finish_note: event.start_finish_note || '',
            // Activity aggregation
            allow_multiple_activities: event.allow_multiple_activities ?? false,
            // Visibility
            visibility: event.visibility || 'public',
            // Ranking mode config
            target_distance: event.target_distance ? (event.target_distance / 1000).toString() : '',
            time_limit: event.time_limit ? (event.time_limit / 60).toString() : '',
            // Team event
            is_team_event: event.is_team_event ?? false,
            team_size_min: event.team_size_min?.toString() || '',
            team_size_max: event.team_size_max?.toString() || '',
            team_scoring: event.team_scoring || 'sum',
            // Point rewards
            point_rewards_first: event.point_rewards?.first_place?.toString() || '',
            point_rewards_second: event.point_rewards?.second_place?.toString() || '',
            point_rewards_third: event.point_rewards?.third_place?.toString() || '',
            point_rewards_finisher: event.point_rewards?.finisher?.toString() || '',
        });
        setCoverImage(fixStorageUrl(event.cover_image_url) || null);

        // Show optional fields if any have values
        if (
            event.registration_opens_at ||
            event.registration_closes_at ||
            event.max_participants ||
            event.distance ||
            event.entry_fee ||
            event.point_rewards?.first_place ||
            event.point_rewards?.second_place ||
            event.point_rewards?.third_place ||
            event.point_rewards?.finisher
        ) {
            setShowOptionalFields(true);
        }
    };

    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData(prev => ({...prev, [field]: value}));
        // Clear error when field is updated
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) {
            newErrors.title = t('eventForm.validation.titleRequired');
        }
        if (!formData.sport_type_id) {
            newErrors.sport_type_id = t('eventForm.validation.sportTypeRequired');
        }
        if (!formData.location_name.trim()) {
            newErrors.location_name = t('eventForm.validation.locationRequired');
        }
        if (!formData.starts_at) {
            newErrors.starts_at = t('eventForm.validation.startDateRequired');
        }
        if (!formData.ends_at) {
            newErrors.ends_at = t('eventForm.validation.endDateRequired');
        }
        if (formData.ends_at <= formData.starts_at) {
            newErrors.ends_at = t('eventForm.validation.endDateBeforeStart');
        }

        if (formData.is_team_event) {
            const min = parseInt(formData.team_size_min);
            const max = parseInt(formData.team_size_max);
            if (!formData.team_size_min || min < 2) newErrors.team_size_min = t('eventForm.validation.teamSizeMinRequired');
            if (!formData.team_size_max || max < 2) newErrors.team_size_max = t('eventForm.validation.teamSizeMaxRequired');
            if (min && max && max < min) newErrors.team_size_max = t('eventForm.validation.teamSizeMaxLessThanMin');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check if the image is a local file (needs upload) vs a server URL
    const isLocalImage = (uri: string | null): boolean => {
        if (!uri) return false;
        return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setIsLoading(true);
        try {
            let savedEventId: number;

            console.log(formData)

            if (isEditMode && eventId) {
                const updateData: UpdateEventRequest = {
                    title: formData.title,
                    content: formData.content,
                    sport_type_id: formData.sport_type_id!,
                    ranking_mode:formData.ranking_mode,
                    location_name: formData.location_name,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    starts_at: formData.starts_at.toISOString(),
                    ends_at: formData.ends_at.toISOString(),
                    registration_opens_at: formData.registration_opens_at?.toISOString() || null,
                    registration_closes_at: formData.registration_closes_at?.toISOString() || null,
                    max_participants: formData.max_participants
                        ? parseInt(formData.max_participants, 10)
                        : null,
                    difficulty: formData.difficulty,
                    // Convert from km (form) to meters (API)
                    distance: formData.distance ? parseFloat(formData.distance) * 1000 : null,
                    entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : null,
                    // GPS Privacy (new in 2026-01)
                    show_start_finish_points: formData.show_start_finish_points,
                    start_finish_note: formData.start_finish_note || undefined,
                    // Activity aggregation
                    allow_multiple_activities: formData.allow_multiple_activities,
                    // Visibility
                    visibility: formData.visibility,
                    // Ranking mode config
                    target_distance: formData.target_distance ? parseFloat(formData.target_distance) * 1000 : undefined,
                    time_limit: formData.time_limit ? parseInt(formData.time_limit, 10) * 60 : undefined,
                    // Team event
                    is_team_event: formData.is_team_event,
                    team_size_min: formData.is_team_event && formData.team_size_min ? parseInt(formData.team_size_min, 10) : undefined,
                    team_size_max: formData.is_team_event && formData.team_size_max ? parseInt(formData.team_size_max, 10) : undefined,
                    team_scoring: formData.is_team_event ? formData.team_scoring : undefined,
                    // Point rewards
                    point_rewards: (formData.point_rewards_first || formData.point_rewards_second ||
                                    formData.point_rewards_third || formData.point_rewards_finisher)
                        ? {
                            first_place: formData.point_rewards_first ? parseInt(formData.point_rewards_first, 10) : undefined,
                            second_place: formData.point_rewards_second ? parseInt(formData.point_rewards_second, 10) : undefined,
                            third_place: formData.point_rewards_third ? parseInt(formData.point_rewards_third, 10) : undefined,
                            finisher: formData.point_rewards_finisher ? parseInt(formData.point_rewards_finisher, 10) : undefined,
                          }
                        : undefined,
                };

                await api.updateEvent(eventId, updateData);
                savedEventId = eventId;
            } else {
                const createData: CreateEventRequest = {
                    title: formData.title,
                    content: formData.content,
                    sport_type_id: formData.sport_type_id!,
                    ranking_mode: formData.ranking_mode,
                    location_name: formData.location_name,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    starts_at: formData.starts_at.toISOString(),
                    ends_at: formData.ends_at.toISOString(),
                    registration_opens_at: formData.registration_opens_at?.toISOString(),
                    registration_closes_at: formData.registration_closes_at?.toISOString(),
                    max_participants: formData.max_participants
                        ? parseInt(formData.max_participants, 10)
                        : undefined,
                    difficulty: formData.difficulty,
                    // Convert from km (form) to meters (API)
                    distance: formData.distance ? parseFloat(formData.distance) * 1000 : undefined,
                    entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : undefined,
                    // GPS Privacy (new in 2026-01)
                    show_start_finish_points: formData.show_start_finish_points,
                    start_finish_note: formData.start_finish_note || undefined,
                    // Activity aggregation
                    allow_multiple_activities: formData.allow_multiple_activities,
                    // Visibility
                    visibility: formData.visibility,
                    // Ranking mode config
                    target_distance: formData.target_distance ? parseFloat(formData.target_distance) * 1000 : undefined,
                    time_limit: formData.time_limit ? parseInt(formData.time_limit, 10) * 60 : undefined,
                    // Team event
                    is_team_event: formData.is_team_event,
                    team_size_min: formData.is_team_event && formData.team_size_min ? parseInt(formData.team_size_min, 10) : undefined,
                    team_size_max: formData.is_team_event && formData.team_size_max ? parseInt(formData.team_size_max, 10) : undefined,
                    team_scoring: formData.is_team_event ? formData.team_scoring : undefined,
                    // Point rewards
                    point_rewards: (formData.point_rewards_first || formData.point_rewards_second ||
                                    formData.point_rewards_third || formData.point_rewards_finisher)
                        ? {
                            first_place: formData.point_rewards_first ? parseInt(formData.point_rewards_first, 10) : undefined,
                            second_place: formData.point_rewards_second ? parseInt(formData.point_rewards_second, 10) : undefined,
                            third_place: formData.point_rewards_third ? parseInt(formData.point_rewards_third, 10) : undefined,
                            finisher: formData.point_rewards_finisher ? parseInt(formData.point_rewards_finisher, 10) : undefined,
                          }
                        : undefined,
                };

                const createdEvent = await api.createEvent(createData);
                savedEventId = createdEvent.id;
            }

            // Upload cover image if it's a local file
            if (coverImage && isLocalImage(coverImage)) {
                try {
                    await api.uploadEventCoverImage(savedEventId, coverImage);
                } catch (uploadError) {
                    logger.error('api', 'Failed to upload cover image', {error: uploadError});
                    // Don't fail the whole operation, just warn
                    Alert.alert(
                        t('common.success'),
                        isEditMode
                            ? t('eventForm.updateSuccess') + '\n' + t('eventForm.coverImageUploadFailed')
                            : t('eventForm.createSuccess') + '\n' + t('eventForm.coverImageUploadFailed')
                    );
                    emitRefresh('events');
                    navigation.goBack();
                    return;
                }
            }

            // Save AI commentary settings (via separate API endpoint) - only if user has AI features
            if (hasAiFeatures) {
                try {
                    await api.updateCommentarySettings(savedEventId, {
                        enabled: commentarySettings.enabled,
                        style: commentarySettings.style,
                        token_limit: commentarySettings.token_limit,
                        interval_minutes: commentarySettings.interval_minutes,
                        auto_publish: commentarySettings.auto_publish,
                        languages: commentarySettings.languages,
                        force_participants: commentarySettings.force_participants,
                        time_windows: commentarySettings.time_windows.length > 0 ? commentarySettings.time_windows : null,
                        days_of_week: commentarySettings.days_of_week.length > 0 ? commentarySettings.days_of_week : null,
                        pause_summary_enabled: commentarySettings.pause_summary_enabled,
                    });
                    logger.debug('api', 'Commentary settings saved', {eventId: savedEventId});
                } catch (commentaryError) {
                    logger.error('api', 'Failed to save commentary settings', {error: commentaryError});
                    // Don't fail the whole operation for commentary settings
                }
            }

            Alert.alert(
                t('common.success'),
                isEditMode ? t('eventForm.updateSuccess') : t('eventForm.createSuccess')
            );
            emitRefresh('events');
            navigation.goBack();
        } catch (error) {
            logger.error('api', 'Failed to save event', {error});
            Alert.alert(
                t('common.error'),
                isEditMode ? t('eventForm.updateFailed') : t('eventForm.createFailed')
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(null);
        }

        if (event.type === 'set' && selectedDate && showDatePicker) {
            const {field, mode} = showDatePicker;

            if (mode === 'date') {
                // For date mode, preserve time and update date
                const currentDate = formData[field] || new Date();
                const newDate = new Date(currentDate);
                newDate.setFullYear(selectedDate.getFullYear());
                newDate.setMonth(selectedDate.getMonth());
                newDate.setDate(selectedDate.getDate());
                updateField(field, newDate);

                // On Android, show time picker after date is selected
                if (Platform.OS === 'android') {
                    setTimeout(() => {
                        setShowDatePicker({field, mode: 'time'});
                    }, 100);
                }
            } else {
                // For time mode, preserve date and update time
                const currentDate = formData[field] || new Date();
                const newDate = new Date(currentDate);
                newDate.setHours(selectedDate.getHours());
                newDate.setMinutes(selectedDate.getMinutes());
                updateField(field, newDate);
            }
        }

        if (Platform.OS === 'ios' && event.type === 'dismissed') {
            setShowDatePicker(null);
        }
    };

    const openDatePicker = (field: DatePickerField) => {
        // Initialize the field with current date if null
        if (formData[field] === null) {
            updateField(field, new Date());
        }
        setShowDatePicker({field, mode: 'date'});
    };

    const formatDateTime = (date: Date | null): string => {
        if (!date) return t('eventForm.selectDate');
        return format(date, 'MMM d, yyyy h:mm a');
    };

    // Check if the selected sport type exists in the loaded sport types
    const sportTypeExists = formData.sport_type_id
        ? sportTypes.some(s => s.id === formData.sport_type_id)
        : true;

    // Debug logging
    logger.debug('general', 'Sport type check', {
        formDataSportTypeId: formData.sport_type_id,
        sportTypesLoading: isSportTypesLoading,
        sportTypesCount: sportTypes.length,
        sportTypeExists,
    });

    // Show loading while fetching event data, sport types are loading, or sport type doesn't exist yet
    if (isFetching || (isEditMode && (isSportTypesLoading || (formData.sport_type_id && !sportTypeExists)))) {
        return (
            <ScreenContainer>
                <ScreenHeader
                    title={isEditMode ? t('eventForm.editTitle') : t('eventForm.createTitle')}
                    showBack
                    onBack={() => navigation.goBack()}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary}/>
                </View>
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScreenHeader
                    title={isEditMode ? t('eventForm.editTitle') : t('eventForm.createTitle')}
                    showBack
                    onBack={() => navigation.goBack()}
                />

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Cover Image */}
                    <ImagePickerButton value={coverImage} onChange={setCoverImage}/>

                    {/* Additional Media */}
                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, {color: colors.textPrimary}]}>
                            {t('eventForm.additionalMedia')}
                        </Text>
                        <MediaPicker
                            media={eventMedia}
                            onChange={setEventMedia}
                            maxItems={10}
                            allowVideo
                        />
                    </View>

                    {/* Title */}
                    <Input
                        label={t('eventForm.title')}
                        placeholder={t('eventForm.titlePlaceholder')}
                        value={formData.title}
                        onChangeText={(text) => updateField('title', text)}
                        error={errors.title}
                    />

                    {/* Description */}
                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, {color: colors.textPrimary}]}>{t('eventForm.description')}</Text>
                        <Input
                            placeholder={t('eventForm.descriptionPlaceholder')}
                            value={formData.content}
                            onChangeText={(text) => updateField('content', text)}
                            multiline
                            numberOfLines={4}
                            style={styles.textArea}
                        />
                    </View>

                    {/* Sport Type */}
                    <SportTypeSelector
                        value={formData.sport_type_id}
                        onChange={(id) => updateField('sport_type_id', id)}
                        error={errors.sport_type_id}
                        disabled={isLimitedEdit}
                    />

                    {/* Visibility */}
                    <OptionSelector
                        value={formData.visibility}
                        onChange={(v) => updateField('visibility', v as EventVisibility)}
                        options={[
                            {value: 'public', label: t('eventForm.visibilityPublic')},
                            {value: 'followers', label: t('eventForm.visibilityFollowers')},
                            {value: 'private', label: t('eventForm.visibilityPrivate')},
                        ]}
                        label={t('eventForm.visibility')}
                        disabled={isLimitedEdit}
                    />

                    {/* Ranking Modes */}
                    <EventRankingModeSelector
                        value={formData.ranking_mode || 'fastest_time'}
                        onChange={(mode) => updateField('ranking_mode', mode)}
                        disabled={isLimitedEdit}
                    />

                    {/* Ranking Config - Target Distance (for fastest_time / first_finish) */}
                    {(formData.ranking_mode === 'fastest_time' || formData.ranking_mode === 'first_finish') && (
                        <Card style={styles.optionalCard}>
                            <Input
                                label={t('eventForm.targetDistance')}
                                placeholder={t('eventForm.targetDistancePlaceholder')}
                                value={formData.target_distance}
                                onChangeText={(v) => updateField('target_distance', v)}
                                keyboardType="decimal-pad"
                                leftIcon="flag-outline"
                                editable={!isLimitedEdit}
                            />
                            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                {t('eventForm.targetDistanceDescription')}
                            </Text>
                        </Card>
                    )}

                    {/* Ranking Config - Time Limit (for most_distance / most_elevation) */}
                    {(formData.ranking_mode === 'most_distance' || formData.ranking_mode === 'most_elevation') && (
                        <Card style={styles.optionalCard}>
                            <Input
                                label={t('eventForm.timeLimit')}
                                placeholder={t('eventForm.timeLimitPlaceholder')}
                                value={formData.time_limit}
                                onChangeText={(v) => updateField('time_limit', v)}
                                keyboardType="number-pad"
                                leftIcon="timer-outline"
                                editable={!isLimitedEdit}
                            />
                            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                {t('eventForm.timeLimitDescription')}
                            </Text>
                        </Card>
                    )}

                    {/* Allow Multiple Activities */}
                    <Card style={styles.optionalCard}>
                        <View style={[styles.gpsPrivacySection, {borderTopWidth: 0, paddingTop: 0}]}>
                            <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>
                                {t('eventForm.allowMultipleActivities')}
                            </Text>
                            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                {t('eventForm.allowMultipleActivitiesDescription')}
                            </Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md}}>
                                <Text style={[styles.checkboxLabel, {color: colors.textPrimary}]}>
                                    {t('eventForm.allowMultipleActivitiesToggle')}
                                </Text>
                                <Switch
                                    value={formData.allow_multiple_activities}
                                    onValueChange={(value) => updateField('allow_multiple_activities', value)}
                                    disabled={isLimitedEdit}
                                    trackColor={{true: colors.primary, false: colors.border}}
                                    thumbColor="#fff"
                                />
                            </View>
                        </View>
                    </Card>

                    {/* Team Event */}
                    <Card style={styles.optionalCard}>
                        <View style={[styles.gpsPrivacySection, {borderTopWidth: 0, paddingTop: 0}]}>
                            <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>
                                {t('eventForm.teamEvent')}
                            </Text>
                            <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                {t('eventForm.teamEventDescription')}
                            </Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md}}>
                                <Text style={[styles.checkboxLabel, {color: colors.textPrimary}]}>
                                    {t('eventForm.enableTeamEvent')}
                                </Text>
                                <Switch
                                    value={formData.is_team_event}
                                    onValueChange={(value) => updateField('is_team_event', value)}
                                    disabled={isLimitedEdit}
                                    trackColor={{true: colors.primary, false: colors.border}}
                                    thumbColor="#fff"
                                />
                            </View>
                            {formData.is_team_event && (
                                <>
                                    <View style={{flexDirection: 'row', gap: spacing.md, marginTop: spacing.md}}>
                                        <View style={{flex: 1}}>
                                            <Input
                                                label={t('eventForm.teamSizeMin')}
                                                placeholder={t('eventForm.teamSizePlaceholder')}
                                                value={formData.team_size_min}
                                                onChangeText={(v) => updateField('team_size_min', v)}
                                                keyboardType="number-pad"
                                                editable={!isLimitedEdit}
                                                error={errors.team_size_min}
                                            />
                                        </View>
                                        <View style={{flex: 1}}>
                                            <Input
                                                label={t('eventForm.teamSizeMax')}
                                                placeholder={t('eventForm.teamSizePlaceholder')}
                                                value={formData.team_size_max}
                                                onChangeText={(v) => updateField('team_size_max', v)}
                                                keyboardType="number-pad"
                                                editable={!isLimitedEdit}
                                                error={errors.team_size_max}
                                            />
                                        </View>
                                    </View>
                                    <OptionSelector
                                        label={t('eventForm.teamScoring')}
                                        value={formData.team_scoring}
                                        onChange={(v) => updateField('team_scoring', v as EventTeamScoring)}
                                        options={[
                                            {value: 'sum', label: t('eventForm.teamScoringSum')},
                                            {value: 'average', label: t('eventForm.teamScoringAverage')},
                                            {value: 'best_n', label: t('eventForm.teamScoringBestN')},
                                        ]}
                                        disabled={isLimitedEdit}
                                    />
                                </>
                            )}
                        </View>
                    </Card>

                    {/* Difficulty */}
                    <DifficultySelector
                        value={formData.difficulty}
                        onChange={(difficulty) => updateField('difficulty', difficulty)}
                        disabled={isLimitedEdit}
                    />

                    {/* Location */}
                    <Input
                        label={t('eventForm.location')}
                        placeholder={t('eventForm.locationPlaceholder')}
                        value={formData.location_name}
                        onChangeText={(text) => updateField('location_name', text)}
                        error={errors.location_name}
                        leftIcon="location-outline"
                        editable={!isLimitedEdit}
                        style={isLimitedEdit ? {opacity: 0.6} : undefined}
                    />

                    {/* Start Date */}
                    <View style={[styles.inputContainer, isLimitedEdit && {opacity: 0.6}]}>
                        <Text style={[styles.label, {color: colors.textPrimary}]}>{t('eventForm.startDate')}</Text>
                        <TouchableOpacity
                            style={[
                                styles.dateButton,
                                {backgroundColor: colors.cardBackground, borderColor: colors.border},
                                errors.starts_at && {borderColor: colors.error},
                            ]}
                            onPress={() => openDatePicker('starts_at')}
                            disabled={isLimitedEdit}
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary}/>
                            <Text
                                style={[styles.dateText, {color: colors.textPrimary}]}>{formatDateTime(formData.starts_at)}</Text>
                        </TouchableOpacity>
                        {errors.starts_at &&
                            <Text style={[styles.errorText, {color: colors.error}]}>{errors.starts_at}</Text>}
                    </View>

                    {/* End Date */}
                    <View style={[styles.inputContainer, isLimitedEdit && {opacity: 0.6}]}>
                        <Text style={[styles.label, {color: colors.textPrimary}]}>{t('eventForm.endDate')}</Text>
                        <TouchableOpacity
                            style={[
                                styles.dateButton,
                                {backgroundColor: colors.cardBackground, borderColor: colors.border},
                                errors.ends_at && {borderColor: colors.error},
                            ]}
                            onPress={() => openDatePicker('ends_at')}
                            disabled={isLimitedEdit}
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary}/>
                            <Text
                                style={[styles.dateText, {color: colors.textPrimary}]}>{formatDateTime(formData.ends_at)}</Text>
                        </TouchableOpacity>
                        {errors.ends_at &&
                            <Text style={[styles.errorText, {color: colors.error}]}>{errors.ends_at}</Text>}
                    </View>

                    {/* Optional Fields Toggle */}
                    <TouchableOpacity
                        style={styles.optionalToggle}
                        onPress={() => setShowOptionalFields(!showOptionalFields)}
                    >
                        <Text
                            style={[styles.optionalToggleText, {color: colors.textPrimary}]}>{t('eventForm.eventDetails')}</Text>
                        <Ionicons
                            name={showOptionalFields ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>

                    {showOptionalFields && (
                        <View style={isLimitedEdit ? {opacity: 0.6} : undefined}>
                            <Card style={styles.optionalCard}>
                                {/* Registration Opens */}
                                <View style={styles.inputContainer}>
                                    <Text
                                        style={[styles.label, {color: colors.textPrimary}]}>{t('eventForm.registrationOpens')}</Text>
                                    <TouchableOpacity
                                        style={[styles.dateButton, {
                                            backgroundColor: colors.cardBackground,
                                            borderColor: colors.border
                                        }]}
                                        onPress={() => openDatePicker('registration_opens_at')}
                                        disabled={isLimitedEdit}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary}/>
                                        <Text style={[styles.dateText, {color: colors.textPrimary}]}>
                                            {formatDateTime(formData.registration_opens_at)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Registration Closes */}
                                <View style={styles.inputContainer}>
                                    <Text
                                        style={[styles.label, {color: colors.textPrimary}]}>{t('eventForm.registrationCloses')}</Text>
                                    <TouchableOpacity
                                        style={[styles.dateButton, {
                                            backgroundColor: colors.cardBackground,
                                            borderColor: colors.border
                                        }]}
                                        onPress={() => openDatePicker('registration_closes_at')}
                                        disabled={isLimitedEdit}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={colors.textSecondary}/>
                                        <Text style={[styles.dateText, {color: colors.textPrimary}]}>
                                            {formatDateTime(formData.registration_closes_at)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Max Participants */}
                                <Input
                                    label={t('eventForm.maxParticipants')}
                                    placeholder={t('eventForm.maxParticipantsPlaceholder')}
                                    value={formData.max_participants}
                                    onChangeText={(text) => updateField('max_participants', text)}
                                    keyboardType="number-pad"
                                    leftIcon="people-outline"
                                    editable={!isLimitedEdit}
                                />

                                {/* Distance */}
                                <Input
                                    label={t('eventForm.distance')}
                                    placeholder={t('eventForm.distancePlaceholder')}
                                    value={formData.distance}
                                    onChangeText={(text) => updateField('distance', text)}
                                    keyboardType="decimal-pad"
                                    leftIcon="map-outline"
                                    editable={!isLimitedEdit}
                                />

                                {/* Entry Fee */}
                                <Input
                                    label={t('eventForm.entryFee')}
                                    placeholder={t('eventForm.entryFeePlaceholder')}
                                    value={formData.entry_fee}
                                    onChangeText={(text) => updateField('entry_fee', text)}
                                    keyboardType="decimal-pad"
                                    leftIcon="cash-outline"
                                    editable={!isLimitedEdit}
                                />

                                {/* GPS Privacy Section */}
                                <View style={[styles.gpsPrivacySection, {borderTopColor: colors.border}]}>
                                    <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>
                                        {t('eventForm.gpsPrivacy')}
                                    </Text>
                                    <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                        {t('eventForm.gpsPrivacyDescription')}
                                    </Text>

                                    <View style={[styles.checkboxRow, {marginTop: spacing.md}]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.checkbox,
                                                formData.show_start_finish_points && styles.checkboxChecked,
                                                {
                                                    borderColor: colors.border,
                                                    backgroundColor: formData.show_start_finish_points ? colors.primary : 'transparent'
                                                }
                                            ]}
                                            onPress={() => updateField('show_start_finish_points', !formData.show_start_finish_points)}
                                            disabled={isLimitedEdit}
                                            activeOpacity={0.7}
                                        >
                                            {formData.show_start_finish_points && (
                                                <Ionicons name="checkmark" size={18} color="#fff"/>
                                            )}
                                        </TouchableOpacity>
                                        <View style={styles.checkboxTextContainer}>
                                            <Text style={[styles.checkboxLabel, {color: colors.textPrimary}]}>
                                                {t('eventForm.showStartFinishMarkers')}
                                            </Text>
                                            <Text style={[styles.checkboxDescription, {color: colors.textSecondary}]}>
                                                {t('eventForm.showStartFinishMarkersDescription')}
                                            </Text>
                                        </View>
                                    </View>

                                    {formData.show_start_finish_points && (
                                        <Input
                                            label={t('eventForm.startFinishNote')}
                                            placeholder={t('eventForm.startFinishNotePlaceholder')}
                                            value={formData.start_finish_note}
                                            onChangeText={(text) => updateField('start_finish_note', text)}
                                            multiline
                                            numberOfLines={2}
                                            leftIcon="information-circle-outline"
                                            editable={!isLimitedEdit}
                                            style={{marginTop: spacing.md}}
                                        />
                                    )}
                                </View>

                                {/* Point Rewards Section */}
                                <View style={[styles.gpsPrivacySection, {borderTopColor: colors.border}]}>
                                    <Text style={[styles.sectionTitle, {color: colors.textPrimary}]}>
                                        {t('eventForm.pointRewards')}
                                    </Text>
                                    <Text style={[styles.sectionDescription, {color: colors.textSecondary}]}>
                                        {t('eventForm.pointRewardsDescription')}
                                    </Text>
                                    <View style={{marginTop: spacing.md}}>
                                        <Input
                                            label={t('eventForm.pointRewardsFirstPlace')}
                                            placeholder={t('eventForm.pointRewardsPlaceholder')}
                                            value={formData.point_rewards_first}
                                            onChangeText={(v) => updateField('point_rewards_first', v)}
                                            keyboardType="number-pad"
                                            leftIcon="trophy-outline"
                                            editable={!isLimitedEdit}
                                        />
                                        <Input
                                            label={t('eventForm.pointRewardsSecondPlace')}
                                            placeholder={t('eventForm.pointRewardsPlaceholder')}
                                            value={formData.point_rewards_second}
                                            onChangeText={(v) => updateField('point_rewards_second', v)}
                                            keyboardType="number-pad"
                                            leftIcon="medal-outline"
                                            editable={!isLimitedEdit}
                                        />
                                        <Input
                                            label={t('eventForm.pointRewardsThirdPlace')}
                                            placeholder={t('eventForm.pointRewardsPlaceholder')}
                                            value={formData.point_rewards_third}
                                            onChangeText={(v) => updateField('point_rewards_third', v)}
                                            keyboardType="number-pad"
                                            leftIcon="ribbon-outline"
                                            editable={!isLimitedEdit}
                                        />
                                        <Input
                                            label={t('eventForm.pointRewardsFinisher')}
                                            placeholder={t('eventForm.pointRewardsPlaceholder')}
                                            value={formData.point_rewards_finisher}
                                            onChangeText={(v) => updateField('point_rewards_finisher', v)}
                                            keyboardType="number-pad"
                                            leftIcon="checkmark-circle-outline"
                                            editable={!isLimitedEdit}
                                        />
                                    </View>
                                </View>

                            </Card>
                        </View>
                    )}

                    {/* AI Commentary Settings - only shown if user has AI features enabled */}
                    {hasAiFeatures && (
                        <CommentarySettingsSection
                            value={commentarySettings}
                            onChange={setCommentarySettings}
                            disabled={isLoading || isCommentaryReadOnly}
                        />
                    )}

                    {/* Submit Button */}
                    <Button
                        title={isEditMode ? t('eventForm.updateButton') : t('eventForm.createButton')}
                        onPress={handleSubmit}
                        loading={isLoading}
                        style={styles.submitButton}
                    />
                </ScrollView>

                {/* Date Picker Modal */}
                {showDatePicker && (
                    <DateTimePicker
                        value={formData[showDatePicker.field] || new Date()}
                        mode={Platform.OS === 'ios' ? 'datetime' : showDatePicker.mode}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                )}
            </KeyboardAvoidingView>
        </ScreenContainer>
    );
}


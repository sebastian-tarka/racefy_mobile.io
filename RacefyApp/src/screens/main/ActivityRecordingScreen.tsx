import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Card, Button, Badge } from '../../components';
import { usePermissions } from '../../hooks/usePermissions';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

// Mock data for milestones based on previous activities
const mockMilestones = [
  { distance: 1000, label: '1 km', bestTime: 298, avgTime: 325 },
  { distance: 2000, label: '2 km', bestTime: 612, avgTime: 658 },
  { distance: 3000, label: '3 km', bestTime: 935, avgTime: 1005 },
  { distance: 5000, label: '5 km', bestTime: 1580, avgTime: 1720 },
  { distance: 10000, label: '10 km', bestTime: 3250, avgTime: 3540 },
];

const sportTypes = [
  { id: 1, name: 'Running', icon: 'walk-outline' as const },
  { id: 2, name: 'Cycling', icon: 'bicycle-outline' as const },
  { id: 3, name: 'Swimming', icon: 'water-outline' as const },
  { id: 4, name: 'Gym', icon: 'barbell-outline' as const },
];

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'finished';

interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
}

export function ActivityRecordingScreen() {
  const { permissions, requestActivityTrackingPermissions } = usePermissions();
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [selectedSport, setSelectedSport] = useState(sportTypes[0]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [passedMilestones, setPassedMilestones] = useState<number[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [locationPoints, setLocationPoints] = useState<LocationPoint[]>([]);
  const [useRealGPS, setUseRealGPS] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationRef = useRef<LocationPoint | null>(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Start GPS tracking
  const startLocationTracking = async () => {
    try {
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          const newPoint: LocationPoint = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
          };

          setCurrentSpeed(location.coords.speed);
          setLocationPoints((prev) => [...prev, newPoint]);

          // Calculate distance from last point
          if (lastLocationRef.current) {
            const dist = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              newPoint.latitude,
              newPoint.longitude
            );
            // Only add if movement is reasonable (filter GPS noise)
            if (dist > 2 && dist < 100) {
              setDistance((prev) => prev + dist);
            }
          }
          lastLocationRef.current = newPoint;
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('GPS Error', 'Could not start location tracking. Using simulated data.');
      setUseRealGPS(false);
    }
  };

  // Stop GPS tracking
  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  };

  // Simulate distance tracking when GPS not available
  useEffect(() => {
    if (status === 'recording' && !useRealGPS) {
      const distanceInterval = setInterval(() => {
        setDistance((prev) => {
          const speedFactor = selectedSport.name === 'Cycling' ? 4 : 1;
          const newDistance = prev + (10 + Math.random() * 5) * speedFactor;
          return Math.round(newDistance);
        });
      }, 1000);

      return () => clearInterval(distanceInterval);
    }
  }, [status, selectedSport, useRealGPS]);

  // Check milestones
  useEffect(() => {
    mockMilestones.forEach((milestone) => {
      if (
        distance >= milestone.distance &&
        !passedMilestones.includes(milestone.distance)
      ) {
        setPassedMilestones((prev) => [...prev, milestone.distance]);
        Vibration.vibrate(200);
      }
    });
  }, [distance, passedMilestones]);

  // Timer
  useEffect(() => {
    if (status === 'recording') {
      startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        setDuration(elapsed);
      }, 100);
    } else if (status === 'paused') {
      pausedDurationRef.current = duration;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else if (status === 'idle') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  const formatPace = (seconds: number, meters: number): string => {
    if (meters === 0) return '--:--';
    const paceSeconds = (seconds / meters) * 1000;
    const mins = Math.floor(paceSeconds / 60);
    const secs = Math.floor(paceSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')} /km`;
  };

  const handleStart = async () => {
    console.log('Start button pressed');

    // Try to get permissions, but don't block if it fails
    try {
      const hasPermission = await requestActivityTrackingPermissions();
      console.log('Permission result:', hasPermission);

      if (hasPermission) {
        // Start with real GPS
        setUseRealGPS(true);
        startLocationTracking();
        setStatus('recording');
        console.log('Started with real GPS');
      } else {
        // Start with simulated data
        Alert.alert(
          'Using Simulated Data',
          'Location permission not granted. Activity will use simulated distance data.',
          [{ text: 'OK' }]
        );
        setUseRealGPS(false);
        setStatus('recording');
        console.log('Started with simulated data');
      }
    } catch (error) {
      console.log('Permission error, using simulated:', error);
      // Fallback to simulated on any error
      setUseRealGPS(false);
      setStatus('recording');
    }
  };

  const handlePause = () => {
    stopLocationTracking();
    setStatus('paused');
  };

  const handleResume = async () => {
    if (useRealGPS) {
      await startLocationTracking();
    }
    setStatus('recording');
  };

  const handleStop = () => {
    stopLocationTracking();
    setStatus('finished');
  };

  const handleReset = () => {
    stopLocationTracking();
    setStatus('idle');
    setDuration(0);
    setDistance(0);
    setPassedMilestones([]);
    setLocationPoints([]);
    setCurrentSpeed(null);
    pausedDurationRef.current = 0;
    lastLocationRef.current = null;
    setUseRealGPS(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking();
    };
  }, []);

  const handleSave = () => {
    // TODO: Save activity to API
    console.log('Saving activity:', {
      sport: selectedSport,
      duration,
      distance,
    });
    handleReset();
  };

  const getMilestoneStatus = (milestone: typeof mockMilestones[0]) => {
    if (!passedMilestones.includes(milestone.distance)) {
      return { status: 'upcoming', color: colors.textMuted };
    }

    const milestoneIndex = mockMilestones.findIndex(
      (m) => m.distance === milestone.distance
    );
    const prevMilestone = milestoneIndex > 0 ? mockMilestones[milestoneIndex - 1] : null;

    // Calculate time at this milestone (simplified)
    const timeAtMilestone = Math.floor(
      (duration * milestone.distance) / Math.max(distance, 1)
    );

    if (timeAtMilestone < milestone.bestTime) {
      return { status: 'record', color: colors.primary, label: 'NEW RECORD!' };
    } else if (timeAtMilestone < milestone.avgTime) {
      return { status: 'good', color: colors.success, label: 'Above Average' };
    }
    return { status: 'normal', color: colors.textSecondary, label: 'Completed' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Record Activity</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sport Type Selector */}
        {status === 'idle' && (
          <Card style={styles.sportSelector}>
            <Text style={styles.sectionTitle}>Select Sport</Text>
            <View style={styles.sportGrid}>
              {sportTypes.map((sport) => (
                <TouchableOpacity
                  key={sport.id}
                  style={[
                    styles.sportButton,
                    selectedSport.id === sport.id && styles.sportButtonActive,
                  ]}
                  onPress={() => setSelectedSport(sport)}
                >
                  <Ionicons
                    name={sport.icon}
                    size={28}
                    color={
                      selectedSport.id === sport.id
                        ? colors.white
                        : colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.sportLabel,
                      selectedSport.id === sport.id && styles.sportLabelActive,
                    ]}
                  >
                    {sport.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Current Activity Display */}
        {status !== 'idle' && (
          <View style={styles.currentSport}>
            <Ionicons
              name={selectedSport.icon}
              size={24}
              color={colors.primary}
            />
            <Text style={styles.currentSportText}>{selectedSport.name}</Text>
            <Badge
              label={status === 'recording' ? 'Recording' : status === 'paused' ? 'Paused' : 'Finished'}
              variant={status === 'recording' ? 'ongoing' : status === 'paused' ? 'upcoming' : 'completed'}
            />
          </View>
        )}

        {/* Timer Display */}
        <Card style={styles.timerCard}>
          <Text style={styles.timerLabel}>Duration</Text>
          <Text style={styles.timer}>{formatTime(duration)}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              <Text style={styles.statValue}>{formatDistance(distance)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
              <Text style={styles.statValue}>{formatPace(duration, distance)}</Text>
              <Text style={styles.statLabel}>Pace</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={20} color={colors.primary} />
              <Text style={styles.statValue}>
                {Math.floor(duration * 0.15)}
              </Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>
        </Card>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {status === 'idle' && (
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Ionicons name="play" size={40} color={colors.white} />
              <Text style={styles.startButtonText}>START</Text>
            </TouchableOpacity>
          )}

          {status === 'recording' && (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePause}
              >
                <Ionicons name="pause" size={32} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={32} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {status === 'paused' && (
            <View style={styles.recordingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleResume}
              >
                <Ionicons name="play" size={32} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStop}
              >
                <Ionicons name="stop" size={32} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {status === 'finished' && (
            <View style={styles.finishedControls}>
              <Button
                title="Save Activity"
                onPress={handleSave}
                variant="primary"
                style={styles.saveButton}
              />
              <Button
                title="Discard"
                onPress={handleReset}
                variant="ghost"
              />
            </View>
          )}
        </View>

        {/* Milestones */}
        <Card style={styles.milestonesCard}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <Text style={styles.sectionSubtitle}>
            Compare with your previous {selectedSport.name.toLowerCase()} activities
          </Text>

          {mockMilestones.map((milestone) => {
            const milestoneStatus = getMilestoneStatus(milestone);
            const isPassed = passedMilestones.includes(milestone.distance);

            return (
              <View
                key={milestone.distance}
                style={[
                  styles.milestoneRow,
                  isPassed && styles.milestoneRowPassed,
                ]}
              >
                <View style={styles.milestoneLeft}>
                  <View
                    style={[
                      styles.milestoneIcon,
                      isPassed && styles.milestoneIconPassed,
                    ]}
                  >
                    <Ionicons
                      name={isPassed ? 'checkmark' : 'flag-outline'}
                      size={16}
                      color={isPassed ? colors.white : colors.textMuted}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.milestoneLabel,
                        isPassed && styles.milestoneLabelPassed,
                      ]}
                    >
                      {milestone.label}
                    </Text>
                    {isPassed && milestoneStatus.label && (
                      <Text
                        style={[
                          styles.milestoneStatus,
                          { color: milestoneStatus.color },
                        ]}
                      >
                        {milestoneStatus.label}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.milestoneRight}>
                  <Text style={styles.milestoneTime}>
                    Best: {formatTime(milestone.bestTime)}
                  </Text>
                  <Text style={styles.milestoneTimeAvg}>
                    Avg: {formatTime(milestone.avgTime)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Previous Activities Summary */}
        <Card style={styles.previousCard}>
          <Text style={styles.sectionTitle}>Your {selectedSport.name} Stats</Text>
          <View style={styles.prevStatsGrid}>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>23</Text>
              <Text style={styles.prevStatLabel}>Activities</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>156 km</Text>
              <Text style={styles.prevStatLabel}>Total Distance</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>12:45h</Text>
              <Text style={styles.prevStatLabel}>Total Time</Text>
            </View>
            <View style={styles.prevStatItem}>
              <Text style={styles.prevStatValue}>5:28</Text>
              <Text style={styles.prevStatLabel}>Avg Pace /km</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
  },
  sportSelector: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sportButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sportButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  sportLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  sportLabelActive: {
    color: colors.white,
  },
  currentSport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentSportText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timerCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  timerLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  startButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: colors.error,
  },
  finishedControls: {
    width: '100%',
    gap: spacing.md,
  },
  saveButton: {
    width: '100%',
  },
  milestonesCard: {
    marginBottom: spacing.md,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  milestoneRowPassed: {
    backgroundColor: colors.successLight,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIconPassed: {
    backgroundColor: colors.primary,
  },
  milestoneLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  milestoneLabelPassed: {
    color: colors.textPrimary,
  },
  milestoneStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  milestoneRight: {
    alignItems: 'flex-end',
  },
  milestoneTime: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  milestoneTimeAvg: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  previousCard: {
    marginBottom: spacing.xl,
  },
  prevStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prevStatItem: {
    width: '50%',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  prevStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  prevStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

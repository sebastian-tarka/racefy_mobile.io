import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, borderRadius } from '../../theme';
import { AutoDisplayImage } from '../../components/AutoDisplayImage';
import { AutoPlayVideo } from '../../components/AutoPlayVideo';
import { ImageGallery } from '../../components/ImageGallery';
import { FeedCard } from '../../components/FeedCard';
import type { Post } from '../../types/api';

export function ComponentShowcaseScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [selectedTab, setSelectedTab] = useState<'images' | 'videos' | 'feed'>('images');
  const [galleryVisible, setGalleryVisible] = useState(false);

  // Sample data
  const sampleImages = [
    'https://picsum.photos/400/600?random=1',
    'https://picsum.photos/400/400?random=2',
    'https://picsum.photos/600/400?random=3',
  ];

  const samplePost: Post = {
    id: 1,
    type: 'activity',
    title: 'Morning Run',
    content: 'Beautiful morning run through the park. The weather was perfect and I managed to hit a new personal best!',
    user: {
      id: 1,
      username: 'johndoe',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: null,
      created_at: new Date().toISOString(),
    },
    activity: {
      id: 1,
      title: 'Morning Run',
      description: 'Beautiful morning run',
      sport_type: { id: 1, name: 'Running' },
      distance: 5000,
      duration: 1800,
      elevation_gain: 50,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    photos: [
      { id: 1, url: 'https://picsum.photos/400/600?random=10' },
      { id: 2, url: 'https://picsum.photos/400/400?random=11' },
    ],
    videos: [],
    media: [],
    likes_count: 24,
    comments_count: 5,
    is_liked: false,
    visibility: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const renderImages = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        AutoDisplayImage Component
      </Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Smart image display with adaptive height, center-weighted cropping, and spring animations.
      </Text>

      {/* Portrait Image */}
      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            Portrait Image (aspect > 1.3)
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>New</Text>
          </View>
        </View>
        <AutoDisplayImage
          imageUrl="https://picsum.photos/400/600?random=1"
          onExpand={() => setGalleryVisible(true)}
          previewHeight={300}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Shows from 25% down (catches faces)
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Gradient fade when cropped
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Chevron to expand in-feed
          </Text>
        </View>
      </View>

      {/* Landscape Image */}
      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            Landscape Image (aspect < 0.8)
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>New</Text>
          </View>
        </View>
        <AutoDisplayImage
          imageUrl="https://picsum.photos/600/400?random=3"
          onExpand={() => setGalleryVisible(true)}
          previewHeight={300}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Center-weighted crop
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Shows subject in middle
          </Text>
        </View>
      </View>

      {/* Square Image */}
      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            Square Image (0.8 - 1.3)
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>New</Text>
          </View>
        </View>
        <AutoDisplayImage
          imageUrl="https://picsum.photos/400/400?random=2"
          onExpand={() => setGalleryVisible(true)}
          previewHeight={300}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Shows full image (no crop needed)
          </Text>
        </View>
      </View>

      {/* Image Gallery Modal */}
      <ImageGallery
        images={sampleImages}
        initialIndex={0}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
      />
    </View>
  );

  const renderVideos = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        AutoPlayVideo Component
      </Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Auto-playing video with visibility detection, adaptive height, and controls.
      </Text>

      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            16:9 Video (Landscape)
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>Updated</Text>
          </View>
        </View>
        <AutoPlayVideo
          videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          aspectRatio={16 / 9}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Auto-play at 50% visibility
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Muted by default
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Tap to pause, icon shows 800ms
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Full width, adaptive height
          </Text>
        </View>
      </View>

      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            9:16 Video (Portrait)
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>Updated</Text>
          </View>
        </View>
        <AutoPlayVideo
          videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          aspectRatio={9 / 16}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Vertical video support
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Height adapts to aspect ratio
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFeed = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        FeedCard Component
      </Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Complete feed card with all improvements applied.
      </Text>

      <View style={styles.demoCard}>
        <View style={[styles.demoHeader, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.demoLabel, { color: colors.textPrimary }]}>
            Activity Post
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Updated</Text>
          </View>
        </View>
        <FeedCard
          post={samplePost}
          isOwner={false}
          onUserPress={() => console.log('User pressed')}
          onLike={() => console.log('Like pressed')}
          onComment={() => console.log('Comment pressed')}
          onActivityPress={() => console.log('Activity pressed')}
        />
        <View style={[styles.featureList, { backgroundColor: colors.background }]}>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Type-specific border (emerald for activities)
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ All images open gallery
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Smooth spring animations
          </Text>
          <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
            ✓ Center-weighted cropping
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Component Showcase
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            UX Improvements Preview
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => console.log('Theme toggle')}
          style={styles.themeButton}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'images' && styles.tabActive]}
          onPress={() => setSelectedTab('images')}
        >
          <Ionicons
            name="image"
            size={20}
            color={selectedTab === 'images' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'images' ? colors.primary : colors.textSecondary },
            ]}
          >
            Images
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'videos' && styles.tabActive]}
          onPress={() => setSelectedTab('videos')}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={selectedTab === 'videos' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'videos' ? colors.primary : colors.textSecondary },
            ]}
          >
            Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'feed' && styles.tabActive]}
          onPress={() => setSelectedTab('feed')}
        >
          <Ionicons
            name="newspaper"
            size={20}
            color={selectedTab === 'feed' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === 'feed' ? colors.primary : colors.textSecondary },
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedTab === 'images' && renderImages()}
        {selectedTab === 'videos' && renderVideos()}
        {selectedTab === 'feed' && renderFeed()}

        {/* Footer Info */}
        <View style={[styles.footer, { backgroundColor: colors.infoLight, borderColor: colors.info + '30' }]}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[styles.footerText, { color: colors.textPrimary }]}>
            This is a dev-only screen. All components use real code from the app.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  themeButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  demoCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  demoLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  featureList: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  featureItem: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    margin: spacing.md,
    marginTop: spacing.xl,
  },
  footerText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  spacer: {
    height: spacing.xl,
  },
});

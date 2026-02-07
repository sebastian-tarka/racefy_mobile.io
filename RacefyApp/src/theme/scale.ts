import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375; // iPhone SE/6/7/8 baseline

const scaleRatio = SCREEN_WIDTH / BASE_WIDTH;

/**
 * Moderated scale — adjusts value proportionally to screen width
 * but only applies half the difference to prevent extreme scaling.
 * factor: 0 = no scaling, 1 = full linear scaling, 0.5 = moderate (default)
 */
export function ms(size: number, factor: number = 0.5): number {
  return Math.round(size + (size * scaleRatio - size) * factor);
}

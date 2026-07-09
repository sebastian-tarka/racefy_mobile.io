/**
 * Android battery-optimization helpers for reliable background GPS recording.
 *
 * A location foreground service exempts the app from most stock Doze
 * restrictions, but OEM "battery managers" (Samsung, Xiaomi, Huawei, …) kill
 * even foreground services. There is no API fix — the fix is user action:
 * exclude Racefy from battery optimization and, on aggressive OEMs, tweak the
 * vendor-specific settings (see dontkillmyapp.com). This module detects the
 * state, fires the exemption intent (allowed by Play policy for fitness
 * trackers) and deep-links to the vendor battery screens.
 */

import { Platform } from 'react-native';
import * as Battery from 'expo-battery';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { logger } from './logger';

const isAndroid = Platform.OS === 'android';

/** True when Android battery optimization is active for this app (bad for GPS). */
export async function isBatteryOptimized(): Promise<boolean> {
  if (!isAndroid) return false;
  try {
    return await Battery.isBatteryOptimizationEnabledAsync();
  } catch (error) {
    logger.warn('gps', 'Failed to read battery optimization state', { error });
    return false;
  }
}

/** True when the system-wide power-save mode is on (warn-only signal). */
export async function isPowerSaveMode(): Promise<boolean> {
  try {
    return await Battery.isLowPowerModeEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * Ask the system to exempt Racefy from battery optimization. Shows the system
 * "Allow app to run in background?" dialog; falls back to the optimization
 * list screen when the direct request intent is unavailable.
 */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (!isAndroid) return;

  const packageName = Application.applicationId ?? 'com.racefy.app';

  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      { data: `package:${packageName}` },
    );
  } catch (error) {
    logger.warn('gps', 'Direct battery exemption intent failed, opening list screen', { error });
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
    } catch (fallbackError) {
      logger.error('gps', 'Failed to open battery optimization settings', {
        error: fallbackError,
      });
    }
  }
}

export type OemKey = 'samsung' | 'xiaomi' | 'huawei' | 'oneplus' | 'oppo' | 'vivo';

/** Vendor whose battery manager is known to kill foreground services, or null. */
export function getOemKey(): OemKey | null {
  if (!isAndroid) return null;

  const manufacturer = (Device.manufacturer ?? '').toLowerCase();

  if (manufacturer.includes('samsung')) return 'samsung';
  if (
    manufacturer.includes('xiaomi') ||
    manufacturer.includes('redmi') ||
    manufacturer.includes('poco')
  ) {
    return 'xiaomi';
  }
  if (manufacturer.includes('huawei') || manufacturer.includes('honor')) return 'huawei';
  if (manufacturer.includes('oneplus')) return 'oneplus';
  if (manufacturer.includes('oppo') || manufacturer.includes('realme')) return 'oppo';
  if (manufacturer.includes('vivo')) return 'vivo';

  return null;
}

/** Vendor battery-manager screens, per dontkillmyapp.com. Tried in order. */
const OEM_INTENTS: Record<OemKey, { packageName: string; className: string }[]> = {
  samsung: [
    {
      packageName: 'com.samsung.android.lool',
      className: 'com.samsung.android.sm.battery.ui.BatteryActivity',
    },
    {
      packageName: 'com.samsung.android.lool',
      className: 'com.samsung.android.sm.ui.battery.BatteryActivity',
    },
  ],
  xiaomi: [
    {
      packageName: 'com.miui.securitycenter',
      className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
    },
    { packageName: 'com.miui.securitycenter', className: 'com.miui.powercenter.PowerSettings' },
  ],
  huawei: [
    {
      packageName: 'com.huawei.systemmanager',
      className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity',
    },
    {
      packageName: 'com.huawei.systemmanager',
      className: 'com.huawei.systemmanager.optimize.process.ProtectActivity',
    },
  ],
  oneplus: [
    {
      packageName: 'com.oneplus.security',
      className: 'com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity',
    },
  ],
  oppo: [
    {
      packageName: 'com.coloros.safecenter',
      className: 'com.coloros.safecenter.permission.startup.StartupAppListActivity',
    },
    {
      packageName: 'com.oppo.safe',
      className: 'com.oppo.safe.permission.startup.StartupAppListActivity',
    },
  ],
  vivo: [
    {
      packageName: 'com.vivo.permissionmanager',
      className: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity',
    },
    {
      packageName: 'com.iqoo.secure',
      className: 'com.iqoo.secure.ui.phoneoptimize.BgStartUpManager',
    },
  ],
};

/**
 * Open the vendor's battery/autostart manager. Returns false when none of the
 * known screens exist on this device (caller shows manual instructions).
 */
export async function openOemBatterySettings(oem: OemKey): Promise<boolean> {
  for (const intent of OEM_INTENTS[oem]) {
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
        packageName: intent.packageName,
        className: intent.className,
      });
      return true;
    } catch {
      // Try the next known screen for this vendor
    }
  }

  logger.warn('gps', 'No known OEM battery screen could be opened', { oem });
  return false;
}

import { Linking, NativeModules, Platform } from 'react-native';

const { WallpaperModule } = NativeModules;

function getExtensionFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.webp')) return 'webp';
  if (lower.includes('.png')) return 'png';
  return 'jpg';
}

/**
 * Cài đặt ảnh trực tiếp làm Wallpaper màn hình hệ thống Android
 */
export async function applyNativeWallpaper(downloadUrl: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (!WallpaperModule || !WallpaperModule.setWallpaper) {
    throw new Error('WallpaperModule chưa được đăng ký trong Android Native!');
  }

  return await WallpaperModule.setWallpaper(downloadUrl);
}

/**
 * Tải ảnh gốc và lưu vào Album Thư viện (Pictures/WallpaperHD) trên thiết bị
 */
export async function saveWallpaperToGallery(
  downloadUrl: string,
  wallpaperId: string
): Promise<string> {
  const ext = getExtensionFromUrl(downloadUrl);
  const filename = `wallpaper_${wallpaperId}_${Date.now()}.${ext}`;

  if (Platform.OS === 'android' && WallpaperModule?.saveToGallery) {
    return await WallpaperModule.saveToGallery(downloadUrl, filename);
  } else {
    return downloadUrl;
  }
}

/**
 * Mở trực tiếp ứng dụng Thư viện hình ảnh (Photos / Gallery App) của hệ điều hành
 */
export async function openSystemGallery(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (WallpaperModule?.openGallery) {
      try {
        await WallpaperModule.openGallery();
        return true;
      } catch (err) {
        console.warn('Native openGallery error, trying app scheme Linking:', err);
      }
    }

    // Fallback thử mở ứng dụng Google Photos hoặc Gallery bằng deep link app scheme
    const androidSchemes = ['googlephotos://', 'photos://'];
    for (const scheme of androidSchemes) {
      try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
          await Linking.openURL(scheme);
          return true;
        }
      } catch {}
    }
  }

  // Fallback chung cho iOS hoặc thiết bị khác: Mở App Photos
  const schemes = ['photos-redirect://', 'photos://'];
  for (const scheme of schemes) {
    try {
      const canOpen = await Linking.canOpenURL(scheme);
      if (canOpen) {
        await Linking.openURL(scheme);
        return true;
      }
    } catch {}
  }

  return false;
}

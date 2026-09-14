import { Linking, Permission, PermissionsAndroid, Platform } from 'react-native';

export interface PermissionStatus {
  hasStoragePermission: boolean;
  isAndroid13Plus: boolean;
}

/**
 * Kiểm tra trạng thái cấp quyền đọc/ghi bộ nhớ & thư viện ảnh
 */
export async function checkStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    if (typeof androidVersion === 'number' && androidVersion >= 33) {
      // Android 13+ (API 33-35)
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      );
    } else {
      // Android 12 trở xuống
      const readCheck = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
      );
      if (typeof androidVersion === 'number' && androidVersion <= 28) {
        const writeCheck = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return readCheck && writeCheck;
      }
      return readCheck;
    }
  } catch (error) {
    console.warn('[PermissionService] Lỗi khi kiểm tra quyền:', error);
    return false;
  }
}

/**
 * Yêu cầu người dùng cấp quyền truy cập thư viện ảnh & bộ nhớ
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const androidVersion = Platform.Version;

    if (typeof androidVersion === 'number' && androidVersion >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        {
          title: 'Quyền truy cập Thư viện ảnh',
          message:
            'Wallpaper HD cần quyền đọc thư viện ảnh để tải hình nền và đồng bộ album trên thiết bị.',
          buttonPositive: 'Cho phép',
          buttonNegative: 'Từ chối',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const permissionsToRequest: Permission[] = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ];
      if (typeof androidVersion === 'number' && androidVersion <= 28) {
        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
      }

      const results = await PermissionsAndroid.requestMultiple(
        permissionsToRequest
      );

      const readGranted =
        results[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const writeGranted =
        typeof androidVersion === 'number' && androidVersion <= 28
          ? results[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
            PermissionsAndroid.RESULTS.GRANTED
          : true;

      return readGranted && writeGranted;
    }
  } catch (error) {
    console.warn('[PermissionService] Lỗi khi yêu cầu cấp quyền:', error);
    return false;
  }
}

/**
 * Mở trực tiếp màn hình Cài đặt ứng dụng của hệ điều hành
 */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn('[PermissionService] Không thể mở cài đặt hệ thống:', error);
  }
}

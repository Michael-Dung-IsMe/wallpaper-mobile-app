import ReactNativeBlobUtil from 'react-native-blob-util';
import { Wallpaper } from '../api/types';

export interface UserCollection {
  id: string;
  name: string;
  createdAt: string;
  wallpapers: Wallpaper[];
}

const COLLECTIONS_FILE = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/user_collections.json`;

/**
 * Đọc danh sách bộ sưu tập thực tế từ bộ nhớ thiết bị
 */
export async function getCollections(): Promise<UserCollection[]> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(COLLECTIONS_FILE);
    if (!exists) {
      return [];
    }

    const content = await ReactNativeBlobUtil.fs.readFile(COLLECTIONS_FILE, 'utf8');
    if (!content || !content.trim()) {
      return [];
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[collectionStorage] Lỗi khi đọc bộ sưu tập:', error);
    return [];
  }
}

/**
 * Lưu danh sách bộ sưu tập xuống tệp JSON
 */
async function persistCollections(collections: UserCollection[]): Promise<void> {
  try {
    await ReactNativeBlobUtil.fs.writeFile(
      COLLECTIONS_FILE,
      JSON.stringify(collections, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('[collectionStorage] Lỗi khi lưu bộ sưu tập:', error);
    throw error;
  }
}

/**
 * Tạo mới một bộ sưu tập do người dùng đặt tên
 */
export async function createCollection(name: string): Promise<UserCollection> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Tên bộ sưu tập không được để trống.');
  }

  const collections = await getCollections();
  const newCol: UserCollection = {
    id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    wallpapers: [],
  };

  const updated = [newCol, ...collections];
  await persistCollections(updated);
  return newCol;
}

/**
 * Xóa một bộ sưu tập theo ID
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  const collections = await getCollections();
  const filtered = collections.filter(c => c.id !== collectionId);
  await persistCollections(filtered);
}

/**
 * Thêm một hình nền vào bộ sưu tập (tránh trùng lặp)
 */
export async function addWallpaperToCollection(
  collectionId: string,
  wallpaper: Wallpaper
): Promise<{ success: boolean; isDuplicate: boolean; collectionName: string }> {
  const collections = await getCollections();
  const targetCol = collections.find(c => c.id === collectionId);

  if (!targetCol) {
    throw new Error('Không tìm thấy bộ sưu tập tương ứng.');
  }

  const alreadyExists = targetCol.wallpapers.some(w => w.id === wallpaper.id);
  if (alreadyExists) {
    return {
      success: true,
      isDuplicate: true,
      collectionName: targetCol.name,
    };
  }

  targetCol.wallpapers = [wallpaper, ...targetCol.wallpapers];
  await persistCollections(collections);

  return {
    success: true,
    isDuplicate: false,
    collectionName: targetCol.name,
  };
}

/**
 * Xóa một hình nền khỏi bộ sưu tập
 */
export async function removeWallpaperFromCollection(
  collectionId: string,
  wallpaperId: string
): Promise<void> {
  const collections = await getCollections();
  const targetCol = collections.find(c => c.id === collectionId);
  if (!targetCol) return;

  targetCol.wallpapers = targetCol.wallpapers.filter(w => w.id !== wallpaperId);
  await persistCollections(collections);
}

/**
 * Lấy chi tiết bộ sưu tập kèm danh sách hình nền
 */
export async function getCollectionDetail(
  collectionId: string
): Promise<UserCollection | null> {
  const collections = await getCollections();
  return collections.find(c => c.id === collectionId) || null;
}

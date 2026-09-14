import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppIcon from '../AppIcon';
import Theme from '../../theme';
import {
  createCollection,
  getCollections,
  UserCollection,
} from '../../services/collectionStorage';

interface CollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (collectionId: string, collectionName: string) => void;
  onCreated?: () => void;
  currentWallpaperTitle?: string;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  visible,
  onClose,
  onSave,
  onCreated,
  currentWallpaperTitle: _currentWallpaperTitle = 'Hình nền',
}) => {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Tải danh sách bộ sưu tập thực tế từ local storage khi mở modal
  useEffect(() => {
    if (visible) {
      getCollections().then(data => {
        setCollections(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        } else {
          setSelectedId(null);
          setIsCreating(true); // Tự động mở ô tạo mới nếu chưa có album nào
        }
      });
    }
  }, [visible]);

  const handleCreateCollection = async () => {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    try {
      const created = await createCollection(trimmed);
      setCollections(prev => [created, ...prev]);
      setSelectedId(created.id);
      setNewCollectionName('');
      setIsCreating(false);
      if (onCreated) {
        onCreated();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo bộ sưu tập.');
    }
  };

  const handleSave = () => {
    if (!selectedId) {
      Alert.alert('Thông báo', 'Vui lòng tạo hoặc chọn một bộ sưu tập.');
      return;
    }

    const selected = collections.find(c => c.id === selectedId);
    const colName = selected ? selected.name : 'Bộ sưu tập';

    if (onSave) {
      onSave(selectedId, colName);
    }
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Lưu vào Bộ sưu tập</Text>
              <Text style={styles.subtitle}>Chọn album lưu trữ hình ảnh</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.newButton}
                onPress={() => setIsCreating(prev => !prev)}
                activeOpacity={0.7}
              >
                <AppIcon
                  name="add"
                  size={16}
                  color={Theme.colors.primary}
                  style={styles.newIcon}
                />
                <Text style={styles.newButtonText}>Tạo mới</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="close" size={20} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Create Collection Input */}
          {isCreating && (
            <View style={styles.createInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Tên bộ sưu tập mới..."
                placeholderTextColor={Theme.colors.textMuted}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                onSubmitEditing={handleCreateCollection}
              />
              <TouchableOpacity
                style={styles.addConfirmButton}
                onPress={handleCreateCollection}
                activeOpacity={0.8}
              >
                <Text style={styles.addConfirmText}>Thêm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* List of Collections */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {collections.length === 0 && !isCreating ? (
              <View style={styles.emptyPrompt}>
                <AppIcon name="bookmarks" size={28} color={Theme.colors.textMuted} />
                <Text style={styles.emptyPromptText}>
                  Bạn chưa có bộ sưu tập nào. Hãy bấm "Tạo mới" để bắt đầu!
                </Text>
              </View>
            ) : (
              collections.map(item => {
                const isSelected = selectedId === item.id;
                const count = item.wallpapers ? item.wallpapers.length : 0;
                const previewImg =
                  item.wallpapers && item.wallpapers.length > 0
                    ? item.wallpapers[0].thumbnailUrl
                    : null;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.collectionRow,
                      isSelected && styles.collectionRowSelected,
                    ]}
                    onPress={() => setSelectedId(item.id)}
                    activeOpacity={0.7}
                  >
                    {previewImg ? (
                      <Image
                        source={{ uri: previewImg }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={styles.emptyThumbnail}>
                        <AppIcon
                          name="folder"
                          size={18}
                          color={Theme.colors.primary}
                        />
                      </View>
                    )}

                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.collectionName,
                          isSelected && styles.collectionNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.collectionCount}>
                        {count} hình nền
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !selectedId && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedId}
              activeOpacity={0.85}
            >
              <Text style={styles.saveButtonText}>Lưu hình nền</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeMd,
    fontWeight: Theme.typography.fontWeightBold,
  },
  subtitle: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    marginRight: Theme.spacing.sm,
  },
  newIcon: {
    marginRight: 2,
  },
  newButtonText: {
    color: Theme.colors.primary,
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  closeButton: {
    padding: 4,
  },
  createInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 40,
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
  },
  addConfirmButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  addConfirmText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeXs,
    fontWeight: Theme.typography.fontWeightBold,
  },
  listContainer: {
    maxHeight: 280,
  },
  listContent: {
    paddingVertical: Theme.spacing.xs,
  },
  emptyPrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyPromptText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeSm,
    textAlign: 'center',
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  collectionRowSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.sm,
    marginRight: Theme.spacing.md,
  },
  emptyThumbnail: {
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  textContainer: {
    flex: 1,
  },
  collectionName: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightMedium,
  },
  collectionNameSelected: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeightSemiBold,
  },
  collectionCount: {
    color: Theme.colors.textMuted,
    fontSize: Theme.typography.fontSizeXs,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Theme.colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.primary,
  },
  footer: {
    marginTop: Theme.spacing.md,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    height: 48,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#0F172A',
    fontSize: Theme.typography.fontSizeSm,
    fontWeight: Theme.typography.fontWeightBold,
  },
});

export default CollectionModal;

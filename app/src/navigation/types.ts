import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Wallpaper } from '../api/types';

export type RootStackParamList = {
  Home: undefined;
  Category: { categorySlug: string; categoryName: string };
  Search: { initialQuery?: string };
  Detail: { wallpaperId: string; wallpaperItem?: Wallpaper };
  Collections: undefined;
  CollectionDetail: { collectionId: string; collectionName: string };
  Settings: undefined;
};

export type CollectionsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Collections'
>;

export type CollectionDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CollectionDetail'
>;

export type CollectionDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'CollectionDetail'
>;

export type SettingsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Settings'
>;

export type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

export type CategoryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Category'
>;

export type CategoryScreenRouteProp = RouteProp<
  RootStackParamList,
  'Category'
>;

export type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

export type SearchScreenRouteProp = RouteProp<
  RootStackParamList,
  'Search'
>;

export type DetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Detail'
>;

export type DetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'Detail'
>;

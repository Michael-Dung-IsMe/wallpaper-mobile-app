declare module 'react-native-vector-icons/*' {
  import { Component } from 'react';
  import { TextStyle, StyleProp, ViewProps } from 'react-native';

  export interface IconProps extends ViewProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { TextStyle, StyleProp, ViewProps } from 'react-native';

  export interface IconProps extends ViewProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  export default class Ionicons extends Component<IconProps> {}
}

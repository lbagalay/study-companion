import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabBarIconProps = {
  color: ComponentProps<typeof Ionicons>['color'];
  focused: boolean;
  name: IoniconName;
  size: number;
};

export function TabBarIcon({ color, focused, name, size }: TabBarIconProps) {
  return <Ionicons color={color} name={focused ? name : (`${name}-outline` as IoniconName)} size={size} />;
}

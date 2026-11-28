import { themed, type IconProps } from '@tamagui/helpers-icon';
import { memo, type JSX } from 'react';
import { Path, Svg, type SvgProps } from 'react-native-svg';

export const MessageCircle: (props: IconProps) => JSX.Element = themed(
  memo(function MessageCircle(props: IconProps) {
    const {
      color = 'black',
      size = 24,
      ...otherProps
    } = props as SvgProps & {
      color?: string;
      size?: number;
    };
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...otherProps}
      >
        <Path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" stroke={color} />
      </Svg>
    );
  }),
);

import { themed, type IconProps } from '@tamagui/helpers-icon';
import { memo, type JSX } from 'react';
import { Path, Svg, type SvgProps } from 'react-native-svg';

export const ChevronLeft: (props: IconProps) => JSX.Element = themed(
  memo(function ChevronLeft(props: IconProps) {
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
        <Path d="m15 18-6-6 6-6" stroke={color} />
      </Svg>
    );
  }),
);

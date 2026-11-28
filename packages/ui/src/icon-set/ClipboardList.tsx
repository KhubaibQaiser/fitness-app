import { themed, type IconProps } from '@tamagui/helpers-icon';
import { memo, type JSX } from 'react';
import { Path, Svg, type SvgProps } from 'react-native-svg';

export const ClipboardList: (props: IconProps) => JSX.Element = themed(
  memo(function ClipboardList(props: IconProps) {
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
        <Path
          d="M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
          stroke={color}
        />
        <Path
          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
          stroke={color}
        />
        <Path d="M12 11h4" stroke={color} />
        <Path d="M12 16h4" stroke={color} />
        <Path d="M8 11h.01" stroke={color} />
        <Path d="M8 16h.01" stroke={color} />
      </Svg>
    );
  }),
);

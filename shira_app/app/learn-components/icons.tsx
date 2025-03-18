import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
    fill?: string;
    width?: number;
    height?: number;
}

export function PlayIcon({ fill = '#FFFFFF', width = 24, height = 24 }: IconProps) {
    return (
        <Svg width={width} height={height} viewBox="0 0 24 24">
            <Path
                d="M8 5v14l11-7z"
                fill={fill}
            />
        </Svg>
    );
}

export function PauseIcon({ fill = '#FFFFFF', width = 24, height = 24 }: IconProps) {
    return (
        <Svg width={width} height={height} viewBox="0 0 24 24">
            <Path
                d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"
                fill={fill}
            />
        </Svg>
    );
}

export function TranslateIcon({ fill = '#FFFFFF', width = 24, height = 24 }: IconProps) {
    return (
        <Svg width={width} height={height} viewBox="0 0 24 24">
            <Path
                d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"
                fill={fill}
            />
        </Svg>
    );
}

const icons = {
    PlayIcon,
    PauseIcon,
    TranslateIcon,
};

export default icons; 
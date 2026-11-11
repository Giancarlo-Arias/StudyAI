import Svg, { Path } from "react-native-svg";

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function IconBase({
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function Sparkles(props: IconProps) {
  return (
    <IconBase {...props}>
      <Path d="m10 2 1.9 6.1L18 10l-6.1 1.9L10 18l-1.9-6.1L2 10l6.1-1.9L10 2Z" />
      <Path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" />
    </IconBase>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <Path d="M7 17 17 7M8 7h9v9" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <Path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function FileText(props: IconProps) {
  return (
    <IconBase {...props}>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <Path d="M14 2v6h6M8 13h8M8 17h8" />
    </IconBase>
  );
}

export function TrendingUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <Path d="m3 17 6-6 4 4 8-8M15 7h6v6" />
    </IconBase>
  );
}
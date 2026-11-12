import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

export function StudyHeroArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 220" fill="none">
      <Defs>
        <LinearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#333158" />
          <Stop offset="100%" stopColor="#17192F" />
        </LinearGradient>

        <LinearGradient id="orbGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#E7E0FF" />
          <Stop offset="100%" stopColor="#F4F1FF" />
        </LinearGradient>
      </Defs>

      <Circle cx="180" cy="110" r="101" fill="url(#orbGradient)" />

      <Circle cx="180" cy="110" r="82" stroke="#D1C9F8" strokeWidth="1" />

      <Circle cx="180" cy="110" r="65" stroke="#D8D2F7" strokeDasharray="4 7" />

      <Path d="M30 146C94 45 263 32 333 132" stroke="#C1B7F5" strokeWidth="1.5" strokeDasharray="4 8" />

      <G transform="rotate(-9 170 111)">
        <Rect x="102" y="30" width="145" height="161" rx="18" fill="#C3B9E9" opacity="0.45" />

        <Rect x="94" y="23" width="145" height="161" rx="18" fill="#FFFFFF" stroke="#E5E0F5" strokeWidth="1.5" />

        <Rect x="111" y="42" width="38" height="38" rx="11" fill="#EEE9FF" />

        <Path d="M122 52H138M122 59H138M122 66H134" stroke="#7664DE" strokeWidth="2.5" strokeLinecap="round" />

        <Rect x="159" y="45" width="59" height="7" rx="3.5" fill="#28243F" />

        <Rect x="159" y="59" width="43" height="5" rx="2.5" fill="#C0BDD2" />

        <Rect x="111" y="99" width="106" height="6" rx="3" fill="#D8D6E7" />

        <Rect x="111" y="112" width="83" height="6" rx="3" fill="#E5E3EE" />

        <Rect x="111" y="125" width="96" height="6" rx="3" fill="#E5E3EE" />

        <Rect x="111" y="148" width="68" height="19" rx="9.5" fill="#EDEAFF" />

        <Circle cx="122" cy="157.5" r="4" fill="#7664DE" />

        <Rect x="132" y="155" width="32" height="5" rx="2.5" fill="#A49BE3" />
      </G>

      <G transform="rotate(7 261 139)">
        <Rect x="205" y="87" width="121" height="99" rx="17" fill="url(#cardGradient)" />

        <Rect x="219" y="102" width="53" height="6" rx="3" fill="#BFB4FF" />

        <Rect x="219" y="119" width="90" height="7" rx="3.5" fill="#FFFFFF" />

        <Rect x="219" y="132" width="65" height="6" rx="3" fill="#9594B4" />

        <Rect x="219" y="150" width="93" height="23" rx="8" fill="#6557C1" />

        <Circle cx="232" cy="161.5" r="6" fill="#CFC8FF" />

        <Path
          d="M229 161L231.5 163.5L235.5 159"
          stroke="#5D50B7"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Rect x="245" y="159" width="52" height="5" rx="2.5" fill="#E1DBFF" />
      </G>

      <Circle cx="289" cy="48" r="26" fill="#7564E5" />

      <Circle cx="289" cy="48" r="23" stroke="#A99BFF" strokeWidth="0.8" opacity="0.65" />

      <G transform="translate(277 36)" stroke="#FFFFFF" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 4.8C9.2 2.2 4.2 4.6 5.2 8.4C2.2 9.6 2.5 13.5 5 14.6C3.9 18.7 8.2 21.2 12 19.2V4.8Z" />

        <Path d="M12 4.8C14.8 2.2 19.8 4.6 18.8 8.4C21.8 9.6 21.5 13.5 19 14.6C20.1 18.7 15.8 21.2 12 19.2" />

        <Path d="M8 10L10.5 12.5V16" />

        <Path d="M16 8V11.5L19 13.5" />

        <Path d="M12 15H16" />

        <Circle cx="8" cy="10" r="1.25" fill="#FFFFFF" stroke="none" />

        <Circle cx="10.5" cy="16" r="1.25" fill="#FFFFFF" stroke="none" />

        <Circle cx="16" cy="8" r="1.25" fill="#FFFFFF" stroke="none" />

        <Circle cx="16" cy="15" r="1.25" fill="#FFFFFF" stroke="none" />

        <Circle cx="19" cy="13.5" r="1.25" fill="#FFFFFF" stroke="none" />
      </G>

      <Circle cx="65" cy="91" r="20" fill="#FFFFFF" stroke="#E0DCF3" strokeWidth="1.5" />

      <Path d="M58 92L63 97L73 85" stroke="#7463DF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      <Circle cx="78" cy="187" r="5" fill="#C2B7F9" />

      <Circle cx="323" cy="191" r="3" fill="#A99DF3" />
    </Svg>
  );
}

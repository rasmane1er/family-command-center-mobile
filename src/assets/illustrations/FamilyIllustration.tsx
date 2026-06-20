import React from 'react';
import Svg, { Circle, Rect, Path, Ellipse, G, Defs, RadialGradient, Stop, LinearGradient } from 'react-native-svg';

interface Props {
  width?: number;
  height?: number;
}

export function FamilyIllustration({ width = 320, height = 280 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 320 280">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1E4A8A" stopOpacity="0.3" />
          <Stop offset="1" stopColor="#F5A623" stopOpacity="0.1" />
        </LinearGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F5A623" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#F5A623" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Background glow */}
      <Ellipse cx="160" cy="200" rx="140" ry="60" fill="url(#glow)" />

      {/* Ground */}
      <Ellipse cx="160" cy="230" rx="130" ry="18" fill="#E8EEF9" />

      {/* House */}
      <Rect x="95" y="130" width="130" height="100" rx="4" fill="#EBF2FF" />
      <Path d="M85 135 L160 75 L235 135 Z" fill="#0F2952" />
      <Rect x="125" y="175" width="30" height="55" rx="4" fill="#F5A623" />
      <Rect x="115" y="148" width="25" height="20" rx="3" fill="#B8D4FF" />
      <Rect x="180" y="148" width="25" height="20" rx="3" fill="#B8D4FF" />
      {/* Door knob */}
      <Circle cx="151" cy="207" r="2.5" fill="#0F2952" />
      {/* Chimney */}
      <Rect x="195" y="90" width="18" height="35" rx="2" fill="#1E4A8A" />

      {/* DAD - figure left */}
      <Circle cx="80" cy="158" r="14" fill="#FDBCB4" />
      <Rect x="68" y="170" width="24" height="40" rx="8" fill="#0F2952" />
      <Rect x="60" y="173" width="12" height="28" rx="6" fill="#0F2952" />
      <Rect x="80" y="173" width="12" height="28" rx="6" fill="#0F2952" />
      <Rect x="68" y="206" width="10" height="22" rx="5" fill="#1a1a2e" />
      <Rect x="80" y="206" width="10" height="22" rx="5" fill="#1a1a2e" />
      {/* Dad hair */}
      <Path d="M66 153 Q80 143 94 153 Q90 145 80 142 Q70 145 66 153Z" fill="#2c1810" />

      {/* MOM - figure right */}
      <Circle cx="240" cy="158" r="14" fill="#F5C5A3" />
      <Path d="M222 172 Q240 165 258 172 L262 228 L218 228 Z" fill="#F5A623" />
      <Rect x="204" y="175" width="12" height="26" rx="6" fill="#F5A623" />
      <Rect x="264" y="175" width="12" height="26" rx="6" fill="#F5A623" />
      <Rect x="224" y="206" width="10" height="22" rx="5" fill="#1a1a2e" />
      <Rect x="238" y="206" width="10" height="22" rx="5" fill="#1a1a2e" />
      {/* Mom hair */}
      <Path d="M226 148 Q240 138 254 148 Q254 135 240 132 Q226 135 226 148Z" fill="#8B4513" />
      <Path d="M225 155 Q222 168 226 175" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" fill="none" />
      <Path d="M255 155 Q258 168 254 175" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* BOY - figure center-left */}
      <Circle cx="145" cy="188" r="11" fill="#FDBCB4" />
      <Rect x="135" y="198" width="20" height="30" rx="6" fill="#4ECDC4" />
      <Rect x="128" y="201" width="10" height="22" rx="5" fill="#4ECDC4" />
      <Rect x="146" y="201" width="10" height="22" rx="5" fill="#4ECDC4" />
      <Rect x="136" y="224" width="8" height="18" rx="4" fill="#2c3e50" />
      <Rect x="147" y="224" width="8" height="18" rx="4" fill="#2c3e50" />
      {/* Boy hair */}
      <Path d="M134 182 Q145 175 156 182 Q152 176 145 173 Q138 176 134 182Z" fill="#2c1810" />

      {/* GIRL - figure center-right */}
      <Circle cx="185" cy="192" r="10" fill="#F5C5A3" />
      <Path d="M172 204 Q185 196 198 204 L200 240 L170 240 Z" fill="#DDA0DD" />
      <Rect x="163" y="206" width="10" height="20" rx="5" fill="#DDA0DD" />
      <Rect x="197" y="206" width="10" height="20" rx="5" fill="#DDA0DD" />
      {/* Girl pigtails */}
      <Path d="M175 188 Q172 178 168 183" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M195 188 Q198 178 202 183" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <Path d="M174 183 Q185 175 196 183 Q193 177 185 174 Q177 177 174 183Z" fill="#8B4513" />

      {/* Stars/sparkles */}
      <Circle cx="45" cy="100" r="3" fill="#F5A623" opacity="0.8" />
      <Circle cx="52" cy="85" r="2" fill="#F5A623" opacity="0.6" />
      <Circle cx="35" cy="115" r="2" fill="#F5A623" opacity="0.5" />
      <Circle cx="270" cy="95" r="3" fill="#00D4AA" opacity="0.8" />
      <Circle cx="282" cy="80" r="2" fill="#00D4AA" opacity="0.6" />
      <Circle cx="260" cy="110" r="2" fill="#00D4AA" opacity="0.5" />

      {/* Heart */}
      <Path d="M155 60 C155 57 158 55 160 57 C162 55 165 57 165 60 C165 63 160 67 160 67 C160 67 155 63 155 60Z" fill="#E74C3C" opacity="0.9" />
    </Svg>
  );
}

export function DashboardHeroIllustration({ width = 280, height = 180 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 180">
      <Defs>
        <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.05" />
        </LinearGradient>
      </Defs>

      {/* Floating cards */}
      <Rect x="10" y="20" width="80" height="50" rx="10" fill="url(#cardGrad)" />
      <Rect x="12" y="32" width="20" height="4" rx="2" fill="white" opacity="0.7" />
      <Rect x="12" y="40" width="40" height="8" rx="4" fill="white" opacity="0.9" />
      <Rect x="12" y="52" width="30" height="4" rx="2" fill="white" opacity="0.5" />

      <Rect x="100" y="10" width="80" height="50" rx="10" fill="url(#cardGrad)" />
      <Circle cx="116" cy="30" r="8" fill="white" opacity="0.3" />
      <Rect x="128" y="26" width="35" height="4" rx="2" fill="white" opacity="0.8" />
      <Rect x="128" y="34" width="25" height="4" rx="2" fill="white" opacity="0.5" />
      <Rect x="100" y="48" width="80" height="6" rx="3" fill="white" opacity="0.15" />

      <Rect x="195" y="20" width="75" height="50" rx="10" fill="url(#cardGrad)" />
      {/* mini chart bars */}
      <Rect x="205" y="52" width="8" height="10" rx="2" fill="white" opacity="0.5" />
      <Rect x="216" y="44" width="8" height="18" rx="2" fill="white" opacity="0.7" />
      <Rect x="227" y="38" width="8" height="24" rx="2" fill="white" opacity="0.9" />
      <Rect x="238" y="46" width="8" height="16" rx="2" fill="white" opacity="0.6" />
      <Rect x="249" y="41" width="8" height="21" rx="2" fill="white" opacity="0.8" />

      {/* Health ring */}
      <Circle cx="140" cy="120" r="50" fill="none" stroke="white" strokeWidth="2" opacity="0.1" />
      <Circle cx="140" cy="120" r="50" fill="none" stroke="white" strokeWidth="6" strokeDasharray="220 314" opacity="0.5" strokeLinecap="round" transform="rotate(-90 140 120)" />
      <Rect x="120" y="112" width="40" height="20" rx="4" fill="white" opacity="0.2" />

      {/* Connecting dots */}
      <Circle cx="50" cy="95" r="4" fill="white" opacity="0.4" />
      <Circle cx="140" cy="80" r="4" fill="white" opacity="0.4" />
      <Circle cx="230" cy="95" r="4" fill="white" opacity="0.4" />
      <Path d="M50 95 Q95 80 140 80 Q185 80 230 95" stroke="white" strokeWidth="1" opacity="0.2" fill="none" strokeDasharray="4 4" />
    </Svg>
  );
}

export function AIIllustration({ width = 200, height = 200 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#00D4AA" stopOpacity="0.5" />
          <Stop offset="1" stopColor="#00D4AA" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="100" cy="100" r="90" fill="url(#aiGlow)" />
      {/* Brain/circuit head */}
      <Circle cx="100" cy="85" r="40" fill="#0F2952" />
      <Circle cx="100" cy="85" r="36" fill="#132338" />
      {/* Circuit lines */}
      <Path d="M72 80 L82 80 L87 72 L92 88 L97 76 L100 80 L128 80" stroke="#00D4AA" strokeWidth="1.5" fill="none" opacity="0.8" />
      <Path d="M72 90 L80 90 L85 96 L95 84 L100 90 L128 90" stroke="#F5A623" strokeWidth="1.5" fill="none" opacity="0.8" />
      <Circle cx="72" cy="80" r="3" fill="#00D4AA" />
      <Circle cx="128" cy="80" r="3" fill="#00D4AA" />
      <Circle cx="72" cy="90" r="3" fill="#F5A623" />
      <Circle cx="128" cy="90" r="3" fill="#F5A623" />
      {/* Eyes */}
      <Circle cx="88" cy="78" r="5" fill="#00D4AA" />
      <Circle cx="112" cy="78" r="5" fill="#00D4AA" />
      <Circle cx="88" cy="78" r="2" fill="#fff" />
      <Circle cx="112" cy="78" r="2" fill="#fff" />
      {/* Smile */}
      <Path d="M88 96 Q100 104 112 96" stroke="#00D4AA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <Rect x="75" y="125" width="50" height="45" rx="10" fill="#0F2952" />
      <Rect x="65" y="128" width="12" height="35" rx="6" fill="#0F2952" />
      <Rect x="123" y="128" width="12" height="35" rx="6" fill="#0F2952" />
      {/* Chest screen */}
      <Rect x="83" y="133" width="34" height="22" rx="4" fill="#132338" />
      <Rect x="86" y="137" width="28" height="3" rx="1.5" fill="#00D4AA" opacity="0.6" />
      <Rect x="86" y="143" width="20" height="3" rx="1.5" fill="#F5A623" opacity="0.6" />
      <Rect x="86" y="149" width="24" height="3" rx="1.5" fill="#00D4AA" opacity="0.4" />
      {/* Floating particles */}
      <Circle cx="35" cy="60" r="4" fill="#F5A623" opacity="0.7" />
      <Circle cx="165" cy="55" r="4" fill="#00D4AA" opacity="0.7" />
      <Circle cx="30" cy="130" r="3" fill="#00D4AA" opacity="0.5" />
      <Circle cx="170" cy="140" r="3" fill="#F5A623" opacity="0.5" />
      <Circle cx="155" cy="45" r="2" fill="#F5A623" opacity="0.4" />
      <Circle cx="45" cy="150" r="2" fill="#00D4AA" opacity="0.4" />
    </Svg>
  );
}

export function FinanceIllustration({ width = 240, height = 200 }: Props) {
  return (
    <Svg width={width} height={height} viewBox="0 0 240 200">
      {/* Coin stack */}
      <Ellipse cx="70" cy="165" rx="30" ry="8" fill="#B8860B" />
      <Rect x="40" y="135" width="60" height="30" rx="2" fill="#DAA520" />
      <Ellipse cx="70" cy="135" rx="30" ry="8" fill="#FFD700" />
      <Rect x="40" y="112" width="60" height="25" rx="2" fill="#DAA520" />
      <Ellipse cx="70" cy="112" rx="30" ry="8" fill="#FFD700" />
      <Rect x="40" y="92" width="60" height="22" rx="2" fill="#DAA520" />
      <Ellipse cx="70" cy="92" rx="30" ry="8" fill="#FFD700" />
      {/* Dollar sign */}
      <Path d="M67 92 L73 92 M70 85 L70 99" stroke="#8B6914" strokeWidth="3" strokeLinecap="round" />

      {/* Chart/graph */}
      <Rect x="115" y="60" width="110" height="120" rx="12" fill="#F4F6FB" />
      <Rect x="115" y="60" width="110" height="32" rx="12" fill="#0F2952" />
      <Rect x="115" y="76" width="110" height="16" fill="#0F2952" />
      <Rect x="127" y="72" width="50" height="10" rx="4" fill="white" opacity="0.2" />
      {/* Chart bars */}
      <Rect x="128" y="142" width="14" height="28" rx="4" fill="#4ECDC4" opacity="0.8" />
      <Rect x="147" y="128" width="14" height="42" rx="4" fill="#27AE60" opacity="0.8" />
      <Rect x="166" y="135" width="14" height="35" rx="4" fill="#4ECDC4" opacity="0.8" />
      <Rect x="185" y="118" width="14" height="52" rx="4" fill="#27AE60" opacity="0.8" />
      <Rect x="204" y="125" width="14" height="45" rx="4" fill="#F5A623" opacity="0.8" />
      {/* Trend line */}
      <Path d="M135 165 L154 148 L173 156 L192 138 L211 145" stroke="#E74C3C" strokeWidth="2" fill="none" strokeDasharray="0 0" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

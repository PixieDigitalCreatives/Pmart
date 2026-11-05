import React from 'react';
import {
  GiCabbage,
  GiBroccoli,
  GiMilkCarton,
  GiSlicedBread,
  GiBanana,
  GiGrapes,
  GiTomato,
  GiOrange,
  GiEggClutch
} from 'react-icons/gi';

// Illustration only: a drawn basket carrying the PMart logo, filled with icon-drawn groceries. It is not a product
// photo (the storefront shows only admin-verified product photos) and is hidden from assistive technology.
const PRODUCE = [
  { Icon: GiSlicedBread, className: 'art-bread' },
  { Icon: GiMilkCarton, className: 'art-milk' },
  { Icon: GiEggClutch, className: 'art-eggs' },
  { Icon: GiCabbage, className: 'art-cabbage' },
  { Icon: GiBroccoli, className: 'art-broccoli' },
  { Icon: GiGrapes, className: 'art-grapes' },
  { Icon: GiBanana, className: 'art-banana' },
  { Icon: GiTomato, className: 'art-tomato-a' },
  { Icon: GiTomato, className: 'art-tomato-b' },
  { Icon: GiOrange, className: 'art-orange' }
];

const Leaf = ({ className }) => (
  <svg className={`art-leaf ${className}`} viewBox="0 0 40 24" aria-hidden="true">
    <path d="M2 12C10 1 28 -1 38 10C29 22 11 24 2 12Z" fill="currentColor" />
    <path d="M4 12C14 11 24 10 36 10" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" fill="none" />
  </svg>
);

export const HeroBasketArt = () => (
  <div className="hero-basket-art" aria-hidden="true">
    <Leaf className="leaf-1" />
    <Leaf className="leaf-2" />
    <Leaf className="leaf-3" />
    <Leaf className="leaf-4" />

    <div className="art-produce">
      {PRODUCE.map(({ Icon, className }) => (
        <Icon key={className} className={`art-item ${className}`} />
      ))}
    </div>

    <svg className="art-basket" viewBox="0 0 360 190" role="presentation">
      <defs>
        <linearGradient id="pmBasketBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF2A33" />
          <stop offset="1" stopColor="#C2070F" />
        </linearGradient>
        <linearGradient id="pmBasketRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF3B44" />
          <stop offset="1" stopColor="#D90913" />
        </linearGradient>
        <linearGradient id="pmBasketSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <pattern id="pmBasketGrid" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="12" height="12" rx="3" fill="#8F040A" fillOpacity="0.45" />
        </pattern>
        <clipPath id="pmBasketClip">
          <path d="M22 26H338L310 176Q307 186 296 186H64Q53 186 50 176Z" />
        </clipPath>
      </defs>
      <ellipse cx="180" cy="184" rx="150" ry="7" fill="#7A0A10" fillOpacity="0.16" />
      <path d="M22 26H338L310 176Q307 186 296 186H64Q53 186 50 176Z" fill="url(#pmBasketBody)" />
      <rect x="22" y="26" width="316" height="160" fill="url(#pmBasketGrid)" clipPath="url(#pmBasketClip)" />
      <path d="M22 26H338L310 176Q307 186 296 186H64Q53 186 50 176Z" fill="url(#pmBasketSheen)" />
      <rect x="6" y="6" width="348" height="28" rx="12" fill="url(#pmBasketRim)" />
      <rect x="40" y="14" width="44" height="10" rx="5" fill="#8F040A" fillOpacity="0.55" />
      <rect x="276" y="14" width="44" height="10" rx="5" fill="#8F040A" fillOpacity="0.55" />
      <rect x="128" y="62" width="104" height="92" rx="16" fill="#FFFFFF" />
      <image href="/Pmart.png" x="136" y="66" width="88" height="84" preserveAspectRatio="xMidYMid meet" />
    </svg>
  </div>
);

import React from 'react';
import {
  GiCarrot,
  GiShinyApple,
  GiMilkCarton,
  GiEggClutch,
  GiIceCreamCone,
  GiPeanut,
  GiWheat,
  GiChipsBag,
  GiCoffeeCup,
  GiSoap,
  GiSlicedBread,
  GiCheeseWedge
} from 'react-icons/gi';
import { TbBasket } from 'react-icons/tb';

// Shown when a category has no image: an icon picked from the category's name, in the brand-tinted tile.
const RULES = [
  [/ice ?cream|frozen|dessert/, GiIceCreamCone, '#EC407A'],
  [/dry ?fruit|nut|seed/, GiPeanut, '#A1724E'],
  [/egg/, GiEggClutch, '#C8A27A'],
  [/cheese|paneer|dairy product/, GiCheeseWedge, '#F2B705'],
  [/dairy|milk/, GiMilkCarton, '#5C8DD6'],
  [/veg/, GiCarrot, '#F57C00'],
  [/fruit/, GiShinyApple, '#E53935'],
  [/bakery|bread/, GiSlicedBread, '#C98A45'],
  [/snack|namkeen|chip|biscuit/, GiChipsBag, '#F2A900'],
  [/beverage|drink|tea|coffee|juice/, GiCoffeeCup, '#6D4C41'],
  [/house|clean|care|detergent/, GiSoap, '#1E9E8F'],
  [/grocery|staple|atta|rice|dal|flour/, GiWheat, '#D49A1A']
];

export const CategoryIcon = ({ name = '', size = 64 }) => {
  const key = name.toLowerCase();
  const [, Icon, color] = RULES.find(([re]) => re.test(key)) || [null, TbBasket, '#F20D18'];
  return <Icon size={size} color={color} aria-hidden="true" />;
};

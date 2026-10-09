import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import type { ThemeColor } from '@/constants/theme';

/** App icon names -> SF Symbol (iOS) / Material Symbol (Android, web). */
const ICONS = {
  home: ['house', 'home'],
  orders: ['bag', 'receipt_long'],
  wallet: ['creditcard', 'account_balance_wallet'],
  account: ['person.crop.circle', 'person'],
  search: ['magnifyingglass', 'search'],
  pin: ['mappin.and.ellipse', 'location_on'],
  locate: ['location', 'my_location'],
  add: ['plus', 'add'],
  remove: ['minus', 'remove'],
  close: ['xmark', 'close'],
  check: ['checkmark.circle.fill', 'check_circle'],
  shield: ['lock.shield', 'verified_user'],
  lock: ['lock.fill', 'lock'],
  copy: ['doc.on.doc', 'content_copy'],
  star: ['star.fill', 'star'],
  back: ['chevron.left', 'arrow_back'],
  chevron: ['chevron.right', 'chevron_right'],
  rider: ['bicycle', 'two_wheeler'],
  clock: ['clock', 'schedule'],
  kitchen: ['storefront', 'storefront'],
  cart: ['bag.fill', 'shopping_bag'],
  menu: ['fork.knife', 'restaurant_menu'],
  earnings: ['banknote', 'payments'],
  share: ['square.and.arrow.up', 'share'],
  edit: ['pencil', 'edit'],
  trash: ['trash', 'delete'],
  camera: ['camera', 'photo_camera'],
  power: ['power', 'power_settings_new'],
  bell: ['bell', 'notifications'],
  timer: ['timer', 'timer'],
  offer: ['tag', 'sell'],
  link: ['link', 'link'],
  checklist: ['checklist', 'checklist'],
  circle: ['circle', 'radio_button_unchecked'],
  bank: ['building.columns', 'account_balance'],
  phone: ['phone.fill', 'call'],
  directions: ['arrow.triangle.turn.up.right.diamond', 'directions'],
  bag: ['shippingbox', 'inventory_2'],
  history: ['clock.arrow.circlepath', 'history'],
} as const satisfies Record<string, readonly [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = 'text',
}: {
  name: IconName;
  size?: number;
  color?: ThemeColor;
}) {
  const theme = useTheme();
  const [ios, android] = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={theme[color]}
      resizeMode="scaleAspectFit"
    />
  );
}

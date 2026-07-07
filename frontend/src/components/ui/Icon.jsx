/**
 * Icon.jsx — Centralized icon component for ShareMyRide
 *
 * Wraps Lucide React icons with a standardized size + stroke system.
 * All icons in the app should go through this component or import
 * directly from lucide-react with consistent props.
 *
 * Sizing presets match the design system:
 *   nav      → 20px  (header / sidebar nav links)
 *   sidebar  → 20px
 *   button   → 18px  (inside buttons)
 *   input    → 18px  (inside form inputs)
 *   card     → 20px  (card section headers)
 *   table    → 16px  (table row actions)
 *   status   → 16px  (status pills)
 *   dialog   → 20px  (modal headers)
 *   sm       → 14px  (dense UI)
 *   xs       → 12px  (micro UI)
 *   lg       → 24px  (feature icons)
 *   xl       → 32px  (empty states / hero)
 */

import React from 'react';
import * as LucideIcons from 'lucide-react';

const SIZE_MAP = {
  xs:      12,
  sm:      14,
  status:  16,
  table:   16,
  button:  18,
  input:   18,
  nav:     20,
  sidebar: 20,
  card:    20,
  dialog:  20,
  lg:      24,
  xl:      32,
  '2xl':   40,
};

/**
 * @param {string}  name        — Lucide icon name, PascalCase e.g. "MapPin"
 * @param {string}  size        — One of the size keys above, or a raw pixel number
 * @param {string}  className   — Additional Tailwind classes (color, margin, etc.)
 * @param {string}  strokeWidth — Override stroke width (default 1.75)
 * @param {boolean} decorative  — If true, adds aria-hidden="true"
 * @param {string}  label       — aria-label for functional icons
 */
export default function Icon({
  name,
  size = 'button',
  className = '',
  strokeWidth = 1.75,
  decorative = true,
  label,
  ...rest
}) {
  const LucideIcon = LucideIcons[name];

  if (!LucideIcon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] Unknown icon: "${name}". Check lucide-react exports.`);
    }
    return null;
  }

  const px = typeof size === 'number' ? size : (SIZE_MAP[size] ?? 18);

  return (
    <LucideIcon
      size={px}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={!decorative ? label : undefined}
      {...rest}
    />
  );
}

// ── Convenience named exports for the most common icons in this app ──────────
// Lets you do: import { IconMapPin, IconCar } from './ui/Icon'
// and skip the `name` prop for frequently used icons.

export const IconMapPin        = (p) => <Icon name="MapPin"        {...p} />;
export const IconSearch        = (p) => <Icon name="Search"        {...p} />;
export const IconCar           = (p) => <Icon name="Car"           {...p} />;
export const IconCalendar      = (p) => <Icon name="Calendar"      {...p} />;
export const IconClock         = (p) => <Icon name="Clock"         {...p} />;
export const IconUser          = (p) => <Icon name="User"          {...p} />;
export const IconUsers         = (p) => <Icon name="Users"         {...p} />;
export const IconBell          = (p) => <Icon name="Bell"          {...p} />;
export const IconSettings      = (p) => <Icon name="Settings"      {...p} />;
export const IconLogOut        = (p) => <Icon name="LogOut"        {...p} />;
export const IconPlus          = (p) => <Icon name="Plus"          {...p} />;
export const IconX             = (p) => <Icon name="X"             {...p} />;
export const IconCheck         = (p) => <Icon name="Check"         {...p} />;
export const IconChevronDown   = (p) => <Icon name="ChevronDown"   {...p} />;
export const IconChevronRight  = (p) => <Icon name="ChevronRight"  {...p} />;
export const IconChevronLeft   = (p) => <Icon name="ChevronLeft"   {...p} />;
export const IconArrowRight    = (p) => <Icon name="ArrowRight"    {...p} />;
export const IconLoader        = (p) => <Icon name="Loader2"       {...p} />;
export const IconAlertCircle   = (p) => <Icon name="AlertCircle"   {...p} />;
export const IconCheckCircle   = (p) => <Icon name="CheckCircle2"  {...p} />;
export const IconInfo          = (p) => <Icon name="Info"          {...p} />;
export const IconTriangleAlert = (p) => <Icon name="TriangleAlert" {...p} />;
export const IconNavigation    = (p) => <Icon name="Navigation"    {...p} />;
export const IconRoute         = (p) => <Icon name="Route"         {...p} />;
export const IconTicket        = (p) => <Icon name="Ticket"        {...p} />;
export const IconWallet        = (p) => <Icon name="Wallet"        {...p} />;
export const IconStar          = (p) => <Icon name="Star"          {...p} />;
export const IconShield        = (p) => <Icon name="Shield"        {...p} />;
export const IconPhone         = (p) => <Icon name="Phone"         {...p} />;
export const IconMail          = (p) => <Icon name="Mail"          {...p} />;
export const IconTrash         = (p) => <Icon name="Trash2"        {...p} />;
export const IconEdit          = (p) => <Icon name="Pencil"        {...p} />;
export const IconFilter        = (p) => <Icon name="SlidersHorizontal" {...p} />;
export const IconDownload      = (p) => <Icon name="Download"      {...p} />;
export const IconUpload        = (p) => <Icon name="Upload"        {...p} />;
export const IconRefresh       = (p) => <Icon name="RefreshCw"     {...p} />;
export const IconShare         = (p) => <Icon name="Share2"        {...p} />;
export const IconCopy          = (p) => <Icon name="Copy"          {...p} />;
export const IconExternalLink  = (p) => <Icon name="ExternalLink"  {...p} />;
export const IconMenu          = (p) => <Icon name="Menu"          {...p} />;
export const IconHome          = (p) => <Icon name="Home"          {...p} />;
export const IconBuilding      = (p) => <Icon name="Building2"     {...p} />;
export const IconTrendingUp    = (p) => <Icon name="TrendingUp"    {...p} />;
export const IconDollarSign    = (p) => <Icon name="IndianRupee"   {...p} />;
export const IconPackage       = (p) => <Icon name="Package"       {...p} />;
export const IconGlobe         = (p) => <Icon name="Globe"         {...p} />;
export const IconLock          = (p) => <Icon name="Lock"          {...p} />;
export const IconUnlock        = (p) => <Icon name="Unlock"        {...p} />;
export const IconEye           = (p) => <Icon name="Eye"           {...p} />;
export const IconEyeOff        = (p) => <Icon name="EyeOff"        {...p} />;

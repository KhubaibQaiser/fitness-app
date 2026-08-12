'use client';

import {
  Activity as ActivityRaw,
  AlertTriangle as AlertTriangleRaw,
  ArrowLeft as ArrowLeftRaw,
  Bell as BellRaw,
  Check as CheckRaw,
  ChevronRight as ChevronRightRaw,
  ClipboardList as ClipboardListRaw,
  Download as DownloadRaw,
  Dumbbell as DumbbellRaw,
  Home as HomeRaw,
  MessageCircle as MessageCircleRaw,
  Moon as MoonRaw,
  MoreHorizontal as MoreHorizontalRaw,
  Pencil as PencilRaw,
  Plus as PlusRaw,
  Scale as ScaleRaw,
  Settings as SettingsRaw,
  ShieldAlert as ShieldAlertRaw,
  Sun as SunRaw,
  Target as TargetRaw,
  UserPlus as UserPlusRaw,
  Users as UsersRaw,
  Utensils as UtensilsRaw,
  Wrench as WrenchRaw,
  X as XRaw,
} from '@tamagui/lucide-icons-2';
import { createElement, type ReactElement } from 'react';

/**
 * Minimal icon props — keep this shallow. Deep Tamagui `IconProps` generics
 * often become an ESLint "error type" when re-exported into packages/app.
 */
export type GymosIconProps = {
  size?: number | string;
  color?: string;
  opacity?: number;
};

export type GymosIcon = (props: GymosIconProps) => ReactElement | null;

/**
 * Lucide's published .d.ts uses bare `JSX.Element`. Normalize to GymosIcon at
 * this package boundary so feature code never sees those declarations.
 */
const fromLucide =
  (Raw: GymosIcon): GymosIcon =>
  (props) =>
    createElement(Raw, props);

export const Activity: GymosIcon = fromLucide(ActivityRaw);
export const AlertTriangle: GymosIcon = fromLucide(AlertTriangleRaw);
export const ArrowLeft: GymosIcon = fromLucide(ArrowLeftRaw);
export const Bell: GymosIcon = fromLucide(BellRaw);
export const Check: GymosIcon = fromLucide(CheckRaw);
export const ChevronRight: GymosIcon = fromLucide(ChevronRightRaw);
export const ClipboardList: GymosIcon = fromLucide(ClipboardListRaw);
export const Download: GymosIcon = fromLucide(DownloadRaw);
export const Dumbbell: GymosIcon = fromLucide(DumbbellRaw);
export const Home: GymosIcon = fromLucide(HomeRaw);
export const MessageCircle: GymosIcon = fromLucide(MessageCircleRaw);
export const Moon: GymosIcon = fromLucide(MoonRaw);
export const MoreHorizontal: GymosIcon = fromLucide(MoreHorizontalRaw);
export const Plus: GymosIcon = fromLucide(PlusRaw);
export const Pencil: GymosIcon = fromLucide(PencilRaw);
export const Scale: GymosIcon = fromLucide(ScaleRaw);
export const Settings: GymosIcon = fromLucide(SettingsRaw);
export const ShieldAlert: GymosIcon = fromLucide(ShieldAlertRaw);
export const Sun: GymosIcon = fromLucide(SunRaw);
export const Target: GymosIcon = fromLucide(TargetRaw);
export const UserPlus: GymosIcon = fromLucide(UserPlusRaw);
export const Users: GymosIcon = fromLucide(UsersRaw);
export const Utensils: GymosIcon = fromLucide(UtensilsRaw);
export const Wrench: GymosIcon = fromLucide(WrenchRaw);
export const X: GymosIcon = fromLucide(XRaw);

export { config as tamaguiConfig } from './tamagui.config';

export { Screen } from './components/screen';
export { Card } from './components/card';
export { Title, Body, Muted, SectionTitle, Row } from './components/typography';
export {
  PrimaryButton,
  AccentButton,
  GhostButton,
  DangerButton,
  OutlineButton,
} from './components/buttons';
export { IconButton } from './components/icon-button';
export { Badge } from './components/badge';
export type { BadgeTone } from './components/badge';
export { AlertBanner } from './components/alert-banner';
export type { AlertBannerTone } from './components/alert-banner';
export { LoadingState, EmptyState, ErrorState } from './components/states';
export { Skeleton, SkeletonCircle, SkeletonRegion } from './components/skeleton';
export { FormField, FormSection } from './components/form-field';
export {
  DateField,
  calendarDateYearsAgo,
  todayCalendarDate,
  toCalendarDate,
} from './components/date-field';
export { IosSwitch } from './components/ios-switch';
export { PageHeader } from './components/page-header';
export { StickyFormFooter } from './components/sticky-form-footer';
export { Stat, DeltaChip, Avatar, ListRow } from './components/stat';
export { MetricHero } from './components/metric-hero';
export { SegmentedControl, Tabs } from './components/segmented-control';
export type { SegmentOption, TabItem } from './components/segmented-control';
export { AppErrorBoundary } from './components/error-boundary';
export { WeightChart } from './components/weight-chart';
export type { WeightPoint, WeightChartProps } from './components/weight-chart';
export { FadeIn } from './components/fade-in';
export { StaggerItem } from './components/stagger-item';
export * from './icons';
export type { GymosIcon } from './icons';

export {
  Adapt,
  AnimatePresence,
  Button,
  Input,
  Label,
  Popover,
  ScrollView,
  Separator,
  Sheet,
  Spinner,
  Switch,
  TamaguiProvider,
  Text,
  TextArea,
  Theme,
  useMedia,
  useTheme,
  View,
  XStack,
  YStack,
} from 'tamagui';

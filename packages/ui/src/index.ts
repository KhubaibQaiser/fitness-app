export { config as tamaguiConfig } from './tamagui.config';

export { Screen } from './components/screen';
export { Card } from './components/card';
export { Title, Body, Muted, SectionTitle, Row } from './components/typography';
export { PrimaryButton, AccentButton, GhostButton } from './components/buttons';
export { Badge } from './components/badge';
export type { BadgeTone } from './components/badge';
export { LoadingState, EmptyState, ErrorState } from './components/states';
export { FormField, FormSection } from './components/form-field';
export { PageHeader } from './components/page-header';
export { Stat, DeltaChip, Avatar, ListRow } from './components/stat';
export { SegmentedControl, Tabs } from './components/segmented-control';
export type { SegmentOption, TabItem } from './components/segmented-control';
export { AppErrorBoundary } from './components/error-boundary';
export { WeightChart } from './components/weight-chart';
export type { WeightPoint, WeightChartProps } from './components/weight-chart';
export * from './icons';
export type { GymosIcon } from './icons';

/** @deprecated Prefer Stat */
export { Stat as StatPill } from './components/stat';

export {
  Adapt,
  AnimatePresence,
  Button,
  Input,
  Label,
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

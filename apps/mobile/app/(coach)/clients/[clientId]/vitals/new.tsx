import { useLocalSearchParams } from 'expo-router';
import { VitalsEntryScreen } from '@gymos/app/features/vitals-entry';
import { paramId } from '../../../../../src/param-id';

export default function VitalsNewPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <VitalsEntryScreen clientId={paramId(params.clientId)} />;
}

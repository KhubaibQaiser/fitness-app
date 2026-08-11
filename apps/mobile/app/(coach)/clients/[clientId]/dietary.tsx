import { useLocalSearchParams } from 'expo-router';
import { DietaryScreen } from '@gymos/app/features/dietary';
import { paramId } from '../../../../src/param-id';

export default function DietaryPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <DietaryScreen clientId={paramId(params.clientId)} />;
}

import { useLocalSearchParams } from 'expo-router';
import { PlanScreen } from '@gymos/app/features/plan';
import { paramId } from '../../../../src/param-id';

export default function PlanPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <PlanScreen clientId={paramId(params.clientId)} />;
}

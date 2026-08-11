import { useLocalSearchParams } from 'expo-router';
import { GoalFormScreen } from '@gymos/app/features/goal-form';
import { paramId } from '../../../../../src/param-id';

export default function GoalNewPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <GoalFormScreen clientId={paramId(params.clientId)} />;
}

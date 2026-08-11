import { useLocalSearchParams } from 'expo-router';
import { CheckInScreen } from '@gymos/app/features/check-in';
import { paramId } from '../../../../src/param-id';

export default function CheckInPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <CheckInScreen clientId={paramId(params.clientId)} />;
}

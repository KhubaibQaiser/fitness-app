import { useLocalSearchParams } from 'expo-router';
import { CheckInDetailScreen } from '@gymos/app/features/check-in/detail';
import { paramId } from '../../../../../src/param-id';

export default function CheckInDetailPage() {
  const params = useLocalSearchParams<{ clientId: string; checkInId: string }>();
  return (
    <CheckInDetailScreen
      clientId={paramId(params.clientId)}
      checkInId={paramId(params.checkInId)}
    />
  );
}

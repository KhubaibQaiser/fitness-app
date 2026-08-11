import { useLocalSearchParams } from 'expo-router';
import { ClientDetailScreen } from '@gymos/app/features/client-detail';
import { paramId } from '../../../../src/param-id';

export default function ClientDetailPage() {
  const params = useLocalSearchParams<{ clientId: string }>();
  return <ClientDetailScreen clientId={paramId(params.clientId)} />;
}

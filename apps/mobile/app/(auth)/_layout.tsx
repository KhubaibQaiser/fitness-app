import { Slot } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function AuthLayout() {
  return <Slot />;
}

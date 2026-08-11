import { Redirect } from 'expo-router';

/** Parity with web: /settings/nutrition → /tools/targets */
export default function SettingsNutritionRedirect() {
  return <Redirect href="/tools/targets" />;
}

import type { Me, PublicConfig } from '@gymos/contracts';
import { DEFAULT_UNIT_PREFS, resolveUnitPrefs, type UnitPrefs } from '@gymos/core/units';

export const unitPrefsFrom = (me?: Me, config?: PublicConfig): UnitPrefs =>
  resolveUnitPrefs(me?.unitPrefs, config?.unitPrefs ?? DEFAULT_UNIT_PREFS);

export const defaultCountryFrom = (me?: Me, config?: PublicConfig): string =>
  me?.defaultCountry ?? config?.defaultCountry ?? 'PK';

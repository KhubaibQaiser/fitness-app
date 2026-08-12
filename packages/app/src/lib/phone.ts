import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type { CountryCode };

export const isCountryCode = (value: string): value is CountryCode => /^[A-Z]{2}$/.test(value);

export const formatPhoneAsYouType = (raw: string, country: CountryCode): string => {
  const typer = new AsYouType(country);
  return typer.input(raw);
};

export const toE164 = (raw: string, country: CountryCode): string | null => {
  const parsed = parsePhoneNumberFromString(raw, country);
  if (!parsed?.isValid()) return null;
  return parsed.number;
};

export const formatInternational = (e164: string): string => {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed?.formatInternational() ?? e164;
};

export const whatsappDigits = (phone: string): string => phone.replace(/[^\d]/g, '');

/**
 * Nigerian mobile number to E.164 (+234XXXXXXXXXX), same rules as the server.
 * Accepts 08031234567, 8031234567, 2348031234567, +234 803 123 4567.
 */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let national: string | undefined;
  if (digits.length === 13 && digits.startsWith('234')) national = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  else if (digits.length === 10) national = digits;
  return national && /^[789][01]\d{8}$/.test(national) ? `+234${national}` : null;
}

/** +2348031234567 -> 0803 123 4567 */
export function formatLocalPhone(e164: string | null | undefined): string {
  return e164?.replace(/^\+234(\d{3})(\d{3})(\d{4})$/, '0$1 $2 $3') ?? '';
}

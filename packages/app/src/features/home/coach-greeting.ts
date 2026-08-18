export const greetingForHour = (
  hours: number,
): 'Good morning' | 'Good afternoon' | 'Good evening' => {
  if (hours < 12) return 'Good morning';
  if (hours < 17) return 'Good afternoon';
  return 'Good evening';
};

export const formatCoachDate = (now: Date): string =>
  now.toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export const formatCoachTitle = (now: Date, firstName: string): string =>
  `${greetingForHour(now.getHours())}, ${firstName}`;

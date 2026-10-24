import type { ReactNode } from 'react';
import { Card } from '@gymos/ui';

/** Card on a phone. On the split layout the frame drops so the form sits on the column. */
export const AuthFormCard = ({ children }: { children: ReactNode }) => (
  <Card
    padding="$6"
    gap="$4"
    shadowColor="transparent"
    shadowOpacity={0}
    shadowRadius={0}
    elevation={0}
    style={{ boxShadow: 'none' }}
    $md={{
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      padding: 0,
      borderRadius: 0,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }}
  >
    {children}
  </Card>
);

import type { ReactNode } from 'react';
import { Card } from '@gymos/ui';

/** Card on a phone. On the split layout the frame drops so the form sits on the column. */
export const AuthFormCard = ({ children }: { children: ReactNode }) => (
  <Card
    padding="6 md:0px"
    gap="4"
    backgroundColor="cardBg md:transparent"
    borderWidth="1px md:0px"
    borderColor="border-color md:transparent"
    borderRadius="16px md:0px"
    shadowColor="transparent"
    shadowOpacity={0}
    shadowRadius={0}
    style={{ boxShadow: 'none' }}
  >
    {children}
  </Card>
);

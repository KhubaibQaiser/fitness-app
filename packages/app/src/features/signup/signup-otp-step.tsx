'use client';

import { GhostButton, PrimaryButton, useFocusChain, YStack } from '@gymos/ui';
import { OtpCodeField } from '../auth/otp-code-field';

type SignupOtpStepProps = {
  code: string;
  onChangeCode: (code: string) => void;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onResend: () => void;
  resendBusy: boolean;
};

export const SignupOtpStep = ({
  code,
  onChangeCode,
  busy,
  error,
  onConfirm,
  onResend,
  resendBusy,
}: SignupOtpStepProps) => {
  const chain = useFocusChain(['code'], { onSubmit: onConfirm, submitKey: 'go' });

  return (
    <YStack gap="$4">
      {chain.toolbar}
      <OtpCodeField
        value={code}
        onChangeText={onChangeCode}
        error={error}
        field={chain.bind('code')}
      />
      <PrimaryButton disabled={busy || code.length !== 6} onPress={onConfirm} width="100%">
        {busy ? 'Creating account…' : 'Verify and create account'}
      </PrimaryButton>
      <GhostButton disabled={resendBusy || busy} onPress={onResend} width="100%">
        {resendBusy ? 'Resending…' : 'Resend code'}
      </GhostButton>
    </YStack>
  );
};

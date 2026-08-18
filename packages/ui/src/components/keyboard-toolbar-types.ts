export type KeyboardToolbarProps = {
  nativeID: string;
  canPrev: boolean;
  canNext: boolean;
  doneLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onDone: () => void;
};

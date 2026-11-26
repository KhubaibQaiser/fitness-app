type BackTarget = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: string) => void;
};

/** Go back when there is a screen to return to; otherwise replace to the given parent screen. */
export const backOrReplace = ({ canGoBack, back, replace }: BackTarget, parentHref: string) => {
  if (canGoBack()) back();
  else replace(parentHref);
};

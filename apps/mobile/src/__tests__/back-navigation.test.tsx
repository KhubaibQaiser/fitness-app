import { renderHook } from '@testing-library/react-native';
import { useBackOr } from '../../../../packages/app/src/lib/use-back-navigation';

/**
 * The native build of useBackOr (jest-expo resolves use-back-navigation.native.ts): Cancel goes
 * back when the stack has history, otherwise replaces to the parent screen (U3 blocker).
 */

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { back: mockBack, replace: mockReplace };
let mockCanGoBack = false;

jest.mock('solito/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('solito/build/router/use-navigation', () => ({
  useNavigation: () => ({ canGoBack: () => mockCanGoBack }),
}));

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
});

it('replaces to the parent screen when the stack has no history', () => {
  mockCanGoBack = false;
  const { result } = renderHook(() => useBackOr('/clients/c1'));

  result.current();

  expect(mockReplace).toHaveBeenCalledWith('/clients/c1');
  expect(mockBack).not.toHaveBeenCalled();
});

it('goes back when the stack has a screen to return to', () => {
  mockCanGoBack = true;
  const { result } = renderHook(() => useBackOr('/clients/c1'));

  result.current();

  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

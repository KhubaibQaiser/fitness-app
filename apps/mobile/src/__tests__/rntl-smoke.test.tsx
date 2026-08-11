import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

/**
 * Smoke RNTL wiring — feature screens are covered via shared packages + Maestro.
 * Keeps the Jest/Expo preset honest in CI.
 */
describe('RNTL smoke', () => {
  it('renders a basic native text node', () => {
    render(<Text>GymOS Coach</Text>);
    expect(screen.getByText('GymOS Coach')).toBeTruthy();
  });
});

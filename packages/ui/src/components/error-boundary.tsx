'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Screen } from './screen';
import { ErrorState } from './states';

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

/** Class boundary required — React error boundaries cannot be function components. */
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <Screen chrome="bare">
          <ErrorState
            message={this.props.fallbackTitle ?? 'Something went wrong rendering this screen.'}
            retry={() => this.setState({ error: null })}
          />
        </Screen>
      );
    }
    return this.props.children;
  }
}

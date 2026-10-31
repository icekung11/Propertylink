"use client";
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-2xl font-bold text-[#10243E] mb-2">Something went wrong</p>
            <p className="text-[#66758A] text-sm mb-5">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              className="px-5 py-2.5 bg-[#1672DC] text-white font-medium rounded-lg hover:bg-[#125BB8] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

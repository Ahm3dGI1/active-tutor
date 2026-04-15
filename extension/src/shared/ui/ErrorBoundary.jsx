import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Hermex error boundary:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const label = this.props.label || 'this section';
    return (
      <div className="p-6 text-center">
        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-red-500 text-lg">!</span>
        </div>
        <p className="text-sm font-semibold text-surface-800 mb-1">Something went wrong</p>
        <p className="text-xs text-surface-500 mb-3">
          We hit an error rendering {label}.
        </p>
        <button
          onClick={this.reset}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary-700 text-white font-medium hover:bg-primary-600 transition"
        >
          Try again
        </button>
      </div>
    );
  }
}

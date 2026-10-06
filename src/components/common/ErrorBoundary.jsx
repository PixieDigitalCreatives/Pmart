import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import '../../styles/error-boundary.scss';
import { Button } from '@/components/ui';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // You can also log the error to an error reporting service here
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <AlertTriangle size={64} className="error-icon" />
            <h2>Oops! Something went wrong.</h2>
            <p className="error-message">
              We're sorry, but there was an unexpected error. 
              {this.props.fallbackMessage || 'Our team has been notified.'}
            </p>
            <Button 
              className="retry-button" 
              onClick={() => window.location.reload()}
            >
              <RefreshCcw size={16} />
              <span>Reload Page</span>
            </Button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="error-details">
                <details>
                  <summary>View Technical Details</summary>
                  <pre>{this.state.error.toString()}</pre>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

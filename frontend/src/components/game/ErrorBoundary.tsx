"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GameErrorBoundary] Error caught:', error);
    console.error('[GameErrorBoundary] Error info:', errorInfo);
    
    // Log to external service if needed
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="game-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2>Game Engine Error</h2>
            <p>
              The Nepal Explorer game encountered an unexpected error. 
              This might be due to WebGL limitations or memory constraints.
            </p>
            
            {this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReset} className="btn btn-primary">
                Try Again
              </button>
              <button onClick={this.handleReload} className="btn btn-secondary">
                Reload Page
              </button>
            </div>

            <div className="error-tips">
              <h4>Troubleshooting Tips:</h4>
              <ul>
                <li>Close other browser tabs to free up memory</li>
                <li>Ensure hardware acceleration is enabled</li>
                <li>Try using a different browser (Chrome recommended)</li>
                <li>Update your graphics drivers</li>
              </ul>
            </div>
          </div>

          <style jsx>{`
            .game-error-boundary {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(135deg, #1e40af, #7c3aed);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
              padding: 20px;
            }

            .error-content {
              background: white;
              border-radius: 16px;
              padding: 40px;
              max-width: 600px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              text-align: center;
            }

            .error-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }

            h2 {
              color: #1f2937;
              margin: 0 0 16px 0;
              font-size: 28px;
              font-weight: 700;
            }

            p {
              color: #6b7280;
              margin: 0 0 24px 0;
              line-height: 1.6;
            }

            .error-details {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: #374151;
              margin-bottom: 12px;
            }

            .error-details pre {
              background: #1f2937;
              color: #f9fafb;
              padding: 12px;
              border-radius: 4px;
              font-size: 12px;
              overflow-x: auto;
              margin: 8px 0;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin: 24px 0;
            }

            .btn {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .btn-primary {
              background: #3b82f6;
              color: white;
            }

            .btn-primary:hover {
              background: #2563eb;
              transform: translateY(-1px);
            }

            .btn-secondary {
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
            }

            .btn-secondary:hover {
              background: #e5e7eb;
            }

            .error-tips {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 20px;
              margin-top: 24px;
              text-align: left;
            }

            .error-tips h4 {
              color: #92400e;
              margin: 0 0 12px 0;
              font-size: 16px;
            }

            .error-tips ul {
              color: #92400e;
              margin: 0;
              padding-left: 20px;
            }

            .error-tips li {
              margin: 4px 0;
              font-size: 14px;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
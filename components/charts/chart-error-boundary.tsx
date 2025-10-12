"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[v0] Chart error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-destructive">Failed to load chart</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

"use client"

import React from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-lg font-semibold text-destructive">Une erreur s'est produite</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error?.message ?? "Veuillez réessayer ou contacter l'administrateur."}
            </p>
            <button
              className="text-sm text-primary underline"
              onClick={() => this.setState({ hasError: false })}
            >
              Réessayer
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

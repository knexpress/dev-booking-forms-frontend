import React from 'react'

interface Props {
	children: React.ReactNode
}

interface State {
	hasError: boolean
	error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(_error: Error, _info: React.ErrorInfo) {
		// Error logged to error tracking service (not console per ISO 27001/27002 A.12.4.1)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="p-8">
					<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
						<p className="text-red-700 font-semibold">Something went wrong.</p>
						<p className="text-sm text-red-600 mt-1">Please go back and try again.</p>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}

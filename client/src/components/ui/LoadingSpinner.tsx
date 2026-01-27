import './LoadingSpinner.css';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'md', message, fullScreen = false }: LoadingSpinnerProps) {
    const spinner = (
        <div className={`loading-spinner-container ${fullScreen ? 'fullscreen' : ''}`}>
            <div className={`loading-spinner ${size}`}>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
            </div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );

    return spinner;
}

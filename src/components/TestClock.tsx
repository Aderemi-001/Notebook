import React, { useState, useEffect } from 'react';
import './TestClock.css';

const TestClock: React.FC = () => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setSeconds(prev => (prev + 1) % 60);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const secondsStr = String(seconds).padStart(2, '0');
    const digit1 = secondsStr[0];
    const digit2 = secondsStr[1];

    return (
        <div className="test-clock-container">
            <h1>Flip Clock Test</h1>
            <div className="test-clock">
                <FlipDigit value={digit1} />
                <FlipDigit value={digit2} />
            </div>
            <p>Counter: {seconds}</p>
        </div>
    );
};

const FlipDigit: React.FC<{ value: string }> = ({ value }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [previousValue, setPreviousValue] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);

    useEffect(() => {
        if (value !== currentValue) {
            setPreviousValue(currentValue);
            setIsFlipping(true);

            const timer = setTimeout(() => {
                setCurrentValue(value);
                setIsFlipping(false);
            }, 600);

            return () => clearTimeout(timer);
        }
    }, [value, currentValue]);

    return (
        <div className="flip-digit">
            {/* Top half - always shows current */}
            <div className="flip-top">
                <span>{currentValue}</span>
            </div>

            {/* Bottom half - always shows current */}
            <div className="flip-bottom">
                <span>{currentValue}</span>
            </div>

            {/* Animated flipping card - shows previous, flips to reveal current */}
            {isFlipping && (
                <div className="flip-card">
                    <div className="flip-card-top">
                        <span>{previousValue}</span>
                    </div>
                    <div className="flip-card-bottom">
                        <span>{currentValue}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestClock;

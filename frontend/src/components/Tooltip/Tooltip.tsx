import { ReactNode, useState, useRef, useEffect } from 'react';
import './Tooltip.css';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip--${position}`}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <span className="tooltip__content">{content}</span>
          <span className="tooltip__arrow" />
        </div>
      )}
    </div>
  );
}

// IconButton with built-in tooltip
interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md'
}: IconButtonProps) {
  return (
    <Tooltip content={label} disabled={disabled}>
      <button
        className={`icon-button icon-button--${variant} icon-button--${size}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

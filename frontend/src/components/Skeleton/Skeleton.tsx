import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 'var(--radius-sm)',
  className = ''
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
  };

  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

// Pre-configured skeletons
export function SkeletonText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div className="skeleton-text" style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__header">
        <SkeletonAvatar size={32} />
        <div className="skeleton-card__header-text">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="skeleton-card__footer">
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </div>
    </div>
  );
}

export function SkeletonTaskCard() {
  return (
    <div className="skeleton-task-card" aria-hidden="true">
      <div className="skeleton-task-card__header">
        <Skeleton width="70%" height={16} />
        <Skeleton width={20} height={20} borderRadius={4} />
      </div>
      <Skeleton width="90%" height={12} />
      <div className="skeleton-task-card__footer">
        <Skeleton width={50} height={20} borderRadius={10} />
        <Skeleton width={30} height={20} borderRadius={10} />
      </div>
    </div>
  );
}

export function SkeletonContactRow() {
  return (
    <div className="skeleton-contact-row" aria-hidden="true">
      <SkeletonAvatar size={36} />
      <div className="skeleton-contact-row__info">
        <Skeleton width="50%" height={14} />
        <Skeleton width="30%" height={12} />
      </div>
      <Skeleton width={70} height={24} borderRadius={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      <div className="skeleton-table__header">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={14} width={`${20 + i * 5}%`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table__row">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} height={14} width={`${60 + Math.random() * 30}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

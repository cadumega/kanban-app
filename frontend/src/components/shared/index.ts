/**
 * Shared Components
 * Export all reusable UI components from a single entry point
 */

// Toast notifications
export { ToastProvider, useToast } from '../Toast';
export type { ToastType, ToastData } from '../Toast';

// Confirm Dialog
export { ConfirmDialog } from '../ConfirmDialog';
export type { ConfirmDialogVariant } from '../ConfirmDialog';

// Button
export { Button } from '../Button';
export type { ButtonVariant, ButtonSize } from '../Button';

// Empty States
export {
  EmptyState,
  EmptyTasks,
  EmptyContacts,
  EmptyFollowups,
  EmptySearch,
  EmptyNotes
} from '../EmptyState';
export type { EmptyStateType } from '../EmptyState';

// Skeleton Loading
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTaskCard,
  SkeletonContactRow,
  SkeletonTable
} from '../Skeleton';

// Tooltip
export { Tooltip, IconButton } from '../Tooltip';

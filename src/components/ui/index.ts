// Re-export adapters as primary components
export { ButtonAdapter as Button } from './adapters/ButtonAdapter';
export { BadgeAdapter as Badge } from './adapters/BadgeAdapter';

// Re-export original components with distinct names
export { Button as OriginalButton } from './button';
export { Badge as OriginalBadge } from './badge';

// Export other UI components directly
export * from './avatar';
export * from './select';
export * from './tabs';
export * from './toast';
export * from './use-toast';
export * from './card';
export * from './separator';
export * from './progress';
export * from './tooltip';
export * from './textarea';
export * from './scroll-area'; 
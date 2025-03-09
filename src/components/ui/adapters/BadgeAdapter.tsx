import React from 'react';
import { Badge as ChakraBadge } from '@chakra-ui/react';
import { Badge as CustomBadge, BadgeProps as CustomBadgeProps } from '../badge';

// Adapter props include all standard badge props plus special handling for variant
interface BadgeAdapterProps extends Omit<CustomBadgeProps, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  useChakra?: boolean;
}

/**
 * BadgeAdapter provides a consistent interface for badges, regardless of whether
 * you're using Chakra UI or custom UI components
 */
export const BadgeAdapter: React.FC<BadgeAdapterProps> = ({ 
  variant = 'default', 
  useChakra = false,
  className,
  ...props 
}) => {
  // If specified to use Chakra
  if (useChakra) {
    // Map custom variants to Chakra variants
    let chakraVariant = 'solid';
    let colorScheme = 'blue';
    
    if (variant === 'outline') {
      chakraVariant = 'outline';
      colorScheme = 'gray';
    }
    if (variant === 'secondary') {
      colorScheme = 'gray';
    }
    if (variant === 'destructive') {
      colorScheme = 'red';
    }
    
    return (
      <ChakraBadge
        variant={chakraVariant}
        colorScheme={colorScheme}
        {...props}
      />
    );
  }

  // Otherwise use our custom badge
  return (
    <CustomBadge
      variant={variant}
      className={className}
      {...props}
    />
  );
};

export default BadgeAdapter; 
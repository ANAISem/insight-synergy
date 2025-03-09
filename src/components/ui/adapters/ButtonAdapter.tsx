import React from 'react';
import { Button as ChakraButton } from '@chakra-ui/react';
import { Button as CustomButton, ButtonProps as CustomButtonProps } from '../button';

// Adapter props include all standard button props plus special handling for variant
interface ButtonAdapterProps extends Omit<CustomButtonProps, 'variant'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  useChakra?: boolean;
}

/**
 * ButtonAdapter provides a consistent interface for buttons, regardless of whether
 * you're using Chakra UI or custom UI components
 */
export const ButtonAdapter: React.FC<ButtonAdapterProps> = ({ 
  variant = 'default', 
  size = 'default',
  useChakra = false,
  ...props 
}) => {
  // If specified to use Chakra
  if (useChakra) {
    // Map custom variants to Chakra variants
    let chakraVariant = 'solid';
    if (variant === 'outline') chakraVariant = 'outline';
    if (variant === 'ghost') chakraVariant = 'ghost';
    if (variant === 'link') chakraVariant = 'link';
    if (variant === 'destructive') chakraVariant = 'solid';
    if (variant === 'secondary') chakraVariant = 'solid';

    // Map sizes
    let chakraSize = 'md';
    if (size === 'sm') chakraSize = 'sm';
    if (size === 'lg') chakraSize = 'lg';
    
    return (
      <ChakraButton
        variant={chakraVariant}
        size={chakraSize}
        colorScheme={variant === 'destructive' ? 'red' : undefined}
        {...props}
      />
    );
  }

  // Otherwise use our custom button
  return (
    <CustomButton
      variant={variant}
      size={size}
      {...props}
    />
  );
};

export default ButtonAdapter; 
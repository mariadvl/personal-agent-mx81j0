import React, { useState } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { AvatarProps } from '../../types/ui';
import { BORDER_RADIUS } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

/**
 * Avatar component that displays a user's profile image or their initials as a fallback.
 * The component handles image loading errors by gracefully falling back to text initials.
 */
const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = '', 
  size = 40, 
  text = '', 
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);
  const { theme } = useTheme();
  
  /**
   * Generates initials from the provided text.
   * Takes up to 2 characters from the beginning of each word.
   */
  const getInitials = (text: string): string => {
    if (!text) return '';
    
    return text
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Determine if we should show the image or text
  const showImage = src && !imageError;
  const initials = getInitials(text);
  
  // Avatar container props
  const containerProps = {
    size,
    className: classNames('avatar', className),
    'aria-label': alt || text || 'User avatar',
  };
  
  return (
    <AvatarContainer {...containerProps}>
      {showImage ? (
        <AvatarImage 
          src={src} 
          alt={alt || 'User avatar'} 
          onError={() => setImageError(true)}
        />
      ) : (
        <AvatarText 
          size={size} 
          color={theme.colors.text.primary}
          backgroundColor={theme.colors.primary.light}
        >
          {initials}
        </AvatarText>
      )}
    </AvatarContainer>
  );
};

// Styled components
const AvatarContainer = styled.div<{ size: number }>`
  width: ${props => `${props.size}px`};
  height: ${props => `${props.size}px`};
  border-radius: ${BORDER_RADIUS.ROUND};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarText = styled.div<{ size: number; color: string; backgroundColor: string }>`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.backgroundColor};
  color: ${props => props.color};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  font-size: ${props => `${Math.max(props.size * 0.4, 12)}px`};
  text-transform: uppercase;
`;

export default Avatar;
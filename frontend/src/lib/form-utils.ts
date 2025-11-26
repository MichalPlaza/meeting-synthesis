import { z } from 'zod';

/**
 * Common validation schemas for forms
 *
 * These schemas can be reused across different forms to ensure
 * consistent validation rules throughout the application.
 */
export const commonSchemas = {
  /**
   * Email validation - ensures valid email format
   */
  email: z.string().email('Invalid email address'),

  /**
   * Password validation - minimum 6 characters
   */
  password: z.string().min(6, 'Password must be at least 6 characters'),

  /**
   * Username validation - minimum 3 characters
   */
  username: z.string().min(3, 'Username must be at least 3 characters'),

  /**
   * Name validation - minimum 2 characters
   */
  name: z.string().min(2, 'Name must be at least 2 characters'),

  /**
   * User role validation - must be one of the defined roles
   */
  role: z.enum(['developer', 'scrum_master', 'project_manager', 'admin']),
};

/**
 * Common error styling class names
 *
 * Use these instead of hardcoded colors to ensure theme consistency
 */
export const errorStyles = {
  /**
   * Text color for error messages (theme-aware)
   */
  text: 'text-sm text-destructive',

  /**
   * Input border and focus ring styles for error state
   */
  input: 'border-destructive focus-visible:ring-destructive',
};

/**
 * Helper function to get button text based on submission state
 *
 * @param isSubmitting - Whether the form is currently submitting
 * @param defaultText - Text to show when not submitting
 * @param loadingText - Text to show while submitting
 * @returns The appropriate button text
 *
 * @example
 * ```tsx
 * <Button type="submit" disabled={isSubmitting}>
 *   {getButtonText(isSubmitting, 'Save Changes', 'Saving...')}
 * </Button>
 * ```
 */
export function getButtonText(
  isSubmitting: boolean,
  defaultText: string,
  loadingText: string
): string {
  return isSubmitting ? loadingText : defaultText;
}

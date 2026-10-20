// Form validation for login and signup (issue #27).
// The backend should run its own checks too. These just catch mistakes
// before anything is sent.

export type FieldName = "username" | "email" | "password" | "confirmPassword";
export type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function checkEmail(email: string): string | undefined {
  if (!email.trim()) return "Enter your email.";
  if (!EMAIL_PATTERN.test(email.trim())) return "That doesn't look like an email address.";
  return undefined;
}

export function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) errors.password = "Enter your password.";

  return errors;
}

export function validateSignup(
  username: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!username.trim()) {
    errors.username = "Choose a username.";
  } else if (!USERNAME_PATTERN.test(username.trim())) {
    errors.username = "Use 3–20 letters, numbers, or underscores.";
  }

  const emailError = checkEmail(email);
  if (emailError) errors.email = emailError;

  if (!password) {
    errors.password = "Create a password.";
  } else if (password.length < 8) {
    errors.password = "Use at least 8 characters.";
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Include at least one letter and one number.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Re-enter your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

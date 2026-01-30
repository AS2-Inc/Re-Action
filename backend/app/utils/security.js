import bcrypt from "bcrypt";

export async function hash_password(plain_text_password) {
  const salt_rounds = 10;
  const hashed_password = await bcrypt.hash(plain_text_password, salt_rounds);
  return hashed_password;
}

export function is_password_weak(password) {
  // Example criteria: at least 6 characters
  if (!password) return true;
  if (password.length < 6) {
    return true;
  }
  // at least 1 lowercase letter 1 uppercase letter, 1 digit, 1 special character
  const lowercase_regex = /[a-z]/;
  const uppercase_regex = /[A-Z]/;
  const digit_regex = /[0-9]/;
  const specialchar_regex = /[!@#$%^&*(),.?":{}|<>]/;
  if (!lowercase_regex.test(password)) return true;
  if (!uppercase_regex.test(password)) return true;
  if (!digit_regex.test(password)) return true;
  if (!specialchar_regex.test(password)) return true;
  return false;
}

export async function is_password_valid(plain_text_password, hashed_password) {
  return await bcrypt.compare(plain_text_password, hashed_password);
}

/** Browser-safe temporary password generation; callers choose their flow's minimum. */
export function generateTemporaryPassword(length = 8): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export function generateStudentRegistrationPassword(): string {
  return generateTemporaryPassword(10);
}
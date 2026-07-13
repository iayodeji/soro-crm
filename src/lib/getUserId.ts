export function getUserId(user: any): string {
  if (!user?.uid) {
    throw new Error("User is not authenticated.");
  }
  return user.uid;
}

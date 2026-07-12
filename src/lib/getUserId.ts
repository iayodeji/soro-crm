const DEMO_USER_ID = "demo-founder-123";

export function getUserId(user: any): string {
  return user?.uid || DEMO_USER_ID;
}

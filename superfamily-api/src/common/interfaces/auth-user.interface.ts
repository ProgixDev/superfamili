export interface AuthUser {
  userId: string;
  email: string;
  role: 'parent' | 'educator' | 'admin';
  profileId?: string;
}

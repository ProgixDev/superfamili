export declare class SignupDto {
    first_name: string;
    last_name: string;
    role: 'parent' | 'educator' | 'admin';
    postal_code?: string;
    city?: string;
    phone?: string;
}

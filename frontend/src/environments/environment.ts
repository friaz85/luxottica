const origin = typeof window !== 'undefined' && window.location?.origin 
    ? window.location.origin 
    : 'https://q-tokens.com.mx';

export const environment = {
    production: true,
    apiUrl: `${origin}/luxottica/api`,
    uploadsUrl: `${origin}/luxottica/api/public/uploads`,
    fallbackUrl: `${origin}/luxottica/api/public/uploads`
};

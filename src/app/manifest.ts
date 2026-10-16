import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Attend Ease - Facility Attendance System',
    short_name: 'Attend Ease',
    description: 'Modern, responsive, facility-based attendance management system using facial recognition and facility verification.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F2',
    theme_color: '#123C3A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

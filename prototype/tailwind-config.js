// Tehran Prototype - Shared Tailwind Configuration
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#14b8a6',
                secondary: '#2dd4bf',
                accent: '#f59e0b',
                bg: '#f5f6f8',
                surface: '#f0fdfa',
                emerald: {
                    50: '#F0FDF4',
                    500: '#10B981',
                    600: '#059669',
                    900: '#064E3B',
                }
            },
            borderRadius: {
                'none': '0',
                'sm': '2px',
                DEFAULT: '4px',
                'md': '4px',
                'lg': '4px',
                'xl': '4px',
                '2xl': '4px',
                '3xl': '4px',
                'full': '9999px',
            },
            animation: {
                'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'float': 'float 6s ease-in-out infinite',
                'slide-in': 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                slideIn: {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                }
            }
        }
    }
}

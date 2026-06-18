import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Fraunces } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { Analytics } from '@vercel/analytics/next';

// UI + số liệu — native tiếng Việt (ADR 0003)
const beVietnamPro = Be_Vietnam_Pro({
	variable: '--font-be-vietnam-pro',
	subsets: ['latin', 'vietnamese'],
	weight: ['400', '500', '600'],
	display: 'swap',
});

// Display/heading — luxury editorial (ADR 0003), nạp non-blocking
const fraunces = Fraunces({
	variable: '--font-fraunces',
	subsets: ['latin', 'vietnamese'],
	display: 'swap',
	preload: false,
});

export const metadata: Metadata = {
	title: 'Lumi — Quản lý bán hàng & kho',
	description:
		'SaaS quản lý bán hàng, tồn kho và hóa đơn cho cửa hàng — đa chi nhánh.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="vi"
			suppressHydrationWarning
			className={`${beVietnamPro.variable} ${fraunces.variable} h-full antialiased`}>
			<Analytics />
			<body className="min-h-full">
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem={false}
					disableTransitionOnChange>
					<ToastProvider>{children}</ToastProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}

import type { AppProps } from 'next/app';
import PageLayout from '../components/PageLayout';
import AuthProvider from '../contexts/AuthContext';
import { SessionProvider } from "next-auth/react";
import '../app/globals.css';

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <AuthProvider>
        <PageLayout>
          <Component {...pageProps} />
        </PageLayout>
      </AuthProvider>
    </SessionProvider>
  );
}

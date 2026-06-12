import LoginClient from './LoginClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вхід | AuraBooking',
  description: 'Увійдіть до свого облікового запису AuraBooking, щоб керувати зустрічами та сесіями.',
  openGraph: {
    title: 'Вхід | AuraBooking',
    description: 'Увійдіть до свого облікового запису AuraBooking, щоб керувати зустрічами та сесіями.',
  },
};

export default function Page() {
  return <LoginClient />;
}

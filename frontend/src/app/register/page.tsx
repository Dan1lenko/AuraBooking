import RegisterClient from './RegisterClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Реєстрація | AuraBooking',
  description: 'Створіть обліковий запис AuraBooking, щоб почати бронювати сертифікованих спеціалістів або налаштувати свій вільний час.',
  openGraph: {
    title: 'Реєстрація | AuraBooking',
    description: 'Створіть обліковий запис AuraBooking, щоб почати бронювати сертифікованих спеціалістів.',
  },
};

export default function Page() {
  return <RegisterClient />;
}

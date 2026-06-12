import SpecialistProfileClient from './SpecialistProfileClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Профіль спеціаліста та бронювання | AuraBooking',
  description: 'Переглядайте розклад, читайте відгуки клієнтів та бронюйте сесії з нашими професійними партнерами.',
  openGraph: {
    title: 'Профіль спеціаліста та бронювання | AuraBooking',
    description: 'Переглядайте розклад, читайте відгуки клієнтів та бронюйте сесії з нашими професійними партнерами.',
  },
};

export default function Page() {
  return <SpecialistProfileClient />;
}

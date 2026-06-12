import SpecialistsClient from './SpecialistsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Знайти перевірених спеціалістів | AuraBooking',
  description: 'Шукайте та фільтруйте у нашому каталозі сертифікованих спеціалістів у терапії, коучингу, масажі та консалтингу.',
  openGraph: {
    title: 'Знайти перевірених спеціалістів | AuraBooking',
    description: 'Шукайте та фільтруйте у нашому каталозі сертифікованих спеціалістів у терапії, коучингу, масажі та консалтингу.',
  },
};

export default function Page() {
  return <SpecialistsClient />;
}

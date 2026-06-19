import React from 'react';
import type { Metadata } from 'next';
import { Calendar, Shield, MessageSquare, Bell, ArrowRight, Star, Heart, Award, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'AuraBooking | Знайдіть та забронюйте перевірених спеціалістів за лічені хвилини',
  description: "Зв'яжіться з відібраними вручну перевіреними експертами для терапії, наставництва, велнесу та консультацій. Швидкий розклад, безпечні платежі та обмін повідомленнями в реальному часі.",
  openGraph: {
    title: 'AuraBooking | Знайдіть та забронюйте перевірених спеціалістів за лічені хвилини',
    description: "Зв'яжіться з відібраними вручну перевіреними експертами для терапії, наставництва, велнесу та консультацій.",
    type: 'website',
  },
};

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
  const isAuthenticated = !!(token || refreshToken);

  let specialists: any[] = [];
  let topSpecialist: any = null;
  try {
    const res = await fetch(`${process.env.BACKEND_API_URL || 'http://localhost:3001'}/specialists`, { cache: 'no-store' });
    if (res.ok) {
      specialists = await res.json();
      if (Array.isArray(specialists) && specialists.length > 0) {
        const sorted = [...specialists].sort((a: any, b: any) => {
          if (b.rating !== a.rating) return b.rating - a.rating;
          return b.reviewsCount - a.reviewsCount;
        });
        topSpecialist = sorted[0];
      }
    }
  } catch (error) {
    console.error('Failed to fetch specialists:', error);
  }

  const getReviewsWord = (count: number) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'відгуків';
    if (lastDigit === 1) return 'відгук';
    if (lastDigit >= 2 && lastDigit <= 4) return 'відгуки';
    return 'відгуків';
  };

  const getExpertWord = (count: number) => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'експертів';
    if (lastDigit === 1) return 'експерт';
    if (lastDigit >= 2 && lastDigit <= 4) return 'експерти';
    return 'експертів';
  };

  const getCategoryCount = (catName: string) => {
    if (!Array.isArray(specialists)) return 0;
    return specialists.filter((s: any) => s.category?.toLowerCase() === catName.toLowerCase()).length;
  };

  const categoryTranslation: Record<string, string> = {
    Therapy: 'Терапія',
    Coaching: 'Наставництво',
    Massage: 'Масаж',
    Consulting: 'Консультації',
    Design: 'Дизайн'
  };

  const defaultSpecialist = {
    id: null,
    user: { name: 'Д-р Сара Дженкінс' },
    category: 'Therapy',
    rating: 5.0,
    reviewsCount: 42,
    price: 75.0,
    avatarUrl: null,
    bio: 'Досвідчений спеціаліст з терапії та наставництва, що допоможе вам досягти гармонії та балансу.'
  };

  const specialistToDisplay = topSpecialist || defaultSpecialist;

  const features = [
    {
      icon: <Shield className="w-6 h-6 text-emerald-600" />,
      title: 'Перевірені спеціалісти',
      description: 'Кожен професіонал проходить перевірку репутації, валідацію ліцензії та особисту співбесіду для абсолютної довіри.'
    },
    {
      icon: <Calendar className="w-6 h-6 text-blue-600" />,
      title: 'Швидке бронювання',
      description: 'Переглядайте вільні слоти v календарі в режимі реального часу, обирайте зручний час і миттєво підтверджуйте.'
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-violet-600" />,
      title: 'Прямий чат',
      description: 'Обговорюйте цілі, ставте попередні запитання та залишайтеся на зв\'язку зі своїм спеціалістом прямо в додатку.'
    },
    {
      icon: <Bell className="w-6 h-6 text-amber-600" />,
      title: 'Розумні нагадування',
      description: 'Отримуйте пуш-сповіщення в реальному часі та заплановані нагадування на пошту за 24 години та за 1 годину до початку сесії.'
    }
  ];

  const categories = [
    { name: 'Therapy', label: 'Терапія', count: `${getCategoryCount('Therapy')} ${getExpertWord(getCategoryCount('Therapy'))}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { name: 'Coaching', label: 'Наставництво', count: `${getCategoryCount('Coaching')} ${getExpertWord(getCategoryCount('Coaching'))}`, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { name: 'Massage', label: 'Масаж', count: `${getCategoryCount('Massage')} ${getExpertWord(getCategoryCount('Massage'))}`, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { name: 'Consulting', label: 'Консультації', count: `${getCategoryCount('Consulting')} ${getExpertWord(getCategoryCount('Consulting'))}`, color: 'bg-violet-50 text-violet-700 border-violet-100' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">
              A
            </div>
            <span className="font-bold text-slate-900 tracking-tight text-sm md:text-lg">AuraBooking</span>
          </div>

          <nav className="flex items-center gap-2 md:gap-4">
            <Link
              href="/specialists"
              className="text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Знайти спеціалістів
            </Link>
            {isAuthenticated ? (
              <>
                <span className="text-slate-200">|</span>
                <Link
                  href="/dashboard"
                  className="py-1.5 md:py-2 px-2.5 md:px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs md:text-sm font-semibold rounded-xl transition-all whitespace-nowrap"
                >
                  Особистий кабінет
                </Link>
              </>
            ) : (
              <>
                <span className="text-slate-200">|</span>
                <Link
                  href="/login"
                  className="text-xs md:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Увійти
                </Link>
                <Link
                  href="/register"
                  className="py-1.5 md:py-2 px-2.5 md:px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow whitespace-nowrap"
                >
                  Почати
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" /> Преміум-сервіси з перевіркою
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Зв'яжіться з відібраними <span className="text-blue-600">перевіреними експертами</span>
            </h1>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
              Замовляйте сесії для терапії, коучингу, велнесу та консалтингу за кілька хвилин. Безпечно оплачуйте за допомогою Stripe, спілкуйтеся в реальному часі та відвідуйте зустрічі.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-4">
              <Link
                href="/specialists"
                className="py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer text-base"
              >
                Знайти спеціаліста
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="py-3.5 px-6 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center cursor-pointer text-base"
              >
                Приєднатися як спеціаліст
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 pt-6 justify-center lg:justify-start text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Повністю зашифровані платежі</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% повернення коштів за 24 год</span>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex justify-center">
            {/* Visual Companion / Soft UI mock component */}
            <div className="w-full max-w-md bg-slate-50 border border-slate-200 shadow-md rounded-2xl p-6 relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-200 border border-white shadow overflow-hidden flex items-center justify-center font-extrabold text-slate-400">
                  {specialistToDisplay.avatarUrl ? (
                    <img src={specialistToDisplay.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Star className="w-8 h-8 fill-amber-400 text-amber-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {specialistToDisplay.user?.name || specialistToDisplay.user?.email}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {categoryTranslation[specialistToDisplay.category] || specialistToDisplay.category || 'Терапія'}
                  </p>
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-semibold mt-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {specialistToDisplay.rating.toFixed(1)} ({specialistToDisplay.reviewsCount} {getReviewsWord(specialistToDisplay.reviewsCount)})
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm space-y-2">
                  {specialistToDisplay.bio ? (
                    <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed font-medium">
                      {specialistToDisplay.bio}
                    </p>
                  ) : (
                    <>
                      <div className="h-3 w-1/3 bg-slate-100 rounded" />
                      <div className="h-3.5 w-full bg-slate-200 rounded" />
                      <div className="h-3.5 w-5/6 bg-slate-200 rounded" />
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm text-sm">
                  <span className="text-slate-500 font-medium">Погодинна ставка</span>
                  <span className="font-extrabold text-slate-900">${specialistToDisplay.price.toFixed(2)}/год</span>
                </div>
                <Link
                  href={specialistToDisplay.id ? `/specialists/${specialistToDisplay.id}` : '/specialists'}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center font-bold rounded-xl block transition-all shadow"
                >
                  Забронювати зустріч
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 border-t border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-10">
            Оберіть потрібний напрямок роботи
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                href={`/specialists?category=${cat.name}`}
                className={`p-6 border rounded-2xl flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer h-32 ${cat.color}`}
              >
                <span className="font-extrabold text-lg">{cat.label}</span>
                <span className="text-xs font-semibold opacity-75">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Можливості нашої платформи
            </h2>
            <p className="text-slate-500 text-base leading-relaxed font-semibold">
              AuraBooking об'єднує все необхідне для пошуку, координації та підтвердження зустрічей в єдиній сучасній екосистемі.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 shadow-sm hover:shadow rounded-2xl p-6 space-y-4 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{feat.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white font-extrabold text-xs">
              A
            </div>
            <span className="font-bold text-slate-900 tracking-tight">AuraBooking</span>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            © {new Date().getFullYear()} Платформа AuraBooking. Усі права захищено.
          </p>
        </div>
      </footer>
    </div>
  );
}

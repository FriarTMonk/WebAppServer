import Link from 'next/link';

interface CallToActionProps {
  title: string;
  description: string;
  buttonText?: string;
  buttonLink?: string;
  variant?: 'primary' | 'category';
}

export default function CallToAction({
  title,
  description,
  buttonText = 'Get Started',
  buttonLink = '/register',
  variant = 'primary'
}: CallToActionProps) {
  const gradientClass = variant === 'primary'
    ? 'from-teal-600 to-teal-800'
    : 'from-teal-600 to-teal-800'; // Will add category detection later

  return (
    <div className={`my-12 bg-gradient-to-r ${gradientClass} rounded-xl shadow-xl p-8 md:p-12 text-center text-white`}>
      <h3 className="text-2xl md:text-3xl font-bold mb-4">{title}</h3>
      <p className="text-base md:text-lg text-teal-50 mb-6 max-w-2xl mx-auto">
        {description}
      </p>
      <Link
        href={buttonLink}
        className="inline-block bg-white text-teal-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-white focus:ring-offset-4 focus:ring-offset-teal-700 transition-all shadow-lg"
      >
        {buttonText}
      </Link>
    </div>
  );
}

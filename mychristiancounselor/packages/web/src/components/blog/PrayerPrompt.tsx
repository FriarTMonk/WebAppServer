interface PrayerPromptProps {
  title?: string;
  children: React.ReactNode;
}

export default function PrayerPrompt({
  title = 'Prayer Prompt:',
  children
}: PrayerPromptProps) {
  return (
    <div className="my-8 md:my-12 p-6 md:p-8 bg-purple-50 border-2 border-purple-300 rounded-lg">
      <div className="flex items-center justify-center gap-3 mb-4">
        <svg
          className="w-5 h-5 text-purple-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        <div className="text-sm font-bold uppercase tracking-wide text-purple-800">
          {title}
        </div>
      </div>
      <div className="font-serif italic text-base md:text-lg text-purple-900 text-center leading-relaxed">
        {children}
      </div>
    </div>
  );
}

interface WarningProps {
  severity?: 'crisis' | 'caution';
  children: React.ReactNode;
}

export default function Warning({
  severity = 'crisis',
  children
}: WarningProps) {
  const isCrisis = severity === 'crisis';

  const colorClasses = isCrisis
    ? 'bg-red-50 border-red-400 text-red-900'
    : 'bg-orange-50 border-orange-400 text-orange-900';

  const iconColor = isCrisis ? 'text-red-600' : 'text-orange-600';
  const label = isCrisis ? 'Crisis Support:' : 'Important:';

  return (
    <div
      className={`my-8 p-6 border-l-4 rounded-lg ${colorClasses}`}
      role="alert"
      aria-label={`${severity} warning`}
    >
      <div className="flex gap-3">
        <svg
          className={`flex-shrink-0 w-6 h-6 ${iconColor}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <div className="font-bold mb-2">{label}</div>
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

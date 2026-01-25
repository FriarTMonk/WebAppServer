interface ScriptureProps {
  verse: string;
  version?: string;
  children: React.ReactNode;
}

export default function Scripture({
  verse,
  version = 'NIV',
  children
}: ScriptureProps) {
  return (
    <div className="my-8 md:my-12 p-6 md:p-8 bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-bold uppercase tracking-wide text-amber-800">
          {verse}
        </div>
        <div className="text-xs bg-amber-200 text-amber-900 px-2 py-1 rounded">
          {version}
        </div>
      </div>
      <blockquote className="font-serif text-lg md:text-xl italic text-gray-800 leading-relaxed">
        {children}
      </blockquote>
    </div>
  );
}

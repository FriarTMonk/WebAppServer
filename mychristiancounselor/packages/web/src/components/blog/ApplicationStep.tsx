interface ApplicationStepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export default function ApplicationStep({
  number,
  title,
  children
}: ApplicationStepProps) {
  return (
    <div className="my-6 flex gap-4 md:gap-6 group hover:scale-[1.01] transition-transform duration-200">
      <div className="flex-shrink-0">
        <div className="w-11 h-11 md:w-12 md:h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold shadow-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 pt-1">
        <h4 className="font-bold text-gray-900 text-lg mb-2">{title}</h4>
        <div className="text-gray-700 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

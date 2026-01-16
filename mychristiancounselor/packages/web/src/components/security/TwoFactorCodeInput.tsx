'use client';

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface TwoFactorCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

export function TwoFactorCodeInput({
  length = 6,
  onComplete,
  disabled = false,
  error,
  label = 'Verification Code',
}: TwoFactorCodeInputProps) {
  const [code, setCode] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits are entered
    if (newCode.every((digit) => digit !== '')) {
      onComplete(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newCode = [...code];

      if (code[index]) {
        // Clear current input
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        // Move to previous input and clear it
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();

    // Only process if it's all digits
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    // Fill inputs with pasted digits
    const digits = pastedData.slice(0, length).split('');
    const newCode = [...code];

    digits.forEach((digit, index) => {
      if (index < length) {
        newCode[index] = digit;
      }
    });

    setCode(newCode);

    // Focus the last filled input or the next empty one
    const nextEmptyIndex = newCode.findIndex((digit) => digit === '');
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();

    // Call onComplete if all digits are filled
    if (newCode.every((digit) => digit !== '')) {
      onComplete(newCode.join(''));
    }
  };

  const handleFocus = (index: number) => {
    // Select the input content on focus
    inputRefs.current[index]?.select();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex gap-2 justify-center">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-2xl font-semibold
              border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-colors
              ${error ? 'border-red-500' : 'border-gray-300'}
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            `}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center mt-2">{error}</p>
      )}

      <p className="text-xs text-gray-500 text-center mt-2">
        Enter the {length}-digit code from your authenticator app or email
      </p>
    </div>
  );
}

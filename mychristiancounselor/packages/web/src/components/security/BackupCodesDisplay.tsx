'use client';

import { useState } from 'react';

interface BackupCodesDisplayProps {
  backupCodes: string[];
  onClose?: () => void;
  showDownload?: boolean;
}

export function BackupCodesDisplay({
  backupCodes,
  onClose,
  showDownload = true,
}: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = backupCodes.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = `MyChristianCounselor Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Note: If you lose access to your authenticator app, you can use these codes to sign in.
After using a code, it will be permanently invalidated.
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mychristiancounselor-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=600,height=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>MyChristianCounselor Backup Codes</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 10px; margin: 10px 0; border-radius: 4px; }
            .codes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
            .code { font-family: monospace; font-size: 14px; padding: 8px; background: #F3F4F6; border-radius: 4px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>MyChristianCounselor Backup Codes</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <div class="warning">
            <strong>⚠️ IMPORTANT:</strong> Store these codes in a safe place. Each code can only be used once.
          </div>
          <div class="codes">
            ${backupCodes.map((code, i) => `<div class="code">${i + 1}. ${code}</div>`).join('')}
          </div>
          <div class="footer">
            <p>Note: If you lose access to your authenticator app, you can use these codes to sign in.</p>
            <p>After using a code, it will be permanently invalidated.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-900">
              Save these backup codes
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Store these codes in a safe place. Each code can only be used once. If you lose access to your authenticator app, these codes will allow you to sign in.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-2 gap-3">
          {backupCodes.map((code, index) => (
            <div
              key={index}
              className="bg-white border border-gray-300 rounded px-4 py-3 font-mono text-sm text-center"
            >
              {code}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleCopy}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {copied ? 'Copied!' : 'Copy All'}
        </button>

        {showDownload && (
          <>
            <button
              onClick={handleDownload}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print
            </button>
          </>
        )}
      </div>

      {onClose && (
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            I've Saved These Codes
          </button>
        </div>
      )}
    </div>
  );
}

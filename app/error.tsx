"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-gray-800">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-50 mb-3">Something went wrong!</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          {error.message || "An unexpected error occurred while loading the application."}
        </p>
        
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-sm"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}

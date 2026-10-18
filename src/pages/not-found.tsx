import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-md mx-4 border border-white/10 rounded-lg bg-white/5 p-8">
        <div className="flex mb-4 gap-3 items-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <h1 className="text-xl font-mono font-bold text-white/80 tracking-wider">404 — PAGE INTROUVABLE</h1>
        </div>
        <p className="mt-2 text-sm text-white/40 font-mono">
          Cette page n'existe pas dans l'infrastructure NÉRON.
        </p>
      </div>
    </div>
  );
}

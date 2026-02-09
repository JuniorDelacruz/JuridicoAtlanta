import { Link } from "react-router-dom";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-24 w-24 text-amber-500 mb-6 animate-pulse" />
      
      <h1 className="text-8xl font-extrabold text-gray-800 mb-4">404</h1>
      <h2 className="text-3xl font-bold text-gray-700 mb-6">
        Processo não localizado
      </h2>
      
      <p className="text-lg text-gray-600 max-w-md mb-10">
        O documento, página ou permissão que você procura parece ter sido arquivado em outra vara... ou simplesmente não existe.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/"
          className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-lg flex items-center gap-2"
        >
          <Home size={20} />
          Ir para o Dashboard
        </Link>

        <Link
          to="/ajuda"
          className="px-8 py-4 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-medium shadow"
        >
          Preciso de ajuda
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-500">
        © {new Date().getFullYear()} Jurídico Atlanta RP • Página perdida com carinho
      </p>
    </div>
  );
}
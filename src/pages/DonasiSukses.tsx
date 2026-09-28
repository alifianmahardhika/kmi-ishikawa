import { Navigate, useSearchParams } from "react-router-dom";
import { KodeKonfirmasi } from "../components/donasi/KodeKonfirmasi";
import { useSEO } from "../hooks/useSEO";

export default function DonasiSukses() {
  useSEO("Konfirmasi Donasi");
  const [params] = useSearchParams();
  const code = params.get("code");

  if (!code) return <Navigate to="/donasi" replace />;

  return <KodeKonfirmasi code={code} />;
}

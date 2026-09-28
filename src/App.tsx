import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminGuard } from "./components/admin/AdminGuard";
import Home from "./pages/Home";
import Donasi from "./pages/Donasi";
import DonasiSukses from "./pages/DonasiSukses";
import Laporan from "./pages/Laporan";
import Kegiatan from "./pages/Kegiatan";
import KegiatanDetail from "./pages/KegiatanDetail";
import Kontak from "./pages/Kontak";
import Login from "./pages/admin/Login";
import Dashboard from "./pages/admin/Dashboard";
import DonasiAdmin from "./pages/admin/DonasiAdmin";
import KegiatanAdmin from "./pages/admin/KegiatanAdmin";
import LaporanAdmin from "./pages/admin/LaporanAdmin";
import Pengaturan from "./pages/admin/Pengaturan";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "donasi", element: <Donasi /> },
      { path: "donasi/sukses", element: <DonasiSukses /> },
      { path: "laporan", element: <Laporan /> },
      { path: "kegiatan", element: <Kegiatan /> },
      { path: "kegiatan/:slug", element: <KegiatanDetail /> },
      { path: "kontak", element: <Kontak /> },
    ],
  },
  // Admin routes deliberately sit outside <Layout> — no public Navbar/Footer, so there's
  // no site-nav link an admin could misclick and accidentally leave the admin area
  // through. Each protected admin page renders its own <AdminNav /> instead.
  { path: "admin/login", element: <Login /> },
  {
    path: "admin",
    element: <AdminGuard />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "donasi", element: <DonasiAdmin /> },
      { path: "kegiatan", element: <KegiatanAdmin /> },
      { path: "laporan", element: <LaporanAdmin /> },
      { path: "pengaturan", element: <Pengaturan /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
